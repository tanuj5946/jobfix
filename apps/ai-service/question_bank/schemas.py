from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class QuestionBase(BaseModel):
    role: str
    skill: str
    category: str | None = None
    difficulty: str
    question_type: str
    question_text: str
    options: Any | None = None
    correct_answer: str | None = None
    rubric: Any | None = None
    tags: list[str] = Field(default_factory=list)


class QuestionCreate(QuestionBase):
    embedding: list[float] | None = None


class BulkQuestionCreate(BaseModel):
    questions: list[QuestionCreate]


class QuestionSearchParams(BaseModel):
    role: str | None = None
    skill: str | None = None
    difficulty: str | None = None
    question_type: str | None = None
    query_text: str | None = None
    limit: int = Field(default=10, ge=1, le=100)


class QuestionResponse(QuestionBase):
    id: int
    similarity: float | None = None
    created_at: datetime
    updated_at: datetime


class RetrievalResponse(BaseModel):
    retrieved_questions: list[QuestionResponse]
    missing_requirements: list[dict[str, Any]]
