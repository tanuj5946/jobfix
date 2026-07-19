from typing import Any

from shared.core_api import CoreApiClient, core_api_client


class CoreAssessmentClient:
    """Read-only assessment data client. Core owns all writes."""

    def __init__(self, client: CoreApiClient | None = None):
        self.client = client or core_api_client

    def load_assessment(self, assessment_id: int) -> dict[str, Any] | None:
        return self._optional(f"/assessments/{assessment_id}")

    def load_attempt(self, attempt_id: int) -> dict[str, Any] | None:
        return self._optional(f"/assessment-attempts/{attempt_id}")

    def load_result(self, assessment_id: int) -> dict[str, Any] | None:
        return self._optional(f"/assessments/{assessment_id}/result")

    def load_candidate_history(self, candidate_id: int) -> list[dict[str, Any]]:
        return self.client.get(f"/candidates/{candidate_id}/assessment-history")

    def _optional(self, path: str) -> dict[str, Any] | None:
        try:
            return self.client.get(path)
        except RuntimeError as exc:
            if "(404)" in str(exc):
                return None
            raise
