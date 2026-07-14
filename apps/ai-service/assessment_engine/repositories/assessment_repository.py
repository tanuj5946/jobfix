from typing import Any

from retrieval.vector_store import VectorStore


class AssessmentRepository:
    def __init__(self, vector_store: VectorStore | None = None):
        self.vector_store = vector_store or VectorStore()

    def create_assessment(
        self,
        *,
        candidate_id: int,
        role: str,
        title: str,
        questions: list[dict[str, Any]],
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                cur.execute(
                    """
                    INSERT INTO assessments (
                        candidate_id,
                        assessment_name,
                        target_role,
                        status,
                        assessment_metadata_json
                    )
                    VALUES (%s, %s, %s, 'pending', %s)
                    RETURNING *
                    """,
                    (
                        candidate_id,
                        title,
                        role,
                        self._jsonb(metadata or {}),
                    ),
                )
                assessment = dict(cur.fetchone())

                skill_ids = set()
                stored_questions = []
                for question in questions:
                    skill_id = self._ensure_skill(
                        cur,
                        question["skill"],
                    )
                    skill_ids.add(skill_id)
                    stored_questions.append(
                        self._insert_question(
                            cur,
                            assessment["id"],
                            skill_id,
                            question,
                        )
                    )

                for skill_id in skill_ids:
                    cur.execute(
                        """
                        INSERT INTO assessment_skills (
                            assessment_id,
                            skill_id
                        )
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (assessment["id"], skill_id),
                    )

            conn.commit()

        assessment["questions"] = stored_questions
        return assessment

    def load_assessment(
        self,
        assessment_id: int,
    ) -> dict[str, Any] | None:
        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                cur.execute(
                    "SELECT * FROM assessments WHERE id = %s",
                    (assessment_id,),
                )
                row = cur.fetchone()
                if not row:
                    return None

                assessment = dict(row)
                assessment["questions"] = self._load_questions(
                    cur,
                    assessment_id,
                )
                return assessment

    def create_attempt(
        self,
        *,
        assessment_id: int,
        candidate_id: int,
        answers: list[dict[str, Any]],
    ) -> dict[str, Any]:
        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                cur.execute(
                    """
                    INSERT INTO assessment_attempts (
                        assessment_id,
                        candidate_id,
                        status,
                        submitted_at
                    )
                    VALUES (%s, %s, 'submitted', NOW())
                    RETURNING *
                    """,
                    (assessment_id, candidate_id),
                )
                attempt = dict(cur.fetchone())

                for answer in answers:
                    cur.execute(
                        """
                        INSERT INTO assessment_answers (
                            attempt_id,
                            question_id,
                            candidate_answer
                        )
                        VALUES (%s, %s, %s)
                        ON CONFLICT (attempt_id, question_id)
                        DO UPDATE SET
                            candidate_answer = EXCLUDED.candidate_answer,
                            answered_at = NOW()
                        """,
                        (
                            attempt["id"],
                            answer["question_id"],
                            answer["candidate_answer"],
                        ),
                    )

                cur.execute(
                    """
                    UPDATE assessments
                    SET status = 'completed',
                        completed_at = NOW()
                    WHERE id = %s
                    """,
                    (assessment_id,),
                )

            conn.commit()

        return attempt

    def load_attempt(
        self,
        attempt_id: int,
    ) -> dict[str, Any] | None:
        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                cur.execute(
                    "SELECT * FROM assessment_attempts WHERE id = %s",
                    (attempt_id,),
                )
                row = cur.fetchone()
                if not row:
                    return None

                attempt = dict(row)
                cur.execute(
                    """
                    SELECT
                        aa.*,
                        aq.question_text,
                        aq.question_type,
                        aq.difficulty,
                        aq.options_json,
                        aq.expected_answer,
                        aq.rubric,
                        aq.marks,
                        s.name AS skill
                    FROM assessment_answers aa
                    JOIN assessment_questions aq
                        ON aq.id = aa.question_id
                    JOIN skills s
                        ON s.id = aq.skill_id
                    WHERE aa.attempt_id = %s
                    ORDER BY aq.id
                    """,
                    (attempt_id,),
                )
                attempt["answers"] = [
                    dict(answer)
                    for answer in cur.fetchall()
                ]
                return attempt

    def update_answer_evaluation(
        self,
        *,
        answer_id: int,
        score: float,
        evaluation_json: dict[str, Any],
        feedback: str | None,
        is_correct: bool | None,
        marks_awarded: float,
    ) -> None:
        with self.vector_store.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE assessment_answers
                    SET score = %s,
                        evaluation_json = %s,
                        feedback = %s,
                        is_correct = %s,
                        marks_awarded = %s
                    WHERE id = %s
                    """,
                    (
                        score,
                        self._jsonb(evaluation_json),
                        feedback,
                        is_correct,
                        marks_awarded,
                        answer_id,
                    ),
                )
            conn.commit()

    def save_result(
        self,
        *,
        assessment_id: int,
        attempt_id: int,
        result: dict[str, Any],
    ) -> dict[str, Any]:
        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                cur.execute(
                    """
                    INSERT INTO assessment_results (
                        assessment_id,
                        attempt_id,
                        overall_score,
                        overall_level,
                        skill_breakdown_json,
                        evaluation_summary,
                        assessment_grade,
                        pass_fail,
                        confidence_score,
                        recruiter_report_json,
                        learning_recommendations_json,
                        prompt_versions_json
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (assessment_id)
                    DO UPDATE SET
                        attempt_id = EXCLUDED.attempt_id,
                        overall_score = EXCLUDED.overall_score,
                        overall_level = EXCLUDED.overall_level,
                        skill_breakdown_json = EXCLUDED.skill_breakdown_json,
                        evaluation_summary = EXCLUDED.evaluation_summary,
                        assessment_grade = EXCLUDED.assessment_grade,
                        pass_fail = EXCLUDED.pass_fail,
                        confidence_score = EXCLUDED.confidence_score,
                        recruiter_report_json = EXCLUDED.recruiter_report_json,
                        learning_recommendations_json = EXCLUDED.learning_recommendations_json,
                        prompt_versions_json = EXCLUDED.prompt_versions_json,
                        generated_at = NOW()
                    RETURNING *
                    """,
                    (
                        assessment_id,
                        attempt_id,
                        result["overall_score"],
                        result["overall_level"],
                        self._jsonb(result["skill_breakdown"]),
                        result["evaluation_summary"],
                        result["assessment_grade"],
                        result["pass_fail"],
                        result["confidence_score"],
                        self._jsonb(result["recruiter_report"]),
                        self._jsonb(result["learning_recommendations"]),
                        self._jsonb(result["prompt_versions"]),
                    ),
                )
                saved = dict(cur.fetchone())
            conn.commit()

        return saved

    def load_result(
        self,
        assessment_id: int,
    ) -> dict[str, Any] | None:
        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM assessment_results
                    WHERE assessment_id = %s
                    """,
                    (assessment_id,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def load_candidate_history(
        self,
        candidate_id: int,
    ) -> list[dict[str, Any]]:
        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                cur.execute(
                    """
                    SELECT
                        a.*,
                        ar.overall_score,
                        ar.assessment_grade,
                        ar.pass_fail,
                        ar.generated_at AS result_generated_at
                    FROM assessments a
                    LEFT JOIN assessment_results ar
                        ON ar.assessment_id = a.id
                    WHERE a.candidate_id = %s
                    ORDER BY a.created_at DESC
                    """,
                    (candidate_id,),
                )
                return [
                    dict(row)
                    for row in cur.fetchall()
                ]

    def save_learning_recommendations(
        self,
        *,
        candidate_id: int,
        recommendations: list[dict[str, Any]],
    ) -> None:
        with self.vector_store.connection() as conn:
            with conn.cursor(row_factory=self._dict_row()) as cur:
                for recommendation in recommendations:
                    skill_id = self._ensure_skill(
                        cur,
                        recommendation["skill"],
                    )
                    cur.execute(
                        """
                        INSERT INTO learning_recommendations (
                            candidate_id,
                            skill_id,
                            resource_title,
                            resource_url,
                            resource_type,
                            priority
                        )
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            candidate_id,
                            skill_id,
                            recommendation["resource_title"],
                            recommendation.get("resource_url"),
                            recommendation.get("resource_type"),
                            recommendation.get("priority", "medium"),
                        ),
                    )
            conn.commit()

    def _ensure_skill(
        self,
        cur,
        skill_name: str,
    ) -> int:
        cur.execute(
            """
            INSERT INTO skills (name, updated_at)
            VALUES (%s, NOW())
            ON CONFLICT (name)
            DO UPDATE SET updated_at = skills.updated_at
            RETURNING id
            """,
            (skill_name,),
        )
        return int(cur.fetchone()["id"])

    def _insert_question(
        self,
        cur,
        assessment_id: int,
        skill_id: int,
        question: dict[str, Any],
    ) -> dict[str, Any]:
        cur.execute(
            """
            INSERT INTO assessment_questions (
                assessment_id,
                skill_id,
                question_text,
                question_type,
                difficulty,
                options_json,
                expected_answer,
                rubric,
                marks,
                generated_by_ai
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                assessment_id,
                skill_id,
                question["question_text"],
                question["question_type"],
                question.get("difficulty"),
                self._jsonb(question.get("options")) if question.get("options") is not None else None,
                question.get("correct_answer"),
                self._rubric_text(question.get("rubric")),
                self._marks(question.get("question_type")),
                question.get("id") is None,
            ),
        )
        stored = dict(cur.fetchone())
        return {
            "question_id": stored["id"],
            "question_type": stored["question_type"],
            "skill": question["skill"],
            "difficulty": stored["difficulty"],
            "question": stored["question_text"],
            "options": stored["options_json"],
            "correct_answer": stored["expected_answer"],
            "rubric": question.get("rubric"),
            "marks": float(stored["marks"]),
        }

    def _load_questions(
        self,
        cur,
        assessment_id: int,
    ) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                aq.*,
                s.name AS skill
            FROM assessment_questions aq
            JOIN skills s
                ON s.id = aq.skill_id
            WHERE aq.assessment_id = %s
            ORDER BY aq.id
            """,
            (assessment_id,),
        )
        return [
            {
                "question_id": row["id"],
                "question_type": row["question_type"],
                "skill": row["skill"],
                "difficulty": row["difficulty"],
                "question": row["question_text"],
                "options": row["options_json"],
                "correct_answer": row["expected_answer"],
                "rubric": row["rubric"],
                "marks": float(row["marks"]),
            }
            for row in cur.fetchall()
        ]

    def _rubric_text(
        self,
        rubric: Any,
    ) -> str | None:
        if rubric is None:
            return None
        if isinstance(rubric, str):
            return rubric
        return str(rubric)

    def _marks(
        self,
        question_type: str | None,
    ) -> float:
        if question_type == "conceptual":
            return 2.0
        return 1.0

    def _dict_row(self):
        try:
            from psycopg.rows import dict_row
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "psycopg is not installed. Run `pip install -r requirements.txt` "
                "inside apps/ai-service before using database-backed features."
            ) from exc

        return dict_row

    def _jsonb(self, value: Any):
        try:
            from psycopg.types.json import Jsonb
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "psycopg is not installed. Run `pip install -r requirements.txt` "
                "inside apps/ai-service before using database-backed features."
            ) from exc

        return Jsonb(value)
