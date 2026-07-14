import hashlib
import json
import time
from threading import Lock
from typing import Any

from shared.observability.metrics import metrics_registry


class TTLCache:
    def __init__(
        self,
        *,
        ttl_seconds: int,
        max_items: int = 1024,
        name: str = "cache",
    ):
        self.ttl_seconds = ttl_seconds
        self.max_items = max_items
        self.name = name
        self._lock = Lock()
        self._items: dict[str, tuple[float, Any]] = {}

    def make_key(
        self,
        payload: Any,
    ) -> str:
        encoded = json.dumps(
            payload,
            sort_keys=True,
            default=str,
        )
        return hashlib.sha256(encoded.encode("utf-8")).hexdigest()

    def get(
        self,
        key: str,
    ) -> Any | None:
        with self._lock:
            item = self._items.get(key)
            if not item:
                metrics_registry.increment("cache_miss")
                metrics_registry.increment(f"{self.name}_miss")
                return None

            expires_at, value = item
            if expires_at < time.time():
                self._items.pop(key, None)
                metrics_registry.increment("cache_miss")
                metrics_registry.increment(f"{self.name}_expired")
                return None

            metrics_registry.increment("cache_hit")
            metrics_registry.increment(f"{self.name}_hit")
            return value

    def set(
        self,
        key: str,
        value: Any,
    ) -> None:
        with self._lock:
            if len(self._items) >= self.max_items:
                oldest_key = next(iter(self._items))
                self._items.pop(oldest_key, None)

            self._items[key] = (
                time.time() + self.ttl_seconds,
                value,
            )

    def get_or_set(
        self,
        payload: Any,
        factory,
    ) -> Any:
        key = self.make_key(payload)
        cached = self.get(key)
        if cached is not None:
            return cached

        value = factory()
        self.set(key, value)
        return value


llm_cache = TTLCache(
    ttl_seconds=900,
    max_items=2048,
    name="llm_cache",
)
question_cache = TTLCache(
    ttl_seconds=300,
    max_items=2048,
    name="question_cache",
)
