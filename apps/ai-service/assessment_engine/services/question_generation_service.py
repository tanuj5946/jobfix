import json
import logging
import time
from collections import defaultdict
from typing import Any

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
    ):
        self.mcq_chain = mcq_chain or build_mcq_chain()
        self.conceptual_chain = conceptual_chain or build_conceptual_chain()

    def generate_for_missing_requirements(
        self,
        *,
        missing_requirements: list[dict[str, Any]],
        existing_questions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        generated_questions: list[dict[str, Any]] = []
        existing_texts = self._question_texts(existing_questions)

        for requirement in missing_requirements:
            required_fields = [
                "role",
                "skill",
                "difficulty",
                "question_type",
                "required",
            ]
            if any(field not in requirement for field in required_fields):
                logger.warning(
                    "Skipping malformed missing requirement: %s",
                    requirement,
                )
                continue

            count = max(
                int(requirement.get("required", 0))
                - int(requirement.get("retrieved", 0)),
                0,
            )
            if count <= 0:
                continue

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
            )

        logger.info(
            "Generated %s questions for %s missing requirements",
            len(generated_questions),
            len(missing_requirements),
        )
        return generated_questions

    def regenerate_failed_questions(
        self,
        *,
        failed_questions: list[dict[str, Any]],
        existing_questions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        grouped: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)

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
            )

        logger.info(
            "Regenerated %s replacement questions",
            len(regenerated),
        )
        return regenerated

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
        inputs = {
            "role": role,
            "skill": skill,
            "difficulty": difficulty,
            "count": count,
            "existing_questions": json.dumps(
                existing_questions,
                ensure_ascii=False,
            ),
        }

        cache_payload = {
            "chain": f"{question_type}_generation",
            **inputs,
        }
        start_time = time.perf_counter()

        if question_type == "mcq":
            generated = llm_cache.get_or_set(
                cache_payload,
                lambda: [
                    self._normalize_mcq(question)
                    for question in self.mcq_chain.invoke(inputs).questions[:count]
                ],
            )
            metrics_registry.observe(
                "generation_latency_ms",
                (time.perf_counter() - start_time) * 1000,
            )
            return generated

        if question_type == "conceptual":
            generated = llm_cache.get_or_set(
                cache_payload,
                lambda: [
                    self._normalize_conceptual(question)
                    for question in self.conceptual_chain.invoke(inputs).questions[:count]
                ],
            )
            metrics_registry.observe(
                "generation_latency_ms",
                (time.perf_counter() - start_time) * 1000,
            )
            return generated

        raise ValueError(
            f"Unsupported question type for generation: {question_type}"
        )

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
                "explanation": question.explanation
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
            question.get("question_text", "")
            for question in questions
            if question.get("question_text")
        ]
