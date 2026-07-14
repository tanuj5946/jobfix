from typing import Any

from pydantic import BaseModel, Field


class AssessmentCreateRequest(BaseModel):
    candidate_id: int
    target_role: str
    selected_skills: list[str] = Field(min_length=1)


class SubmittedAnswer(BaseModel):
    question_id: int
    candidate_answer: str


class AssessmentSubmitRequest(BaseModel):
    assessment_id: int
    candidate_id: int
    answers: list[SubmittedAnswer] = Field(min_length=1)


class AssessmentEvaluateRequest(BaseModel):
    assessment_id: int
    candidate_id: int
    attempt_id: int


class ConceptualEvaluation(BaseModel):
    score: float = Field(ge=0, le=100)
    feedback: str
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)


class RecruiterReport(BaseModel):
    candidate_summary: str
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    skill_breakdown: dict[str, float]
    recommendations: list[str] = Field(default_factory=list)
    missing_core_skills: list[str] = Field(default_factory=list)
    readiness_score: float = Field(ge=0, le=100)


class LearningRecommendationItem(BaseModel):
    skill: str
    resource_title: str
    resource_url: str | None = None
    resource_type: str | None = None
    priority: str = "medium"


class LearningRecommendationBatch(BaseModel):
    learning_recommendations: list[LearningRecommendationItem]


class EvaluationContext(BaseModel):
    assessment: dict[str, Any]
    attempt: dict[str, Any]
    answers: list[dict[str, Any]]
    skill_weights: dict[str, float] = Field(default_factory=dict)
