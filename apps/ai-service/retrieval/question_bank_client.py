from typing import Any

from shared.core_api import CoreApiClient, core_api_client


class QuestionBankClient:
    """Read-only client for Core-owned question-bank retrieval."""

    def __init__(self, client: CoreApiClient | None = None):
        self.client = client or core_api_client

    def search_by_metadata(self, **filters: Any) -> list[dict[str, Any]]:
        return self.client.post("/question-bank/search", filters)

    def hybrid_search(self, *, embedding: list[float], **filters: Any) -> list[dict[str, Any]]:
        return self.client.post("/question-bank/search", {"embedding": embedding, **filters})
