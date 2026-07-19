from typing import Any
from concurrent.futures import ThreadPoolExecutor

from retrieval.question_bank_client import QuestionBankClient
from retrieval.embedding_service import EmbeddingService
from shared.cache import question_cache


class QuestionRetriever:
    def __init__(
        self,
        question_bank_client: QuestionBankClient | None = None,
        embedding_service: EmbeddingService | None = None,
    ):
        self.question_bank_client = question_bank_client or QuestionBankClient()
        self.embedding_service = embedding_service or EmbeddingService()

    def retrieve_for_blueprint(
        self,
        *,
        target_role: str,
        blueprint: list[dict[str, Any]],
    ) -> dict[str, list]:
        retrieved_questions: list[dict[str, Any]] = []
        missing_requirements: list[dict[str, Any]] = []
        seen_ids: set[int] = set()
        retrieval_jobs = []

        for skill_blueprint in blueprint:
            skill = skill_blueprint["skill"]

            for requirement in skill_blueprint["requirements"]:
                difficulty = requirement["difficulty"]
                question_type = requirement["question_type"]
                count = requirement["count"]

                retrieval_jobs.append(
                    {
                        "role": target_role,
                        "skill": skill,
                        "difficulty": difficulty,
                        "question_type": question_type,
                        "count": count,
                    }
                )

        with ThreadPoolExecutor(max_workers=6) as executor:
            job_results = list(
                executor.map(
                    self._retrieve_requirement,
                    retrieval_jobs,
                )
            )

        for job, matches in job_results:
            unique_matches = [
                question
                for question in matches
                if question["id"] not in seen_ids
            ]

            for question in unique_matches:
                seen_ids.add(question["id"])
                retrieved_questions.append(question)

            if len(unique_matches) < job["count"]:
                missing_requirements.append(
                    {
                        "role": job["role"],
                        "skill": job["skill"],
                        "difficulty": job["difficulty"],
                        "question_type": job["question_type"],
                        "required": job["count"],
                        "retrieved": len(unique_matches),
                    }
                )

        return {
            "retrieved_questions": retrieved_questions,
            "missing_requirements": missing_requirements,
        }

    def _retrieve_requirement(
        self,
        job: dict[str, Any],
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        query_text = (
            f"{job['role']} {job['skill']} {job['difficulty']} "
            f"{job['question_type']} assessment question"
        )
        embedding = self.embedding_service.embed_text(query_text)
        matches = question_cache.get_or_set(
            {
                "role": job["role"],
                "skill": job["skill"],
                "difficulty": job["difficulty"],
                "question_type": job["question_type"],
                "limit": job["count"],
            },
            lambda: self.question_bank_client.hybrid_search(
                embedding=embedding,
                role=job["role"],
                skill=job["skill"],
                difficulty=job["difficulty"],
                question_type=job["question_type"],
                limit=job["count"],
            ),
        )
        return job, matches
