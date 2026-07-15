from langgraph.graph import StateGraph, START, END

from assessment_engine.graph.state import AssessmentState
from assessment_engine.graph.nodes import (analyze_skill_relevance,
                                           calculate_skill_weights,
                                           generate_assessment_blueprint,
                                           validate_blueprint,
                                           prepare_blueprint_retry,
                                           retrieve_assessment_questions,
                                           generate_missing_questions,
                                           validate_generated_questions,
                                           regenerate_failed_questions,
                                           build_final_assessment
                                           )

from assessment_engine.graph.edges import (
    route_after_question_retrieval,
    route_blueprint_validation,
    route_question_validation
)


def build_assessment_graph():

    graph = StateGraph(AssessmentState)

    graph.add_node(
        "skill_relevance",
        analyze_skill_relevance
    )
    graph.add_node(
        "skill_weighting",
        calculate_skill_weights
    )
    graph.add_node(
        "assessment_blueprint",
        generate_assessment_blueprint
    )

    graph.add_node(
        "blueprint_validator",
        validate_blueprint
    )

    graph.add_node(
        "blueprint_retry",
        prepare_blueprint_retry
    )

    graph.add_node(
        "question_retrieval",
        retrieve_assessment_questions
    )

    graph.add_node(
        "question_generation",
        generate_missing_questions
    )

    graph.add_node(
        "question_validation",
        validate_generated_questions
    )

    graph.add_node(
        "question_regeneration",
        regenerate_failed_questions
    )

    graph.add_node(
        "assessment_builder",
        build_final_assessment
    )
    graph.add_edge(
        START,
        "skill_relevance"
    )

    graph.add_edge(
        "skill_relevance",
        "skill_weighting"
    )
    graph.add_edge(
        "skill_weighting",
        "assessment_blueprint"
    )

    graph.add_edge(
        "assessment_blueprint",
        "blueprint_validator"
    )

    graph.add_conditional_edges(
        "blueprint_validator",
        route_blueprint_validation,
        {
            "valid": "question_retrieval",
            "retry": "blueprint_retry"
        }
    )

    graph.add_edge(
        "blueprint_retry",
        "assessment_blueprint"
    )

    graph.add_conditional_edges(
        "question_retrieval",
        route_after_question_retrieval,
        {
            "complete": "assessment_builder",
            "missing": "question_generation"
        }
    )

    graph.add_edge(
        "question_generation",
        "question_validation"
    )

    graph.add_conditional_edges(
        "question_validation",
        route_question_validation,
        {
            "valid": "assessment_builder",
            "retry": "question_regeneration",
            "failed": "assessment_builder"
        }
    )

    graph.add_edge(
        "question_regeneration",
        "question_validation"
    )

    graph.add_edge(
        "assessment_builder",
        END
    )

    return graph.compile()
