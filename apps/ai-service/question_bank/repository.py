from typing import Any

from retrieval.vector_store import VectorStore, format_vector


QUESTION_COLUMNS = """
    id,
    role,
    skill,
    category,
    difficulty,
    question_type,
    question_text,
    options,
    correct_answer,
    rubric,
    tags,
    created_at,
    updated_at
"""


class QuestionRepository:
    def __init__(self, vector_store: VectorStore | None = None):
        self.vector_store = vector_store or VectorStore()

    def add_question(
        self,
        *,
        role: str,
        skill: str,
        category: str | None,
        difficulty: str,
        question_type: str,
        question_text: str,
        options: Any | None,
        correct_answer: str | None,
        rubric: Any | None,
        tags: list[str],
        embedding: list[float],
    ) -> dict[str, Any]:
        query = f"""
            INSERT INTO question_bank (
                role,
                skill,
                category,
                difficulty,
                question_type,
                question_text,
                options,
                correct_answer,
                rubric,
                tags,
                embedding
            )
            VALUES (
                %(role)s,
                %(skill)s,
                %(category)s,
                %(difficulty)s,
                %(question_type)s,
                %(question_text)s,
                %(options)s,
                %(correct_answer)s,
                %(rubric)s,
                %(tags)s,
                %(embedding)s::vector
            )
            RETURNING {QUESTION_COLUMNS}
        """
        Jsonb = self._jsonb_adapter()
        params = {
            "role": role,
            "skill": skill,
            "category": category,
            "difficulty": difficulty,
            "question_type": question_type,
            "question_text": question_text,
            "options": Jsonb(options) if options is not None else None,
            "correct_answer": correct_answer,
            "rubric": Jsonb(rubric) if rubric is not None else None,
            "tags": tags,
            "embedding": format_vector(embedding),
        }

        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                cur.execute(query, params)
                row = cur.fetchone()
            conn.commit()

        return dict(row)

    def search_by_metadata(
        self,
        *,
        role: str | None = None,
        skill: str | None = None,
        difficulty: str | None = None,
        question_type: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        where_sql, params = self._metadata_where(
            role=role,
            skill=skill,
            difficulty=difficulty,
            question_type=question_type,
        )
        params["limit"] = limit

        query = f"""
            SELECT {QUESTION_COLUMNS}, NULL::float AS similarity
            FROM question_bank
            {where_sql}
            ORDER BY created_at DESC
            LIMIT %(limit)s
        """

        return self._fetch_all(query, params)

    def search_by_embedding(
        self,
        *,
        embedding: list[float],
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        query = f"""
            SELECT
                {QUESTION_COLUMNS},
                1 - (embedding <=> %(embedding)s::vector) AS similarity
            FROM question_bank
            ORDER BY embedding <=> %(embedding)s::vector
            LIMIT %(limit)s
        """
        return self._fetch_all(
            query,
            {
                "embedding": format_vector(embedding),
                "limit": limit,
            },
        )

    def hybrid_search(
        self,
        *,
        embedding: list[float],
        role: str | None = None,
        skill: str | None = None,
        difficulty: str | None = None,
        question_type: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        where_sql, params = self._metadata_where(
            role=role,
            skill=skill,
            difficulty=difficulty,
            question_type=question_type,
        )
        params.update(
            {
                "embedding": format_vector(embedding),
                "limit": limit,
            }
        )

        query = f"""
            WITH filtered AS (
                SELECT *
                FROM question_bank
                {where_sql}
            )
            SELECT
                {QUESTION_COLUMNS},
                1 - (embedding <=> %(embedding)s::vector) AS similarity
            FROM filtered
            ORDER BY embedding <=> %(embedding)s::vector
            LIMIT %(limit)s
        """
        return self._fetch_all(query, params)

    def delete_question(self, question_id: int) -> bool:
        with self.vector_store.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM question_bank WHERE id = %(question_id)s",
                    {"question_id": question_id},
                )
                deleted = cur.rowcount > 0
            conn.commit()

        return deleted

    def _fetch_all(
        self,
        query: str,
        params: dict[str, Any],
    ) -> list[dict[str, Any]]:
        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                cur.execute(query, params)
                rows = cur.fetchall()

        return [dict(row) for row in rows]

    def _dict_row(self):
        try:
            from psycopg.rows import dict_row
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "psycopg is not installed. Run `pip install -r requirements.txt` "
                "inside apps/ai-service before using database-backed features."
            ) from exc

        return dict_row

    def _jsonb_adapter(self):
        try:
            from psycopg.types.json import Jsonb
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "psycopg is not installed. Run `pip install -r requirements.txt` "
                "inside apps/ai-service before using database-backed features."
            ) from exc

        return Jsonb

    def _metadata_where(
        self,
        *,
        role: str | None = None,
        skill: str | None = None,
        difficulty: str | None = None,
        question_type: str | None = None,
        table_alias: str | None = None,
    ) -> tuple[str, dict[str, Any]]:
        prefix = f"{table_alias}." if table_alias else ""
        clauses = []
        params: dict[str, Any] = {}

        if role:
            clauses.append(f"LOWER({prefix}role) = LOWER(%(role)s)")
            params["role"] = role

        if skill:
            clauses.append(f"LOWER({prefix}skill) = LOWER(%(skill)s)")
            params["skill"] = skill

        if difficulty:
            clauses.append(f"LOWER({prefix}difficulty) = LOWER(%(difficulty)s)")
            params["difficulty"] = difficulty

        if question_type:
            clauses.append(f"LOWER({prefix}question_type) = LOWER(%(question_type)s)")
            params["question_type"] = question_type

        if not clauses:
            return "", params

        return "WHERE " + " AND ".join(clauses), params
