from pydantic import BaseModel, Field


class JobDescriptionAnalysis(BaseModel):
    required_skills: list[str] = Field(
        default_factory=list,
        description="Skills explicitly required for the role",
    )
    preferred_skills: list[str] = Field(
        default_factory=list,
        description="Nice-to-have or preferred skills",
    )
    education: str | None = Field(
        default=None,
        description="Education requirement stated in the description",
    )
    responsibilities: list[str] = Field(
        default_factory=list,
        description="Key job responsibilities",
    )
    experience: str | None = Field(
        default=None,
        description="Experience requirement stated in the description",
    )


class JobDescriptionAnalysisRequest(BaseModel):
    title: str
    description: str
