from functools import lru_cache

from langchain_groq import ChatGroq

from config import GROQ_API_KEY


@lru_cache(maxsize=1)
def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=GROQ_API_KEY,
        temperature=0,
        timeout=60,
    )
