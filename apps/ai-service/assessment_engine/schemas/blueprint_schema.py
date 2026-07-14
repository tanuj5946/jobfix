from typing import Literal

from pydantic import BaseModel, Field


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