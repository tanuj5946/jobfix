from functools import lru_cache
from typing import Any

from langchain_groq import ChatGroq
from pydantic import BaseModel

from config import GROQ_API_KEY


@lru_cache(maxsize=1)
def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=GROQ_API_KEY,
        temperature=0,
        timeout=60,
    )


def get_structured_llm(schema: type[BaseModel] | dict[str, Any]):
    """Return a Groq LLM configured for reliable structured output.

    llama-3.3-70b-versatile does not support Groq's json_schema response
    format. JSON mode keeps responses parseable while Pydantic validates the
    parsed content locally.
    """
    return get_llm().with_structured_output(
        schema,
        method="json_mode",
    )
