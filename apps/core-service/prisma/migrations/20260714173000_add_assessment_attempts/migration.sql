CREATE TABLE IF NOT EXISTS "assessment_attempts" (
    "id" BIGSERIAL NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "assessments"
    ADD COLUMN IF NOT EXISTS "assessment_metadata_json" JSONB;

ALTER TABLE "assessment_attempts"
    ADD CONSTRAINT "assessment_attempts_assessment_id_fkey"
    FOREIGN KEY ("assessment_id")
    REFERENCES "assessments"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "assessment_attempts"
    ADD CONSTRAINT "assessment_attempts_candidate_id_fkey"
    FOREIGN KEY ("candidate_id")
    REFERENCES "candidate_profiles"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_assessment_attempts_assessment"
    ON "assessment_attempts"("assessment_id");

CREATE INDEX IF NOT EXISTS "idx_assessment_attempts_candidate"
    ON "assessment_attempts"("candidate_id");

ALTER TABLE "assessment_answers"
    ADD COLUMN IF NOT EXISTS "attempt_id" BIGINT;

ALTER TABLE "assessment_answers"
    ADD COLUMN IF NOT EXISTS "is_correct" BOOLEAN;

ALTER TABLE "assessment_answers"
    ADD COLUMN IF NOT EXISTS "marks_awarded" DECIMAL(5,2);

DROP INDEX IF EXISTS "assessment_answers_question_id_key";

ALTER TABLE "assessment_answers"
    DROP CONSTRAINT IF EXISTS "assessment_answers_attempt_id_fkey";

ALTER TABLE "assessment_answers"
    ADD CONSTRAINT "assessment_answers_attempt_id_fkey"
    FOREIGN KEY ("attempt_id")
    REFERENCES "assessment_attempts"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_assessment_answers_attempt"
    ON "assessment_answers"("attempt_id");

CREATE UNIQUE INDEX IF NOT EXISTS "assessment_answers_attempt_id_question_id_key"
    ON "assessment_answers"("attempt_id", "question_id");

ALTER TABLE "assessment_results"
    ADD COLUMN IF NOT EXISTS "attempt_id" BIGINT;

ALTER TABLE "assessment_results"
    ADD COLUMN IF NOT EXISTS "assessment_grade" TEXT;

ALTER TABLE "assessment_results"
    ADD COLUMN IF NOT EXISTS "pass_fail" TEXT;

ALTER TABLE "assessment_results"
    ADD COLUMN IF NOT EXISTS "confidence_score" DECIMAL(5,2);

ALTER TABLE "assessment_results"
    ADD COLUMN IF NOT EXISTS "recruiter_report_json" JSONB;

ALTER TABLE "assessment_results"
    ADD COLUMN IF NOT EXISTS "learning_recommendations_json" JSONB;

ALTER TABLE "assessment_results"
    ADD COLUMN IF NOT EXISTS "prompt_versions_json" JSONB;

ALTER TABLE "assessment_results"
    DROP CONSTRAINT IF EXISTS "assessment_results_attempt_id_fkey";

ALTER TABLE "assessment_results"
    ADD CONSTRAINT "assessment_results_attempt_id_fkey"
    FOREIGN KEY ("attempt_id")
    REFERENCES "assessment_attempts"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
