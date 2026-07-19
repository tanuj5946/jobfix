from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from assessment_engine.services.assessment_service import AssessmentService


class EvaluationState(TypedDict, total=False):
    assessment_id: int
    candidate_id: int
    answers: list[dict]
    submission_id: int
    result: dict


def submit_assessment_node(
    state: EvaluationState,
) -> dict:
    raise RuntimeError("Core must persist an assessment attempt before AI evaluation")


def evaluate_assessment_node(
    state: EvaluationState,
) -> dict:
    service = AssessmentService()
    result = service.evaluate_assessment(
        assessment_id=state["assessment_id"],
        attempt_id=state["submission_id"],
    )
    return {
        "result": result
    }


def build_evaluation_graph():
    graph = StateGraph(EvaluationState)

    graph.add_node(
        "candidate_submission",
        submit_assessment_node,
    )
    graph.add_node(
        "evaluation_pipeline",
        evaluate_assessment_node,
    )

    graph.add_edge(
        START,
        "candidate_submission",
    )
    graph.add_edge(
        "candidate_submission",
        "evaluation_pipeline",
    )
    graph.add_edge(
        "evaluation_pipeline",
        END,
    )

    return graph.compile()
