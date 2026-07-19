from assessment_engine.services.assessment_service import AssessmentService


class FakeGraph:
    def invoke(self, state):
        return {
            "final_assessment": {
                "title": "Backend Assessment",
                "questions": [
                    {
                        "question_id": 1,
                        "role": "Backend Developer",
                        "skill": "Python",
                        "difficulty": "easy",
                        "question_type": "mcq",
                        "question": "What does len() return?",
                        "question_text": "What does len() return?",
                        "options": [
                            "Length",
                            "Type",
                            "Memory",
                            "Index",
                        ],
                        "correct_answer": "Length",
                        "rubric": None,
                    }
                ],
            },
            "retrieved_questions": [],
            "validated_generated_questions": [],
            "missing_requirements": [],
            "skill_weights": {"Python": 1.0},
            "missing_core_skills": [],
            "blueprint": [],
        }


class FakeCoreClient:
    pass


def test_create_assessment_returns_validated_payload_without_persistence():
    service = AssessmentService(
        core_client=FakeCoreClient(),
        assessment_graph=FakeGraph(),
        conceptual_evaluation_chain=object(),
        recruiter_report_chain=object(),
        learning_recommendation_chain=object(),
    )

    result = service.create_assessment(
        candidate_id=7,
        target_role="Backend Developer",
        selected_skills=["Python"],
    )

    assert result["candidate_id"] == 7
    assert len(result["questions"]) == 1
    assert result["metadata"]["skill_weights"] == {"Python": 1.0}
