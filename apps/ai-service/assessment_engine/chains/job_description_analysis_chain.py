from pathlib import Path

from langchain_core.prompts import PromptTemplate

from assessment_engine.schemas.job_description_analysis_schema import (
    JobDescriptionAnalysis,
)
from shared.llm import get_structured_llm


def build_job_description_analysis_chain():
    prompt_path = (
        Path(__file__).resolve().parent.parent
        / "prompts"
        / "job_description_analysis_prompt.txt"
    )
    prompt = PromptTemplate.from_template(prompt_path.read_text(encoding="utf-8"))
    structured_llm = get_structured_llm(JobDescriptionAnalysis)

    return prompt | structured_llm.with_retry(
        stop_after_attempt=3,
        wait_exponential_jitter=True,
    )
