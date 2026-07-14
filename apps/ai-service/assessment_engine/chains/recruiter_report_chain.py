from pathlib import Path

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

from config import GROQ_API_KEY
from assessment_engine.schemas.assessment_submission_schema import (
    RecruiterReport,
)


def build_recruiter_report_chain():
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=GROQ_API_KEY,
        temperature=0.2,
        timeout=90,
    )
    parser = PydanticOutputParser(
        pydantic_object=RecruiterReport
    )
    prompt_path = (
        Path(__file__).resolve().parent.parent
        / "prompts"
        / "recruiter_report_prompt.txt"
    )
    prompt = PromptTemplate(
        template=prompt_path.read_text(encoding="utf-8"),
        input_variables=[
            "assessment_json",
            "evaluation_json",
            "missing_core_skills",
        ],
        partial_variables={
            "format_instructions": parser.get_format_instructions()
        },
    )
    chain = prompt | llm | parser
    return chain.with_retry(
        stop_after_attempt=4,
        wait_exponential_jitter=True,
    )
