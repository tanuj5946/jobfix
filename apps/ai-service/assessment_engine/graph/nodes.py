import logging
import time

from assessment_engine.graph.state import AssessmentState

from assessment_engine.chains.skill_relevance_chain import (
    build_skill_relevance_chain
)
from assessment_engine.chains.skill_chain import (
    build_skill_weight_chain
)

from assessment_engine.chains.blueprint_chain import build_blueprint_chain
from assessment_engine.services.assessment_builder_service import (
    AssessmentBuilderService
)
from assessment_engine.services.question_generation_service import (
    QuestionGenerationService
)
from assessment_engine.services.question_storage_service import (
    QuestionStorageService
)
from assessment_engine.services.question_validation_service import (
    QuestionValidationService
)
from retrieval.question_retriever import QuestionRetriever
from shared.cache import llm_cache
from shared.observability import log_event, metrics_registry


skill_relevance_chain = build_skill_relevance_chain()
skill_weight_chain = build_skill_weight_chain()
blueprint_chain = build_blueprint_chain()
generation_service = QuestionGenerationService()
validation_service = QuestionValidationService()
assessment_builder_service = AssessmentBuilderService()
logger = logging.getLogger("ai-service")

GENERIC_SUPPORT_SKILLS = {
    "git",
    "github",
    "gitlab",
    "bitbucket",
    "vs code",
    "visual studio code",
    "postman",
    "jira",
    "slack",
    "trello",
    "microsoft office",
    "ms office",
    "excel",
    "powerpoint",
    "word",
}


def normalize_skill_name(skill: str) -> str:
    return " ".join(skill.strip().lower().split())


def unique_skills(skills: list[str]) -> list[str]:
    seen = set()
    unique = []

    for skill in skills:
        normalized = normalize_skill_name(skill)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        unique.append(skill.strip())

    return unique


def remove_generic_support_skills(skills: list[str]) -> list[str]:
    return [
        skill
        for skill in unique_skills(skills)
        if normalize_skill_name(skill) not in GENERIC_SUPPORT_SKILLS
    ]


def analyze_skill_relevance(
    state: AssessmentState
) -> dict:

    payload = {
        "target_role": state["target_role"],
        "selected_skills": ", ".join(
            state["selected_skills"]
        )
    }
    start_time = time.perf_counter()
    result = llm_cache.get_or_set(
        {
            "chain": "skill_relevance",
            **payload,
        },
        lambda: skill_relevance_chain.invoke(payload),
    )
    latency_ms = (time.perf_counter() - start_time) * 1000
    metrics_registry.observe("llm_skill_relevance_latency_ms", latency_ms)
    log_event(
        logger,
        logging.INFO,
        "skill_relevance_completed",
        llm_latency_ms=round(latency_ms, 2),
    )

    relevant_skills = remove_generic_support_skills(result.relevant_skills)
    secondary_skills = remove_generic_support_skills(result.secondary_skills)
    irrelevant_skills = unique_skills(
        result.irrelevant_skills
        + [
            skill
            for skill in state["selected_skills"]
            if normalize_skill_name(skill) in GENERIC_SUPPORT_SKILLS
        ]
    )
    missing_core_skills = remove_generic_support_skills(result.missing_core_skills)

    return {
        "relevant_skills": relevant_skills,
        "secondary_skills": secondary_skills,
        "irrelevant_skills": irrelevant_skills,
        "missing_core_skills": missing_core_skills,
        "skill_analysis_reasoning": result.reasoning
    }


def normalize_weights(
    weights: dict[str, float]
) -> dict[str, float]:

    total = sum(weights.values())

    if total <= 0:
        raise ValueError(
            "Skill weights total must be greater than zero"
        )

    return {
        skill: round(weight / total, 4)
        for skill, weight in weights.items()
    }


def calculate_skill_weights(
    state: AssessmentState
) -> dict:

    eligible_skills = remove_generic_support_skills(
        state["relevant_skills"]
        + state["missing_core_skills"]
    )
    testable_skills = set(
        normalize_skill_name(skill)
        for skill in eligible_skills
    )

    payload = {
        "target_role": state["target_role"],
        "relevant_skills": ", ".join(
            state["relevant_skills"]
        ),
        "secondary_skills": "",
        "missing_core_skills": ", ".join(
            state["missing_core_skills"]
        )
    }
    start_time = time.perf_counter()
    result = llm_cache.get_or_set(
        {
            "chain": "skill_weight",
            **payload,
        },
        lambda: skill_weight_chain.invoke(payload),
    )
    latency_ms = (time.perf_counter() - start_time) * 1000
    metrics_registry.observe("llm_skill_weight_latency_ms", latency_ms)

    weights = {
        item.skill: item.weight
        for item in result.skill_weights
        if normalize_skill_name(item.skill) in testable_skills
        and normalize_skill_name(item.skill) not in GENERIC_SUPPORT_SKILLS
    }

    if not weights:
        weights = {
            skill: 1.0
            for skill in eligible_skills
        }

    weights = normalize_weights(weights)

    reasons = {
        item.skill: item.reason
        for item in result.skill_weights
        if item.skill in weights
    }
    for skill in weights:
        reasons.setdefault(
            skill,
            "Included because it is directly relevant to the target role.",
        )

    return {
        "skill_weights": weights,
        "skill_weight_reasons": reasons,
        "weighting_summary": result.weighting_summary
    }

