from pathlib import Path
from langchain_core.prompts import PromptTemplate

from shared.llm import get_structured_llm

from assessment_engine.schemas.skill_analysis_schema import (
    SkillAnalysis
)

def build_skill_relevance_chain():  

    prompt_path = (
        Path(__file__).resolve().parent.parent
        / "prompts"
        / "skill_relevance_prompt.txt"
    )

    prompt_text = prompt_path.read_text(
        encoding="utf-8"
    )

    prompt = PromptTemplate.from_template(
        prompt_text
    )

    structured_llm = get_structured_llm(
        SkillAnalysis
    )

    return (
    prompt
    | structured_llm.with_retry(
        stop_after_attempt=6,
        wait_exponential_jitter=True
    )
)