import logging
from typing import Any

from retrieval.embedding_service import EmbeddingService


logger = logging.getLogger("ai-service")


class QuestionStorageService:
    def __init__(
        self,
        embedding_service: EmbeddingService | None = None,
    ):
        self.embedding_service = embedding_service or EmbeddingService()

    def store_questions(
        self,
        questions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        stored_questions = []

        for question in questions:
            embedding = self.embedding_service.embed_question(
                question_text=question["question_text"],
                role=question["role"],
                skill=question["skill"],
                difficulty=question["difficulty"],
                question_type=question["question_type"],
                tags=question.get("tags") or [],
            )
            stored_questions.append({**question, "embedding": embedding})

        logger.info(
            "Prepared %s validated generated questions for Core persistence",
            len(stored_questions),
        )
        return stored_questions
