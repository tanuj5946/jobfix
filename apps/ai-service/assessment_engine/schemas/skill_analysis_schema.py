from pydantic import BaseModel, Field


class SkillAnalysis(BaseModel):

    relevant_skills: list[str] = Field(
        description="Skills directly relevant to the selected target role"
    )

    secondary_skills: list[str] = Field(
        description="Supporting skills useful for the selected target role"
    )

    irrelevant_skills: list[str] = Field(
        description="Skills not relevant to the selected target role"
    )

    missing_core_skills: list[str] = Field(
        description="Important core role skills missing from candidate selection"
    )

    reasoning: str = Field(
        description="Short explanation of the skill classification"
    )