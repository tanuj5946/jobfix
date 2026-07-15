from assessment_engine.graph.state import AssessmentState
import logging

MAX_BLUEPRINT_RETRIES = 3
MAX_QUESTION_RETRIES = 3



logger = logging.getLogger("ai-service")

def route_blueprint_validation(
    state: AssessmentState
) -> str:

    if state["blueprint_valid"]:
        return "valid"

    retry_count = state.get(
        "blueprint_retry_count",
        0
    )

    if retry_count >= MAX_BLUEPRINT_RETRIES:
        logger.warning(
            "Blueprint validation failed after maximum retries. Continuing with best available blueprint."
        )
        return "valid"

    return "retry"
def route_after_question_retrieval(
    state: AssessmentState
) -> str:

    missing_requirements = state.get(
        "missing_requirements",
        []
    )

    if missing_requirements:
        return "missing"

    return "complete"


def route_question_validation(
    state: AssessmentState
) -> str:

    failed_questions = state.get(
        "failed_questions",
        []
    )

    if not failed_questions:
        return "valid"

    retry_count = state.get(
        "generation_retry_count",
        0
    )

    if retry_count >= MAX_QUESTION_RETRIES:
        return "failed"

    return "retry"
