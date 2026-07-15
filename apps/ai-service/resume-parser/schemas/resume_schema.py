from pydantic import BaseModel, Field


class PersonalInfo(BaseModel):

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    github: str | None = None
    linkedin: str | None = None


class ResumeSchema(BaseModel):

    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)

    education: list = Field(default_factory=list)

    experience: list = Field(default_factory=list)

    projects: list = Field(default_factory=list)

    skills: dict = Field(default_factory=dict)

    certifications: list = Field(default_factory=list)

    languages: list = Field(default_factory=list)

    target_roles: list = Field(default_factory=list)

    summary: str | None = None
