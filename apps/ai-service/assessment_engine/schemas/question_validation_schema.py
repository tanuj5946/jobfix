from pydantic import BaseModel, Field


class QuestionValidationFeedback(BaseModel):
    question_index: int = Field(ge=0)
    is_valid: bool
    feedback: list[str] = Field(default_factory=list)


class QuestionValidationResult(BaseModel):
    validation_result: bool
    validation_feedback: list[QuestionValidationFeedback]
    valid_question_indices: list[int] = Field(default_factory=list)
    failed_question_indices: list[int] = Field(default_factory=list)
