from pathlib import Path

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

from config import GROQ_API_KEY
from assessment_engine.schemas.question_validation_schema import (
    QuestionValidationResult,
)


def build_validation_chain():
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=GROQ_API_KEY,
        temperature=0,
        timeout=90,
    )
    parser = PydanticOutputParser(
        pydantic_object=QuestionValidationResult
    )

    prompt_path = (
        Path(__file__).resolve().parent.parent
        / "prompts"
        / "validation_prompt.txt"
    )
    prompt = PromptTemplate(
        template=prompt_path.read_text(encoding="utf-8"),
        input_variables=[
            "questions_json",
            "existing_questions_json",
        ],
        partial_variables={
            "format_instructions": parser.get_format_instructions()
        },
    )

    chain = (
        prompt
        | llm
        | parser
    )

    return chain.with_retry(
        stop_after_attempt=4,
        wait_exponential_jitter=True,
    )
