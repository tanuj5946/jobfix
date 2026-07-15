import json
from typing import Any

from pydantic import BaseModel, Field, field_validator


class SkillWeight(BaseModel):
    skill: str
    weight: float = Field(
        ge=0,
        le=1,
        description="Importance weight of the skill"
    )
    reason: str


class SkillWeightAnalysis(BaseModel):
    skill_weights: list[SkillWeight]

    weighting_summary: str

    @field_validator("skill_weights", mode="before")
    @classmethod
    def normalize_skill_weights(
        cls,
        value: Any,
    ) -> Any:
        if not isinstance(value, dict):
            return value

        normalized = []
        for skill, weight_data in value.items():
            if isinstance(weight_data, dict):
                weight = weight_data.get("weight", 0)
                reason = weight_data.get(
                    "reason",
                    "Weighted by role relevance.",
                )
            else:
                weight = weight_data
                reason = "Weighted by role relevance."

            normalized.append(
                {
                    "skill": skill,
                    "weight": weight,
                    "reason": reason,
                }
            )

        return normalized

    @field_validator("weighting_summary", mode="before")
    @classmethod
    def normalize_weighting_summary(
        cls,
        value: Any,
    ) -> str:
        if isinstance(value, str):
            return value

        if isinstance(value, dict) and isinstance(value.get("reason"), str):
            return value["reason"]

        return json.dumps(value, default=str)
