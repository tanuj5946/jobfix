import json
import logging
import os
from typing import Any

from assessment_engine.chains.validation_chain import build_validation_chain
from assessment_engine.schemas.question_validation_schema import (
    QuestionValidationFeedback,
    QuestionValidationResult,
)


logger = logging.getLogger("ai-service")


class QuestionValidationService:
    def __init__(self, validation_chain=None):
        self.validation_chain = validation_chain
        self.use_llm_validation = (
            os.getenv("ENABLE_LLM_QUESTION_VALIDATION", "false").lower()
            == "true"
        )

    def validate_questions(
        self,
        *,
        questions: list[dict[str, Any]],
        existing_questions: list[dict[str, Any] | str],
    ) -> dict[str, Any]:
        if not questions:
            result = QuestionValidationResult(
                validation_result=True,
                validation_feedback=[],
                valid_question_indices=[],
                failed_question_indices=[],
            )
            return {
                "validation_result": result.model_dump(),
                "validation_feedback": [],
                "valid_questions": [],
                "failed_questions": [],
            }

        llm_result = self._base_validation_result(questions)
        if self.use_llm_validation:
            chain = self.validation_chain or build_validation_chain()
            llm_result = chain.invoke(
                {
                    "questions_json": json.dumps(
                        questions,
                        ensure_ascii=False,
                        default=str,
                    ),
                    "existing_questions_json": json.dumps(
                        existing_questions,
                        ensure_ascii=False,
                        default=str,
                    ),
                }
            )

        final_result = self._apply_deterministic_checks(
            questions=questions,
            existing_questions=existing_questions,
            llm_result=llm_result,
        )

        valid_questions = [
            questions[index]
            for index in final_result.valid_question_indices
            if index < len(questions)
        ]
        failed_questions = [
            questions[index]
            for index in final_result.failed_question_indices
            if index < len(questions)
        ]

        logger.info(
            "Validated generated questions: %s valid, %s failed",
            len(valid_questions),
            len(failed_questions),
        )
        return {
            "validation_result": final_result.model_dump(),
            "validation_feedback": [
                feedback.model_dump()
                for feedback in final_result.validation_feedback
            ],
            "valid_questions": valid_questions,
            "failed_questions": failed_questions,
        }

    def _base_validation_result(
        self,
        questions: list[dict[str, Any]],
    ) -> QuestionValidationResult:
        return QuestionValidationResult(
            validation_result=True,
            validation_feedback=[
                QuestionValidationFeedback(
                    question_index=index,
                    is_valid=True,
                    feedback=[],
                )
                for index in range(len(questions))
            ],
            valid_question_indices=list(range(len(questions))),
            failed_question_indices=[],
        )

    def _apply_deterministic_checks(
        self,
        *,
        questions: list[dict[str, Any]],
        existing_questions: list[dict[str, Any] | str],
        llm_result: QuestionValidationResult,
    ) -> QuestionValidationResult:
        feedback_by_index = {
            item.question_index: item
            for item in llm_result.validation_feedback
        }
        existing_texts = {
            self._normalize_text(question)
            for question in existing_questions
            if self._normalize_text(question)
        }
        seen_texts: set[str] = set()
        final_feedback: list[QuestionValidationFeedback] = []
        valid_indices: list[int] = []
        failed_indices: list[int] = []

        for index, question in enumerate(questions):
            base_feedback = feedback_by_index.get(
                index,
                QuestionValidationFeedback(
                    question_index=index,
                    is_valid=True,
                    feedback=[],
                ),
            )
            messages = list(base_feedback.feedback)
            is_valid = base_feedback.is_valid
            text = self._normalize_text(question)

            if not text:
                is_valid = False
                messages.append("Question text is required.")

            if text in existing_texts or text in seen_texts:
                is_valid = False
                messages.append("Question duplicates an existing question.")

            seen_texts.add(text)
            question_type = question.get("question_type")

            if question_type == "mcq":
                options = question.get("options") or []
                correct_answer = question.get("correct_answer")

                if len(options) != 4:
                    is_valid = False
                    messages.append("MCQ must contain exactly four options.")

                if correct_answer not in options:
                    is_valid = False
                    messages.append("MCQ correct_answer must match one option.")

            elif question_type == "conceptual":
                rubric = question.get("rubric")
                if not rubric:
                    is_valid = False
                    messages.append("Conceptual question requires a rubric.")

            else:
                is_valid = False
                messages.append("Only mcq and conceptual question types are allowed.")

            for field in ["role", "skill", "difficulty"]:
                if not question.get(field):
                    is_valid = False
                    messages.append(f"{field} is required.")

            if is_valid:
                valid_indices.append(index)
            else:
                failed_indices.append(index)

            final_feedback.append(
                QuestionValidationFeedback(
                    question_index=index,
                    is_valid=is_valid,
                    feedback=messages,
                )
            )

        return QuestionValidationResult(
            validation_result=len(failed_indices) == 0,
            validation_feedback=final_feedback,
            valid_question_indices=valid_indices,
            failed_question_indices=failed_indices,
        )

    def _normalize_text(
        self,
        question: dict[str, Any] | str,
    ) -> str:
        if isinstance(question, str):
            text = question
        else:
            text = question.get("question_text") or question.get("question") or ""

        return " ".join(text.lower().split())
