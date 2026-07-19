from typing import Any
from datetime import datetime, timezone
from uuid import uuid4


class AssessmentBuilderService:
    def build_assessment(
        self,
        *,
        assessment_name: str | None,
        target_role: str,
        blueprint: list[dict[str, Any]],
        retrieved_questions: list[dict[str, Any]],
        generated_questions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        ordered_questions = self._order_questions(
            blueprint=blueprint,
            retrieved_questions=retrieved_questions,
            generated_questions=generated_questions,
        )

        return {
            "assessment_id": str(uuid4()),
            "role": target_role,
            "title": assessment_name or f"{target_role} Assessment",
            "duration": self._duration_minutes(len(ordered_questions)),
            "total_questions": len(ordered_questions),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "questions": ordered_questions,
        }

    def _order_questions(
        self,
        *,
        blueprint: list[dict[str, Any]],
        retrieved_questions: list[dict[str, Any]],
        generated_questions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        consumed: set[tuple[str, int]] = set()
        ordered: list[dict[str, Any]] = []

        for skill_blueprint in blueprint:
            skill = skill_blueprint["skill"]

            for requirement in skill_blueprint["requirements"]:
                matches = self._matching_questions(
                    questions=retrieved_questions,
                    source="retrieved",
                    consumed=consumed,
                    limit=requirement["count"],
                    skill=skill,
                    difficulty=requirement["difficulty"],
                    question_type=requirement["question_type"],
                )
                matches.extend(
                    self._matching_questions(
                        questions=generated_questions,
                        source="generated",
                        consumed=consumed,
                        limit=requirement["count"] - len(matches),
                        skill=skill,
                        difficulty=requirement["difficulty"],
                        question_type=requirement["question_type"],
                    )
                )

                ordered.extend(matches)

        ordered.extend(
            self._remaining_questions(
                questions=retrieved_questions,
                source="retrieved",
                consumed=consumed,
            )
        )
        ordered.extend(
            self._remaining_questions(
                questions=generated_questions,
                source="generated",
                consumed=consumed,
            )
        )

        return [
            self._assessment_question(question)
            for question in ordered
        ]

    def _matching_questions(
        self,
        *,
        questions: list[dict[str, Any]],
        source: str,
        consumed: set[tuple[str, int]],
        limit: int,
        skill: str,
        difficulty: str,
        question_type: str,
    ) -> list[dict[str, Any]]:
        if limit <= 0:
            return []

        matches = []

        for index, question in enumerate(questions):
            key = (source, index)
            if key in consumed:
                continue

            if (
                question.get("skill") == skill
                and question.get("difficulty") == difficulty
                and question.get("question_type") == question_type
            ):
                consumed.add(key)
                matches.append(question)

            if len(matches) >= limit:
                break

        return matches

    def _remaining_questions(
        self,
        *,
        questions: list[dict[str, Any]],
        source: str,
        consumed: set[tuple[str, int]],
    ) -> list[dict[str, Any]]:
        remaining = []

        for index, question in enumerate(questions):
            key = (source, index)
            if key not in consumed:
                consumed.add(key)
                remaining.append(question)

        return remaining

    def _assessment_question(
        self,
        question: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "question_id": question.get("id"),
            "role": question.get("role"),
            "skill": question.get("skill"),
            "difficulty": question.get("difficulty"),
            "question_type": question.get("question_type"),
            "question": question.get("question_text"),
            "question_text": question.get("question_text"),
            "options": question.get("options"),
            "correct_answer": question.get("correct_answer"),
            "rubric": question.get("rubric"),
            "marks": self._question_marks(question.get("question_type")),
            "tags": question.get("tags") or [],
            "embedding": question.get("embedding"),
        }

    def _duration_minutes(
        self,
        question_count: int,
    ) -> int:
        return max(30, question_count * 2)

    def _question_marks(
        self,
        question_type: str | None,
    ) -> float:
        if question_type == "conceptual":
            return 2.0
        return 1.0
