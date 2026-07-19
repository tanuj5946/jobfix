import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class CoreApiClient:
    """The AI service's only persistence boundary: Core's authenticated API."""

    def __init__(self, base_url: str | None = None, api_key: str | None = None):
        self.base_url = (base_url or os.getenv("CORE_API_URL", "http://localhost:3001")).rstrip("/")
        self.api_key = api_key or os.getenv("INTERNAL_API_KEY")
        if not self.api_key:
            raise ValueError("INTERNAL_API_KEY must be configured for Core API access")

    def get(self, path: str) -> Any:
        return self._request("GET", path)

    def post(self, path: str, payload: dict[str, Any]) -> Any:
        return self._request("POST", path, payload)

    def put(self, path: str, payload: dict[str, Any]) -> Any:
        return self._request("PUT", path, payload)

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(
            f"{self.base_url}/internal{path}",
            data=body,
            method=method,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=15) as response:
                if response.status == 204:
                    return None
                envelope = json.loads(response.read().decode("utf-8"))
                return envelope.get("data")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Core API request failed ({exc.code}): {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"Core API is unavailable: {exc.reason}") from exc


core_api_client = CoreApiClient()
