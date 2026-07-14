from pydantic import BaseModel, Field


class PersonalInfo(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    github: str | None = None
    linkedin: str | None = None


class ExtractedSkill(BaseModel):
    """A skill identified from the resume with an LLM-estimated confidence score."""
    name: str
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence that this candidate actually has this skill (0.0–1.0)",
    )


class ResumeSchema(BaseModel):
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)

    education: list = Field(default_factory=list)

    experience: list = Field(default_factory=list)

    projects: list = Field(default_factory=list)

    # Flat list of skills with confidence — replaces the old skills: dict
    skills: list[ExtractedSkill] = Field(default_factory=list)

    certifications: list = Field(default_factory=list)

    languages: list = Field(default_factory=list)

    # List of suitable roles inferred from the resume
    target_roles: list[str] = Field(default_factory=list)

    summary: str | None = None
