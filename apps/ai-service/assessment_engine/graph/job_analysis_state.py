from typing import TypedDict


class JobAnalysisState(TypedDict, total=False):
    title: str
    description: str
    required_skills: list[str]
    preferred_skills: list[str]
    education: str | None
    responsibilities: list[str]
    experience: str | None
