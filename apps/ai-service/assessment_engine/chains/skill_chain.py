from pathlib import Path

from langchain_core.prompts import PromptTemplate

from shared.llm import get_llm

from assessment_engine.schemas.skill_schema import (
    SkillWeightAnalysis
)


def build_skill_weight_chain():

    llm = get_llm()

    prompt_path = (
        Path(__file__).resolve().parent.parent
        / "prompts"
        / "skill_weight_prompt.txt"
    )

    prompt_text = prompt_path.read_text(
        encoding="utf-8"
    )

    prompt = PromptTemplate.from_template(
        prompt_text
    )

    structured_llm = llm.with_structured_output(
        SkillWeightAnalysis
    )

    return (
    prompt
    | structured_llm.with_retry(
        stop_after_attempt=6,
        wait_exponential_jitter=True
    )
)