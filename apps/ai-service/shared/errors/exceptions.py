class AIServiceError(Exception):
    status_code = 500
    error_code = "ai_service_error"

    def __init__(
        self,
        message: str,
        *,
        details: dict | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class LLMError(AIServiceError):
    error_code = "llm_error"


class EmbeddingError(AIServiceError):
    error_code = "embedding_error"


class RetrievalError(AIServiceError):
    error_code = "retrieval_error"


class VectorSearchError(AIServiceError):
    error_code = "vector_search_error"


class ValidationError(AIServiceError):
    status_code = 422
    error_code = "validation_error"
