import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from assessment_engine.chains.conceptual_evaluation_chain import (
    build_conceptual_evaluation_chain,
)
from assessment_engine.chains.learning_recommendation_chain import (
    build_learning_recommendation_chain,
)
from assessment_engine.chains.recruiter_report_chain import (
    build_recruiter_report_chain,
)
from assessment_engine.graph.assessment_graph import build_assessment_graph
from assessment_engine.prompts.registry import all_prompt_metadata
from assessment_engine.repositories.assessment_repository import (
    AssessmentRepository,
)
from shared.cache import llm_cache
from shared.errors import ValidationError
from shared.observability import metrics_registry


logger = logging.getLogger("ai-service")


class AssessmentService:
    def __init__(
        self,
        repository: AssessmentRepository | None = None,
        assessment_graph=None,
        conceptual_evaluation_chain=None,
        recruiter_report_chain=None,
        learning_recommendation_chain=None,
    ):
        self.repository = repository or AssessmentRepository()
        self.assessment_graph = assessment_graph or build_assessment_graph()
        self.conceptual_evaluation_chain = (
            conceptual_evaluation_chain
            or build_conceptual_evaluation_chain()
        )
        self.recruiter_report_chain = (
            recruiter_report_chain
            or build_recruiter_report_chain()
        )
        self.learning_recommendation_chain = (
            learning_recommendation_chain
            or build_learning_recommendation_chain()
        )

    def create_assessment(
        self,
        *,
        candidate_id: int,
        target_role: str,
        selected_skills: list[str],
    ) -> dict[str, Any]:
        graph_result = self.assessment_graph.invoke(
            {
                "target_role": target_role,
                "selected_skills": selected_skills,
                "retry_count": 0,
                "generation_retry_count": 0,
                "validated_generated_questions": [],
            }
        )
        final_assessment = graph_result["final_assessment"]
        final_assessment["candidate_id"] = candidate_id
        final_assessment["role"] = target_role
        final_assessment["total_questions"] = len(
            final_assessment.get("questions", [])
        )

        saved = self.save_assessment(
            candidate_id=candidate_id,
            role=target_role,
            final_assessment=final_assessment,
            metadata={
                "skill_weights": graph_result.get("skill_weights", {}),
                "missing_core_skills": graph_result.get(
                    "missing_core_skills",
                    [],
                ),
                "blueprint": graph_result.get("blueprint", []),
            },
        )
        saved["generation_context"] = {
            "retrieved_questions": graph_result.get("retrieved_questions", []),
            "generated_questions": graph_result.get(
                "validated_generated_questions",
                [],
            ),
            "missing_requirements": graph_result.get(
                "missing_requirements",
                [],
            ),
            "skill_weights": graph_result.get("skill_weights", {}),
            "missing_core_skills": graph_result.get(
                "missing_core_skills",
                [],
            ),
        }
        return saved

    def save_assessment(
        self,
        *,
        candidate_id: int,
        role: str,
        final_assessment: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        normalized_questions = [
            self._normalize_question_for_storage(question, role)
            for question in final_assessment.get("questions", [])
        ]
        self._validate_assessment_questions(normalized_questions)

        saved = self.repository.create_assessment(
            candidate_id=candidate_id,
            role=role,
            title=final_assessment["title"],
            questions=normalized_questions,
            metadata=metadata,
        )
        return self._assessment_response(saved)

    def load_assessment(
        self,
        assessment_id: int,
    ) -> dict[str, Any] | None:
        assessment = self.repository.load_assessment(assessment_id)
        if not assessment:
            return None
        return self._assessment_response(assessment)

    def submit_assessment(
        self,
        *,
        assessment_id: int,
        candidate_id: int,
        answers: list[dict[str, Any]],
    ) -> dict[str, Any]:
        assessment = self.repository.load_assessment(assessment_id)
        if not assessment:
            raise ValidationError("Assessment not found")
        self._validate_submission_answers(
            questions=assessment.get("questions", []),
            answers=answers,
        )

        attempt = self.repository.create_attempt(
            assessment_id=assessment_id,
            candidate_id=candidate_id,
            answers=answers,
        )
        result = self.evaluate_assessment(
            assessment_id=assessment_id,
            attempt_id=int(attempt["id"]),
        )
        return {
            "submission_id": int(attempt["id"]),
            "assessment_id": assessment_id,
            "result": result,
        }

    def evaluate_assessment(
        self,
        *,
        assessment_id: int,
        attempt_id: int,
        skill_weights: dict[str, float] | None = None,
        missing_core_skills: list[str] | None = None,
    ) -> dict[str, Any]:
        assessment = self.repository.load_assessment(assessment_id)
        attempt = self.repository.load_attempt(attempt_id)

        if not assessment or not attempt:
            raise ValueError("Assessment or submission attempt not found")

        metadata = assessment.get("assessment_metadata_json") or {}
        skill_weights = skill_weights or metadata.get("skill_weights", {})
        missing_core_skills = (
            missing_core_skills
            if missing_core_skills is not None
            else metadata.get("missing_core_skills", [])
        )

        evaluation_start = time.perf_counter()
        with ThreadPoolExecutor(max_workers=6) as executor:
            evaluated_answers = list(
                executor.map(
                    lambda answer: self._evaluate_answer(
                        assessment=assessment,
                        answer=answer,
                    ),
                    attempt["answers"],
                )
            )

        for evaluated in evaluated_answers:
            self.repository.update_answer_evaluation(
                answer_id=evaluated["answer_id"],
                score=evaluated["score"],
                evaluation_json=evaluated,
                feedback=evaluated.get("feedback"),
                is_correct=evaluated.get("is_correct"),
                marks_awarded=evaluated["marks_awarded"],
            )

        metrics_registry.observe(
            "evaluation_latency_ms",
            (time.perf_counter() - evaluation_start) * 1000,
        )

        skill_breakdown = self._aggregate_skill_scores(
            evaluated_answers,
            skill_weights or {},
        )
        overall_score = self._overall_score(
            skill_breakdown,
            skill_weights or {},
        )
        assessment_grade = self._grade(overall_score)
        weak_skills = [
            {"skill": skill, "score": score}
            for skill, score in skill_breakdown.items()
            if score < 70
        ]
        recruiter_report = self._build_recruiter_report(
            assessment=assessment,
            evaluated_answers=evaluated_answers,
            skill_breakdown=skill_breakdown,
            overall_score=overall_score,
            missing_core_skills=missing_core_skills or [],
        )
        learning_recommendations = self._build_learning_recommendations(
            weak_skills
        )
        self.repository.save_learning_recommendations(
            candidate_id=assessment["candidate_id"],
            recommendations=learning_recommendations,
        )

        result = {
            "overall_score": overall_score,
            "overall_level": assessment_grade.lower(),
            "assessment_grade": assessment_grade,
            "pass_fail": "pass" if overall_score >= 60 else "fail",
            "confidence_score": self._confidence_score(evaluated_answers),
            "skill_breakdown": skill_breakdown,
            "evaluation_summary": recruiter_report["candidate_summary"],
            "recruiter_report": recruiter_report,
            "learning_recommendations": learning_recommendations,
            "prompt_versions": all_prompt_metadata(),
            "answers": evaluated_answers,
        }
        self.repository.save_result(
            assessment_id=assessment_id,
            attempt_id=attempt_id,
            result=result,
        )
        metrics_registry.observe("average_ai_score", overall_score)
        metrics_registry.observe(
            "average_recruiter_score",
            recruiter_report.get("readiness_score", overall_score),
        )
        logger.info(
            "Evaluated assessment %s attempt %s with score %.2f",
            assessment_id,
            attempt_id,
            overall_score,
        )
        return result

    def load_result(
        self,
        assessment_id: int,
    ) -> dict[str, Any] | None:
        return self.repository.load_result(assessment_id)

    def load_report(
        self,
        assessment_id: int,
    ) -> dict[str, Any] | None:
        result = self.repository.load_result(assessment_id)
        if not result:
            return None
        return result.get("recruiter_report_json")

    def candidate_history(
        self,
        candidate_id: int,
    ) -> list[dict[str, Any]]:
        return self.repository.load_candidate_history(candidate_id)

    def _evaluate_answer(
        self,
        *,
        assessment: dict[str, Any],
        answer: dict[str, Any],
    ) -> dict[str, Any]:
        question_type = answer["question_type"]
        marks = float(answer["marks"])

        if question_type == "mcq":
            is_correct = (
                self._clean(answer.get("candidate_answer"))
                == self._clean(answer.get("expected_answer"))
            )
            score = 100.0 if is_correct else 0.0
            return {
                "answer_id": answer["id"],
                "question_id": answer["question_id"],
                "question_type": question_type,
                "skill": answer["skill"],
                "score": score,
                "is_correct": is_correct,
                "marks_awarded": marks if is_correct else 0.0,
                "feedback": "Correct answer." if is_correct else "Incorrect answer.",
            }

        payload = {
            "role": assessment.get("target_role") or "",
            "skill": answer["skill"],
            "difficulty": answer.get("difficulty") or "",
            "question": answer["question_text"],
            "rubric": answer.get("rubric") or "",
            "expected_answer": answer.get("expected_answer") or "",
            "candidate_answer": answer.get("candidate_answer") or "",
        }
        evaluation = llm_cache.get_or_set(
            {
                "chain": "conceptual_evaluation",
                **payload,
            },
            lambda: self.conceptual_evaluation_chain.invoke(payload),
        )
        score = float(evaluation.score)
        return {
            "answer_id": answer["id"],
            "question_id": answer["question_id"],
            "question_type": question_type,
            "skill": answer["skill"],
            "score": score,
            "is_correct": None,
            "marks_awarded": round((score / 100) * marks, 2),
            "feedback": evaluation.feedback,
            "strengths": evaluation.strengths,
            "improvements": evaluation.improvements,
        }

    def _aggregate_skill_scores(
        self,
        evaluated_answers: list[dict[str, Any]],
        skill_weights: dict[str, float],
    ) -> dict[str, float]:
        grouped: dict[str, list[float]] = {}
        for answer in evaluated_answers:
            grouped.setdefault(answer["skill"], []).append(
                float(answer["score"])
            )

        return {
            skill: round(sum(scores) / len(scores), 2)
            for skill, scores in grouped.items()
            if scores
        }

    def _overall_score(
        self,
        skill_breakdown: dict[str, float],
        skill_weights: dict[str, float],
    ) -> float:
        if not skill_breakdown:
            return 0.0

        if skill_weights:
            if any(weight < 0 for weight in skill_weights.values()):
                raise ValidationError("Skill weights cannot be negative")

            total_weight = sum(
                weight
                for skill, weight in skill_weights.items()
                if skill in skill_breakdown
            )
            if total_weight > 0:
                weighted = sum(
                    skill_breakdown[skill] * weight
                    for skill, weight in skill_weights.items()
                    if skill in skill_breakdown
                )
                return round(weighted / total_weight, 2)

        return round(
            sum(skill_breakdown.values()) / len(skill_breakdown),
            2,
        )

    def _build_recruiter_report(
        self,
        *,
        assessment: dict[str, Any],
        evaluated_answers: list[dict[str, Any]],
        skill_breakdown: dict[str, float],
        overall_score: float,
        missing_core_skills: list[str],
    ) -> dict[str, Any]:
        report = self.recruiter_report_chain.invoke(
            {
                "assessment_json": json.dumps(
                    self._assessment_response(assessment),
                    default=str,
                ),
                "evaluation_json": json.dumps(
                    {
                        "answers": evaluated_answers,
                        "skill_breakdown": skill_breakdown,
                        "overall_score": overall_score,
                    },
                    default=str,
                ),
                "missing_core_skills": json.dumps(missing_core_skills),
            }
        )
        return report.model_dump()

    def _build_learning_recommendations(
        self,
        weak_skills: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not weak_skills:
            return []

        recommendations = self.learning_recommendation_chain.invoke(
            {
                "weak_skills_json": json.dumps(
                    weak_skills,
                    default=str,
                )
            }
        )
        items = [
            item.model_dump()
            for item in recommendations.learning_recommendations
        ]
        self._validate_learning_recommendations(items)
        return items

    def _assessment_response(
        self,
        assessment: dict[str, Any],
    ) -> dict[str, Any]:
        questions = assessment.get("questions", [])
        return {
            "assessment_id": assessment["id"],
            "candidate_id": assessment["candidate_id"],
            "role": assessment.get("target_role"),
            "title": assessment.get("assessment_name"),
            "duration": max(30, len(questions) * 2),
            "total_questions": len(questions),
            "created_at": assessment.get("created_at"),
            "questions": questions,
        }

    def _normalize_question_for_storage(
        self,
        question: dict[str, Any],
        role: str,
    ) -> dict[str, Any]:
        return {
            "role": question.get("role") or role,
            "skill": question["skill"],
            "difficulty": question.get("difficulty"),
            "question_type": question["question_type"],
            "question_text": question.get("question_text") or question.get("question"),
            "options": question.get("options"),
            "correct_answer": question.get("correct_answer"),
            "rubric": question.get("rubric"),
            "id": question.get("id") or question.get("question_id"),
        }

    def _grade(
        self,
        score: float,
    ) -> str:
        if score >= 85:
            return "advanced"
        if score >= 70:
            return "intermediate"
        return "beginner"

    def _confidence_score(
        self,
        evaluated_answers: list[dict[str, Any]],
    ) -> float:
        if not evaluated_answers:
            return 0.0
        conceptual_count = sum(
            1
            for answer in evaluated_answers
            if answer["question_type"] == "conceptual"
        )
        return round(
            min(95, 75 + conceptual_count),
            2,
        )

    def _clean(
        self,
        value: Any,
    ) -> str:
        return " ".join(str(value or "").lower().split())

    def _validate_assessment_questions(
        self,
        questions: list[dict[str, Any]],
    ) -> None:
        if not questions:
            raise ValidationError("Assessment must contain questions")

        seen_questions: set[str] = set()
        for question in questions:
            text = self._clean(question.get("question_text"))
            if not text:
                raise ValidationError("Question text is required")

            if text in seen_questions:
                raise ValidationError("Duplicate questions are not allowed")

            seen_questions.add(text)
            question_type = question.get("question_type")

            if question_type == "mcq":
                options = question.get("options") or []
                if len(options) != 4:
                    raise ValidationError("MCQ questions require four options")
                if question.get("correct_answer") not in options:
                    raise ValidationError(
                        "MCQ correct answer must exist in options"
                    )
            elif question_type == "conceptual":
                if not question.get("rubric"):
                    raise ValidationError(
                        "Conceptual questions require a rubric"
                    )
            else:
                raise ValidationError(
                    "Assessment supports only mcq and conceptual questions"
                )

    def _validate_submission_answers(
        self,
        *,
        questions: list[dict[str, Any]],
        answers: list[dict[str, Any]],
    ) -> None:
        if not answers:
            raise ValidationError("Submission answers cannot be empty")

        question_ids = {
            int(question["question_id"])
            for question in questions
        }
        answer_ids = {
            int(answer["question_id"])
            for answer in answers
        }

        missing = question_ids - answer_ids
        invalid = answer_ids - question_ids

        if missing:
            raise ValidationError(
                "Submission is missing answers",
                details={"missing_question_ids": sorted(missing)},
            )

        if invalid:
            raise ValidationError(
                "Submission includes unknown question ids",
                details={"invalid_question_ids": sorted(invalid)},
            )

        for answer in answers:
            if not self._clean(answer.get("candidate_answer")):
                raise ValidationError("Candidate answers cannot be empty")

    def _validate_learning_recommendations(
        self,
        recommendations: list[dict[str, Any]],
    ) -> None:
        for recommendation in recommendations:
            if not recommendation.get("skill"):
                raise ValidationError(
                    "Learning recommendation skill is required"
                )
            if not recommendation.get("resource_title"):
                raise ValidationError(
                    "Learning recommendation title is required"
                )
