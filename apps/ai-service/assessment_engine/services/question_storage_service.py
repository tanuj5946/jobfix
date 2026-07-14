import logging
from typing import Any

from question_bank.repository import QuestionRepository
from retrieval.embedding_service import EmbeddingService


logger = logging.getLogger("ai-service")


class QuestionStorageService:
    def __init__(
        self,
        repository: QuestionRepository | None = None,
        embedding_service: EmbeddingService | None = None,
    ):
        self.repository = repository or QuestionRepository()
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
            stored = self.repository.add_question(
                role=question["role"],
                skill=question["skill"],
                category=question.get("category"),
                difficulty=question["difficulty"],
                question_type=question["question_type"],
                question_text=question["question_text"],
                options=question.get("options"),
                correct_answer=question.get("correct_answer"),
                rubric=question.get("rubric"),
                tags=question.get("tags") or [],
                embedding=embedding,
            )
            stored_questions.append(stored)

        logger.info(
            "Stored %s validated generated questions",
            len(stored_questions),
        )
        return stored_questions
