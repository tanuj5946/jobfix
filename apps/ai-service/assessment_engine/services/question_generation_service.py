import json
import logging
import time
from collections import defaultdict
from typing import Any

from assessment_engine.chains.batch_generation_chain import (
    build_batch_generation_chain,
)
from assessment_engine.chains.conceptual_chain import build_conceptual_chain
from assessment_engine.chains.mcq_chain import build_mcq_chain
from assessment_engine.schemas.question_generation_schema import (
    ConceptualQuestion,
    GeneratedQuestion,
    MCQQuestion,
)
from shared.cache import llm_cache
from shared.observability import metrics_registry


logger = logging.getLogger("ai-service")


class QuestionGenerationService:
    def __init__(
        self,
        mcq_chain=None,
        conceptual_chain=None,
        batch_chain=None,
    ):
        self.mcq_chain = mcq_chain or build_mcq_chain()
        self.conceptual_chain = conceptual_chain or build_conceptual_chain()
        self.batch_chain = batch_chain or build_batch_generation_chain()

    def generate_for_missing_requirements(
        self,
        *,
        missing_requirements: list[dict[str, Any]],
        existing_questions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        requirements = self._normalise_missing_requirements(
            missing_requirements
        )
        if not requirements:
            return []

        existing_texts = self._question_texts(existing_questions)
        generation_method = "batch"
        try:
            generated_questions = self.generate_questions_batch(
                requirements=requirements,
                existing_questions=existing_texts,
            )
        except Exception as exc:
            logger.warning(
                "Batch question generation failed; falling back to grouped generation: %s",
                exc,
            )
            generated_questions = self._generate_requirements_individually(
                requirements=requirements,
                existing_questions=existing_texts,
            )
            generation_method = "grouped fallback"

        logger.info(
            "Generated %s questions using %s generation.",
            len(generated_questions),
            generation_method,
        )
        return generated_questions

    def _generate_requirements_individually(
        self,
        *,
        requirements: list[dict[str, Any]],
        existing_questions: list[str],
    ) -> list[dict[str, Any]]:
        generated_questions: list[dict[str, Any]] = []
        existing_texts = list(existing_questions)

        for requirement in requirements:
            count = (
                int(requirement["required"])
                - int(requirement.get("retrieved", 0))
            )
            generated = self.generate_questions(
                role=requirement["role"],
                skill=requirement["skill"],
                difficulty=requirement["difficulty"],
                question_type=requirement["question_type"],
                count=count,
                existing_questions=existing_texts,
            )
            generated_questions.extend(generated)
            existing_texts.extend(
                question["question_text"]
                for question in generated
                if question.get("question_text")
            )

        return generated_questions

    def generate_questions(
        self,
        *,
        role: str,
        skill: str,
        difficulty: str,
        question_type: str,
        count: int,
        existing_questions: list[str],
    ) -> list[dict[str, Any]]:
        if count <= 0:
            return []

        payload = {
            "role": role,
            "skill": skill,
            "difficulty": difficulty,
            "count": count,
            "existing_questions": json.dumps(
                existing_questions,
                ensure_ascii=False,
            ),
        }
        start_time = time.perf_counter()

        if question_type == "mcq":
            cache_key = {"chain": "mcq_generation", **payload}
            generated = llm_cache.get_or_set(
                cache_key,
                lambda: [
                    self._normalize_mcq(question)
                    for question in self.mcq_chain.invoke(payload).questions
                ],
            )
        elif question_type == "conceptual":
            cache_key = {"chain": "conceptual_generation", **payload}
            generated = llm_cache.get_or_set(
                cache_key,
                lambda: [
                    self._normalize_conceptual(question)
                    for question in self.conceptual_chain.invoke(payload).questions
                ],
            )
        else:
            raise ValueError(
                "Question type must be either 'mcq' or 'conceptual'"
            )

        metrics_registry.observe(
            "generation_latency_ms",
            (time.perf_counter() - start_time) * 1000,
        )
        return generated

    def generate_questions_batch(
        self,
        *,
        requirements: list[dict[str, Any]],
        existing_questions: list[str],
    ) -> list[dict[str, Any]]:
        expected_count = sum(
            int(requirement["required"]) - int(requirement.get("retrieved", 0))
            for requirement in requirements
        )
        if expected_count <= 0:
            return []

        payload = {
            "requirements": json.dumps(
                requirements,
                ensure_ascii=False,
                indent=2,
            ),
            "existing_questions": json.dumps(
                existing_questions,
                ensure_ascii=False,
            ),
        }
        start_time = time.perf_counter()
        cache_key = {
            "chain": "batch_generation",
            **payload,
        }

        generated = llm_cache.get_or_set(
            cache_key,
            lambda: [
                self._normalize_generated_question(question.model_dump())
                for question in self.batch_chain.invoke(payload).questions
            ],
        )

        metrics_registry.observe(
            "generation_latency_ms",
            (time.perf_counter() - start_time) * 1000,
        )
        return self._select_requested_batch_questions(
            requirements=requirements,
            generated_questions=generated,
            expected_count=expected_count,
        )

    def regenerate_failed_questions(
        self,
        *,
        failed_questions: list[dict[str, Any]],
        existing_questions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        grouped: dict[tuple[str, str, str, str], list[dict[str, Any]]] = (
            defaultdict(list)
        )

        for question in failed_questions:
            key = (
                question["role"],
                question["skill"],
                question["difficulty"],
                question["question_type"],
            )
            grouped[key].append(question)

        regenerated: list[dict[str, Any]] = []
        existing_texts = self._question_texts(existing_questions)
        existing_texts.extend(
            question.get("question_text", "")
            for question in failed_questions
            if question.get("question_text")
        )

        for (role, skill, difficulty, question_type), questions in grouped.items():
            replacements = self.generate_questions(
                role=role,
                skill=skill,
                difficulty=difficulty,
                question_type=question_type,
                count=len(questions),
                existing_questions=existing_texts,
            )
            regenerated.extend(replacements)
            existing_texts.extend(
                question["question_text"]
                for question in replacements
                if question.get("question_text")
            )

        logger.info(
            "Regenerated %s replacement questions",
            len(regenerated),
        )
        return regenerated

    def _normalise_missing_requirements(
        self,
        missing_requirements: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        required_fields = {
            "role",
            "skill",
            "difficulty",
            "question_type",
            "required",
        }
        requirements = []

        for requirement in missing_requirements:
            if not required_fields.issubset(requirement):
                logger.warning(
                    "Skipping malformed requirement: %s",
                    requirement,
                )
                continue

            required = int(requirement["required"])
            retrieved = int(requirement.get("retrieved", 0))
            if required - retrieved <= 0:
                continue

            requirements.append(
                {
                    "role": requirement["role"],
                    "skill": requirement["skill"],
                    "difficulty": requirement["difficulty"],
                    "question_type": requirement["question_type"],
                    "required": required,
                    "retrieved": retrieved,
                }
            )

        return requirements

    def _select_requested_batch_questions(
        self,
        *,
        requirements: list[dict[str, Any]],
        generated_questions: list[dict[str, Any]],
        expected_count: int,
    ) -> list[dict[str, Any]]:
        expected_by_key = {
            self._requirement_key(requirement): (
                int(requirement["required"])
                - int(requirement.get("retrieved", 0))
            )
            for requirement in requirements
        }
        selected_by_key: dict[tuple[str, str, str, str], int] = defaultdict(int)
        selected_questions: list[dict[str, Any]] = []
        ignored_questions = 0

        for question in generated_questions:
            key = self._requirement_key(question)
            if selected_by_key[key] < expected_by_key.get(key, 0):
                selected_by_key[key] += 1
                selected_questions.append(question)
            else:
                ignored_questions += 1

        missing_by_key = {
            key: expected_count_for_key - selected_by_key[key]
            for key, expected_count_for_key in expected_by_key.items()
            if selected_by_key[key] < expected_count_for_key
        }
        if missing_by_key or len(selected_questions) != expected_count:
            raise ValueError(
                "Batch generation did not match the requested requirement counts. "
                f"Expected {expected_by_key}, got {dict(selected_by_key)}."
            )

        if ignored_questions:
            logger.info(
                "Ignored %s extra batch-generated questions.",
                ignored_questions,
            )

        return selected_questions

    def _normalize_generated_question(
        self,
        question: dict[str, Any],
    ) -> dict[str, Any]:
        question_type = question.get("question_type")
        normalized = GeneratedQuestion(**question).model_dump()

        if question_type == "mcq":
            normalized["rubric"] = normalized.get("rubric") or {}
        elif question_type == "conceptual":
            normalized["options"] = None
            normalized["correct_answer"] = normalized.get("correct_answer")

        return normalized

    def _normalize_mcq(
        self,
        question: MCQQuestion,
    ) -> dict[str, Any]:
        generated = GeneratedQuestion(
            role=question.role,
            skill=question.skill,
            difficulty=question.difficulty,
            question_type="mcq",
            question_text=question.question,
            options=question.options,
            correct_answer=question.correct_answer,
            rubric={
                "explanation": question.explanation,
            },
            tags=question.tags,
        )
        return generated.model_dump()

    def _normalize_conceptual(
        self,
        question: ConceptualQuestion,
    ) -> dict[str, Any]:
        generated = GeneratedQuestion(
            role=question.role,
            skill=question.skill,
            difficulty=question.difficulty,
            question_type="conceptual",
            question_text=question.question,
            correct_answer=", ".join(question.expected_topics),
            rubric={
                "rubric": question.rubric,
                "expected_topics": question.expected_topics,
            },
            tags=question.tags,
        )
        return generated.model_dump()

    def _question_texts(
        self,
        questions: list[dict[str, Any]],
    ) -> list[str]:
        return [
            question.get("question_text") or question.get("question")
            for question in questions
            if question.get("question_text") or question.get("question")
        ]

    def _requirement_key(
        self,
        item: dict[str, Any],
    ) -> tuple[str, str, str, str]:
        return (
            item.get("role", "").strip().lower(),
            item.get("skill", "").strip().lower(),
            item.get("difficulty", "").strip().lower(),
            item.get("question_type", "").strip().lower(),
        )
