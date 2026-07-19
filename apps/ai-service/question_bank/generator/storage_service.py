from retrieval.embedding_service import EmbeddingService


class QuestionStorageService:
    def __init__(self):
        self.embedding_service = EmbeddingService()

    def store_questions(self, questions):
        stored = 0
        failed = 0
        prepared = []

        for question in questions:
            try:
                embedding = self.embedding_service.embed_text(
                    question.question_text
                )

                prepared.append({**question.model_dump(), "embedding": embedding})
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
            "prepared": stored,
            "failed": failed,
            "questions": prepared,
        }


question_storage_service = QuestionStorageService()
