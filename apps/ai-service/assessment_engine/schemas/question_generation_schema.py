from typing import Literal

from pydantic import BaseModel, Field


# =========================
# Existing MCQ Schema
# =========================

class MCQQuestion(BaseModel):
    question: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: str
    difficulty: Literal["easy", "medium", "hard"]
    skill: str
    role: str
    explanation: str
    tags: list[str] = Field(default_factory=list)


class MCQQuestionBatch(BaseModel):
    questions: list[MCQQuestion]


# =========================
# Existing Conceptual Schema
# =========================

class ConceptualQuestion(BaseModel):
    question: str
    rubric: list[str] = Field(min_length=2)
    difficulty: Literal["easy", "medium", "hard"]
    skill: str
    role: str
    expected_topics: list[str] = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)


class ConceptualQuestionBatch(BaseModel):
    questions: list[ConceptualQuestion]


# =========================
# Unified Question Schema
# =========================

class GeneratedQuestion(BaseModel):
    role: str
    skill: str
    category: str | None = None

    difficulty: Literal[
        "easy",
        "medium",
        "hard",
    ]

    question_type: Literal[
        "mcq",
        "conceptual",
    ]

    question_text: str

    options: list[str] | None = None

    correct_answer: str | None = None

    rubric: dict | list[str] | None = None

    tags: list[str] = Field(default_factory=list)

    generation_feedback: list[str] = Field(default_factory=list)


# =========================
# NEW
# Batch Generator Output
# =========================

class GeneratedQuestionBatch(BaseModel):
    questions: list[GeneratedQuestion]


# =========================
# Missing Requirement
# =========================

class MissingRequirement(BaseModel):
    role: str
    skill: str

    difficulty: Literal[
        "easy",
        "medium",
        "hard",
    ]

    question_type: Literal[
        "mcq",
        "conceptual",
    ]

    required: int
    retrieved: int = 0

    @property
    def missing_count(self):
        return max(
            self.required - self.retrieved,
            0,
        )


# =========================
# Batch Generation Request
# =========================

class BatchGenerationRequest(BaseModel):
    requirements: list[MissingRequirement]

    existing_questions: list[str] = Field(
        default_factory=list
    )


# =========================
# Existing Request Schemas
# =========================

class QuestionGenerationRequest(BaseModel):
    role: str
    skill: str

    difficulty: Literal[
        "easy",
        "medium",
        "hard",
    ]

    question_type: Literal[
        "mcq",
        "conceptual",
    ]

    count: int = Field(
        ge=1,
        le=25,
    )

    existing_questions: list[str] = Field(
        default_factory=list
    )


class AssessmentGenerationRequest(BaseModel):
    target_role: str

    selected_skills: list[str] = Field(
        min_length=1
    )


class AssessmentValidationRequest(BaseModel):
    questions: list[GeneratedQuestion]

    existing_questions: list[str] = Field(
        default_factory=list
    )


class QuestionValidationRequest(BaseModel):
    questions: list[GeneratedQuestion]

    existing_questions: list[str] = Field(
        default_factory=list
    )