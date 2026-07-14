PROMPT_VERSIONS = {
    "skill_relevance": "1.0.0",
    "skill_weight": "1.0.0",
    "blueprint": "1.0.0",
    "mcq_generation": "1.0.0",
    "conceptual_generation": "1.0.0",
    "question_validation": "1.0.0",
    "conceptual_evaluation": "1.0.0",
    "recruiter_report": "1.0.0",
    "learning_recommendation": "1.0.0",
}


def prompt_metadata(
    prompt_name: str,
) -> dict[str, str]:
    return {
        "prompt_name": prompt_name,
        "prompt_version": PROMPT_VERSIONS[prompt_name],
    }


def all_prompt_metadata() -> dict[str, str]:
    return dict(PROMPT_VERSIONS)
