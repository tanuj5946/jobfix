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


class FakeRepository:
    def __init__(self):
        self.created = None

    def create_assessment(
        self,
        *,
        candidate_id,
        role,
        title,
        questions,
        metadata=None,
    ):
        self.created = {
            "candidate_id": candidate_id,
            "role": role,
            "title": title,
            "questions": questions,
            "metadata": metadata,
        }
        return {
            "id": 101,
            "candidate_id": candidate_id,
            "target_role": role,
            "assessment_name": title,
            "created_at": None,
            "questions": [
                {
                    "question_id": 201,
                    "question_type": "mcq",
                    "skill": "Python",
                    "difficulty": "easy",
                    "question": "What does len() return?",
                    "options": [
                        "Length",
                        "Type",
                        "Memory",
                        "Index",
                    ],
                    "correct_answer": "Length",
                    "rubric": None,
                    "marks": 1,
                }
            ],
        }


def test_create_assessment_uses_graph_and_repository_without_external_services():
    repository = FakeRepository()
    service = AssessmentService(
        repository=repository,
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

    assert result["assessment_id"] == 101
    assert result["candidate_id"] == 7
    assert result["total_questions"] == 1
    assert repository.created["metadata"]["skill_weights"] == {"Python": 1.0}
