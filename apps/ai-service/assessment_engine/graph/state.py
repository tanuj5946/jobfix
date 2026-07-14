from typing import TypedDict


class AssessmentState(TypedDict, total=False):
    target_role: str
    selected_skills: list[str]

    relevant_skills: list[str]
    secondary_skills: list[str]
    irrelevant_skills: list[str]
    missing_core_skills: list[str]

    skill_analysis_reasoning: str

    skill_weights: dict[str, float]
    skill_weight_reasons: dict[str, str]
    weighting_summary: str

    assessment_name: str
    blueprint: list[dict]
    blueprint_summary: str
        
    blueprint_valid: bool
    blueprint_errors: list[str]
    blueprint_retry_count: int
    
    mcq_questions: list
    conceptual_questions: list
    retrieved_questions: list
    missing_requirements: list
    generated_questions: list
    validated_generated_questions: list
    failed_questions: list

    validation_result: dict
    validation_feedback: list
    retry_count: int
    generation_retry_count: int
    question_validation_passed: bool

    final_assessment: dict
