from collections import defaultdict
from threading import Lock
from typing import Any


class MetricsRegistry:
    def __init__(self):
        self._lock = Lock()
        self._counters: dict[str, float] = defaultdict(float)
        self._timings: dict[str, list[float]] = defaultdict(list)

    def increment(
        self,
        name: str,
        value: float = 1,
    ) -> None:
        with self._lock:
            self._counters[name] += value

    def observe(
        self,
        name: str,
        value: float,
    ) -> None:
        with self._lock:
            self._timings[name].append(value)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            timings = {
                name: {
                    "count": len(values),
                    "avg_ms": round(sum(values) / len(values), 2)
                    if values
                    else 0,
                    "max_ms": round(max(values), 2) if values else 0,
                }
                for name, values in self._timings.items()
            }
            cache_hits = self._counters.get("cache_hit", 0)
            cache_misses = self._counters.get("cache_miss", 0)
            total_cache = cache_hits + cache_misses

            return {
                "counters": dict(self._counters),
                "timings": timings,
                "cache_hit_ratio": round(cache_hits / total_cache, 4)
                if total_cache
                else 0,
            }


metrics_registry = MetricsRegistry()
