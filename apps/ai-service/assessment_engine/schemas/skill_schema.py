from pydantic import BaseModel, Field


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