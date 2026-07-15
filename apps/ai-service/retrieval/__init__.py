import os
from urllib.parse import (
    urlparse,
    parse_qsl,
    urlencode,
    urlunparse,
)

class VectorStore:
    def __init__(self, database_url: str | None = None):

        raw_url = (
            database_url
            or os.getenv("DATABASE_URL")
        )

        if not raw_url:
            raise ValueError(
                "DATABASE_URL must be configured for question retrieval"
            )

        self.database_url = self._sanitize_database_url(raw_url)

    def _sanitize_database_url(self, url: str) -> str:
        parsed = urlparse(url)

        allowed_params = [
            (key, value)
            for key, value in parse_qsl(parsed.query)
            if key != "pgbouncer"
        ]

        return urlunparse(
            parsed._replace(
                query=urlencode(allowed_params)
            )
        )