from question_bank.repository import QuestionRepository
from retrieval.embedding_service import EmbeddingService


class QuestionStorageService:
    def __init__(self):
        self.repository = QuestionRepository()
        self.embedding_service = EmbeddingService()

    def store_questions(self, questions):
        stored = 0
        failed = 0

        for question in questions:
            try:
                embedding = self.embedding_service.embed_text(
                    question.question_text
                )

                self.repository.add_question(
                    role=question.role,
                    skill=question.skill,
                    category=question.category,
                    difficulty=question.difficulty,
                    question_type=question.question_type,
                    question_text=question.question_text,
                    options=question.options,
                    correct_answer=question.correct_answer,
                    rubric=question.rubric,
                    tags=question.tags,
                    embedding=embedding,
                )

                stored += 1

            except Exception as exc:
                failed += 1
                print(
                    f"Failed to store question:\n"
                    f"{question.question_text}\n"
                    f"Reason: {exc}\n"
                )

        return {
            "generated": len(questions),
            "stored": stored,
            "failed": failed,
        }


question_storage_service = QuestionStorageService()