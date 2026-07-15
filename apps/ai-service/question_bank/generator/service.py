from question_bank.generator.chain import question_generation_chain
from question_bank.generator.storage_service import (
    question_storage_service,
)


class QuestionGeneratorService:

    def generate(
        self,
        role: str,
        skill: str,
        count: int,
    ):

        result = question_generation_chain.invoke(
            {
                "role": role,
                "skill": skill,
                "count": count,
            }
        )

        # Metadata is request-scoped; set it here rather than depending on the
        # model to repeat it correctly for every generated question.
        questions = [
            question.model_copy(
                update={
                    "role": role,
                    "skill": skill,
                    "category": question.category or "technical",
                    "tags": question.tags or [skill],
                }
            )
            for question in result.questions
        ]

        stats = question_storage_service.store_questions(questions)

        return stats


question_generator_service = QuestionGeneratorService()
