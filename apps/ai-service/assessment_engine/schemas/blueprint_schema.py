import json
from collections import defaultdict
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class QuestionRequirement(BaseModel):
    question_type: Literal[
        "mcq",
        "conceptual"
    ]

    difficulty: Literal[
        "easy",
        "medium",
        "hard"
    ]

    count: int = Field(
        ge=0,
        description="Number of questions required"
    )


class SkillBlueprint(BaseModel):
    skill: str

    requirements: list[QuestionRequirement]


class AssessmentBlueprint(BaseModel):
    assessment_name: str

    total_questions: int

    skill_distribution: list[SkillBlueprint]

    blueprint_summary: str

    @field_validator("skill_distribution", mode="before")
    @classmethod
    def normalize_skill_distribution(
        cls,
        value: Any,
    ) -> Any:
        if not isinstance(value, dict):
            return value

        expanded_slots: list[tuple[str, str, str]] = []
        question_types = (
            ["mcq"] * 20
            + ["conceptual"] * 5
        )
        difficulties = (
            ["easy"] * 8
            + ["medium"] * 12
            + ["hard"] * 5
        )

        slot_index = 0
        for skill, count_data in value.items():
            count = cls._extract_count(count_data)
            for _ in range(count):
                question_type = question_types[
                    min(slot_index, len(question_types) - 1)
                ]
                difficulty = difficulties[
                    min(slot_index, len(difficulties) - 1)
                ]
                expanded_slots.append(
                    (skill, question_type, difficulty)
                )
                slot_index += 1

        grouped: dict[str, dict[tuple[str, str], int]] = defaultdict(
            lambda: defaultdict(int)
        )
        for skill, question_type, difficulty in expanded_slots:
            grouped[skill][(question_type, difficulty)] += 1

        return [
            {
                "skill": skill,
                "requirements": [
                    {
                        "question_type": question_type,
                        "difficulty": difficulty,
                        "count": count,
                    }
                    for (question_type, difficulty), count
                    in requirements.items()
                ],
            }
            for skill, requirements in grouped.items()
        ]

    @field_validator("blueprint_summary", mode="before")
    @classmethod
    def normalize_blueprint_summary(
        cls,
        value: Any,
    ) -> str:
        if isinstance(value, str):
            return value

        return json.dumps(value, default=str)

    @staticmethod
    def _extract_count(
        value: Any,
    ) -> int:
        if isinstance(value, dict):
            value = value.get("count", value.get("questions", 0))

        try:
            return max(int(value), 0)
        except (TypeError, ValueError):
            return 0
