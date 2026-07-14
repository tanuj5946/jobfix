import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


class VectorStore:
    def __init__(self, database_url: str | None = None):
        self.database_url = database_url or os.getenv("AI_DATABASE_URL") or os.getenv("DATABASE_URL")

        if not self.database_url:
            raise ValueError(
                "AI_DATABASE_URL or DATABASE_URL must be configured for question retrieval"
            )

    @contextmanager
    def connection(self) -> Iterator:
        try:
            import psycopg
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "psycopg is not installed. Run `pip install -r requirements.txt` "
                "inside apps/ai-service before using database-backed features."
            ) from exc

        with psycopg.connect(self.database_url) as conn:
            yield conn

    def configure_pgvector(self) -> None:
        migration_path = (
            Path(__file__).resolve().parents[2]
            / "core-service"
            / "prisma"
            / "migrations"
            / "20260714170000_add_question_bank"
            / "migration.sql"
        )

        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(migration_path.read_text(encoding="utf-8"))
            conn.commit()


def format_vector(vector: list[float]) -> str:
    return "[" + ",".join(str(value) for value in vector) + "]"