def generate_assessment_blueprint(
    state: AssessmentState
) -> dict:

    blueprint_errors = state.get("blueprint_errors", [])
    if blueprint_errors:
        blueprint_feedback = (
            "Previous blueprint was invalid. Fix these issues:\n"
            + "\n".join(f"- {error}" for error in blueprint_errors)
        )
    else:
        blueprint_feedback = ""

    payload = {
        "target_role": state["target_role"],
        "skill_weights": state["skill_weights"],
        "relevant_skills": ", ".join(
            state["relevant_skills"]
        ),
        "secondary_skills": ", ".join(
            state["secondary_skills"]
        ),
        "missing_core_skills": ", ".join(
            state["missing_core_skills"]
        ),
        "blueprint_feedback": blueprint_feedback,
    }
    start_time = time.perf_counter()
    result = llm_cache.get_or_set(
        {
            "chain": "blueprint",
            **payload,
        },
        lambda: blueprint_chain.invoke(payload),
    )
    latency_ms = (time.perf_counter() - start_time) * 1000
    metrics_registry.observe("llm_blueprint_latency_ms", latency_ms)

    blueprint = [
        skill.model_dump()
        for skill in result.skill_distribution
    ]

    return {
        "assessment_name": result.assessment_name,
        "blueprint": blueprint,
        "blueprint_summary": result.blueprint_summary
    }

def validate_blueprint(
    state: AssessmentState
) -> dict:

    blueprint = state["blueprint"]

    type_counts = {
        "mcq": 0,
        "conceptual": 0
    }

    total_questions = 0
    errors = []

    allowed_skills = set(
        state["skill_weights"].keys()
    )

    for skill_blueprint in blueprint:

        skill = skill_blueprint["skill"]

        if skill not in allowed_skills:
            errors.append(
                f"Unknown skill in blueprint: {skill}"
            )

        for requirement in skill_blueprint["requirements"]:

            question_type = requirement["question_type"]
            count = requirement["count"]

            if question_type not in type_counts:
                errors.append(
                    f"Invalid question type: {question_type}"
                )
                continue

            type_counts[question_type] += count
            total_questions += count

    if total_questions != 25:
        errors.append(
            f"Expected 25 questions, got {total_questions}"
        )

    if type_counts["mcq"] != 20:
        errors.append(
            f"Expected 20 MCQs, got {type_counts['mcq']}"
        )

    if type_counts["conceptual"] != 5:
        errors.append(
            "Expected 5 conceptual questions, "
            f"got {type_counts['conceptual']}"
        )

    return {
        "blueprint_valid": len(errors) == 0,
        "blueprint_errors": errors
    }

def prepare_blueprint_retry(
    state: AssessmentState
) -> dict:

    return {
        "blueprint_retry_count": (
            state.get("blueprint_retry_count", 0) + 1
        )
    }


def missing_requirements_from_blueprint(
    state: AssessmentState,
    reason: str,
) -> list[dict]:
    missing_requirements = []

    for skill_blueprint in state.get("blueprint", []):
        skill = skill_blueprint.get("skill")
        for requirement in skill_blueprint.get("requirements", []):
            count = int(requirement.get("count", 0) or 0)
            if count <= 0:
                continue

            missing_requirements.append(
                {
                    "role": state.get("target_role"),
                    "skill": skill,
                    "difficulty": requirement.get("difficulty"),
                    "question_type": requirement.get("question_type"),
                    "required": count,
                    "retrieved": 0,
                    "retrieval_error": reason,
                }
            )

    return missing_requirements

