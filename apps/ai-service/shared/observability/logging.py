import logging
import time
from contextvars import ContextVar
from typing import Any
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


request_context: ContextVar[dict[str, Any]] = ContextVar(
    "request_context",
    default={},
)


def get_request_context() -> dict[str, Any]:
    return dict(request_context.get({}))


def get_request_id() -> str | None:
    return get_request_context().get("request_id")


def log_event(
    logger: logging.Logger,
    level: int,
    event: str,
    **fields: Any,
) -> None:
    payload = {
        "event": event,
        **get_request_context(),
        **fields,
    }
    logger.log(
        level,
        "%s | %s",
        event,
        payload,
    )


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        request_id = request.headers.get("x-request-id") or str(uuid4())
        context = {
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
        }
        token = request_context.set(context)

        try:
            response = await call_next(request)
            return response
        finally:
            execution_time = round(
                (time.perf_counter() - start_time) * 1000,
                2,
            )
            logging.getLogger("ai-service").info(
                "request_completed | %s",
                {
                    **context,
                    "execution_time_ms": execution_time,
                },
            )
            request_context.reset(token)
