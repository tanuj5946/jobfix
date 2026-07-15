"""Question-bank aliases for the assessment engine's canonical schema."""

from assessment_engine.schemas.question_generation_schema import (
    GeneratedQuestion,
    GeneratedQuestionBatch,
)

# Keep the existing question-bank name without maintaining a second,
# potentially divergent Pydantic model.
GeneratedQuestionSet = GeneratedQuestionBatch