def retrieve_assessment_questions(
    state: AssessmentState
) -> dict:
    try:
        start_time = time.perf_counter()

        retriever = QuestionRetriever()

        result = retriever.retrieve_for_blueprint(
            target_role=state["target_role"],
            blueprint=state["blueprint"],
        )

        print("\n========== QUESTION RETRIEVAL ==========")
        print("Retrieved Questions :", len(result.get("retrieved_questions", [])))
        print("Missing Requirements :", result.get("missing_requirements", []))
        print("========================================\n")

        latency_ms = (time.perf_counter() - start_time) * 1000

        metrics_registry.observe("retrieval_latency_ms", latency_ms)

        total_retrieved = len(result.get("retrieved_questions", []))

        total_missing = sum(
            item.get("required", 0) - item.get("retrieved", 0)
            for item in result.get("missing_requirements", [])
        )

        total_required = total_retrieved + max(total_missing, 0)

        if total_required > 0:
            metrics_registry.observe(
                "question_reuse_percentage",
                round((total_retrieved / total_required) * 100, 2),
            )

        return result

    except Exception as exc:
        metrics_registry.increment("retrieval_errors")
        log_event(
            logger,
            logging.ERROR,
            "question_retrieval_failed",
            error=str(exc),
        )

        return {
            "retrieved_questions": [],
            "missing_requirements": missing_requirements_from_blueprint(
                state,
                str(exc),
            ),
        }


def generate_missing_questions(
    state: AssessmentState
) -> dict:
    try:
        generated_questions = generation_service.generate_for_missing_requirements(
            missing_requirements=state.get("missing_requirements", []),
            existing_questions=state.get("retrieved_questions", []),
        )

        print("\n========== QUESTION GENERATION ==========")
        print("Generated:", len(generated_questions))
        print("=========================================\n")

    except Exception as exc:
        metrics_registry.increment("generation_errors")
        log_event(
            logger,
            logging.ERROR,
            "question_generation_failed",
            error=str(exc),
        )

        print("\n========== QUESTION GENERATION ERROR ==========")
        print(exc)
        print("===============================================\n")

        generated_questions = []

    return {
        "generated_questions": generated_questions,
        "failed_questions": [],
        "generation_retry_count": 0,
    }


def validate_generated_questions(
    state: AssessmentState
) -> dict:
    generated_questions = state.get("generated_questions", [])
    existing_questions = (
        state.get("retrieved_questions", [])
        + state.get("validated_generated_questions", [])
    )

    try:
        validation = validation_service.validate_questions(
            questions=generated_questions,
            existing_questions=existing_questions,
        )
        try:
            stored_questions = QuestionStorageService().store_questions(
                validation["valid_questions"]
            )
        except Exception as exc:
            metrics_registry.increment("storage_errors")
            log_event(
                logger,
                logging.WARNING,
                "question_storage_failed_using_unstored_questions",
                error=str(exc),
            )
            stored_questions = validation["valid_questions"]
    except Exception as exc:
        metrics_registry.increment("validation_errors")
        log_event(
            logger,
            logging.ERROR,
            "question_validation_failed",
            error=str(exc),
        )
        validation = {
            "valid_questions": [],
            "failed_questions": generated_questions,
            "validation_result": {
                "validation_result": False,
                "failed_question_indices": list(range(len(generated_questions))),
                "valid_question_indices": [],
                "validation_feedback": [],
            },
            "validation_feedback": [],
        }
        stored_questions = []
    validated_generated_questions = (
        state.get("validated_generated_questions", [])
        + stored_questions
    )

    return {
        "validated_generated_questions": validated_generated_questions,
        "failed_questions": validation["failed_questions"],
        "validation_result": validation["validation_result"],
        "validation_feedback": validation["validation_feedback"],
        "question_validation_passed": (
            len(validation["failed_questions"]) == 0
        ),
    }


def regenerate_failed_questions(
    state: AssessmentState
) -> dict:
    existing_questions = (
        state.get("retrieved_questions", [])
        + state.get("validated_generated_questions", [])
    )
    generated_questions = generation_service.regenerate_failed_questions(
        failed_questions=state.get("failed_questions", []),
        existing_questions=existing_questions,
    )

    return {
        "generated_questions": generated_questions,
        "failed_questions": [],
        "generation_retry_count": (
            state.get("generation_retry_count", 0) + 1
        ),
    }

def build_final_assessment(
    state: AssessmentState
) -> dict:

    retrieved_questions = state.get(
        "retrieved_questions",
        []
    )

    generated_questions = state.get(
        "validated_generated_questions",
        []
    )

    if not retrieved_questions and not generated_questions:
        raise RuntimeError(
            "Assessment cannot be built because no questions were retrieved or generated."
        )

    final_assessment = assessment_builder_service.build_assessment(
        assessment_name=state.get("assessment_name"),
        target_role=state["target_role"],
        blueprint=state.get("blueprint", []),
        retrieved_questions=retrieved_questions,
        generated_questions=generated_questions,
    )

    return {
        "final_assessment": final_assessment
    }
