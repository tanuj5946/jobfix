from langchain_google_genai import ChatGoogleGenerativeAI

from config import GEMINI_API_KEY

import os

os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY


def get_llm():

    return ChatGoogleGenerativeAI(

        model="gemini-2.5-flash",

        temperature=0,

        timeout=60

    )