-- Forward-only repair for the accidentally generated Day16 migration.
-- Every operation is schema-only and idempotent so it is safe on databases
-- where Day16 was never deployed as well as ones where it was deployed.

ALTER TABLE "recruiter_profiles"
  ALTER COLUMN "company_name" DROP NOT NULL;

ALTER TABLE "job_required_skills"
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS "job_description_analyses" (
  "id" SERIAL NOT NULL,
  "job_id" INTEGER NOT NULL,
  "required_skills" JSONB NOT NULL DEFAULT '[]',
  "preferred_skills" JSONB NOT NULL DEFAULT '[]',
  "education" TEXT,
  "responsibilities" JSONB NOT NULL DEFAULT '[]',
  "experience" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_description_analyses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "job_description_analyses_job_id_key"
  ON "job_description_analyses"("job_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_description_analyses_job_id_fkey'
  ) THEN
    ALTER TABLE "job_description_analyses"
      ADD CONSTRAINT "job_description_analyses_job_id_fkey"
      FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "applications" (
  "id" SERIAL NOT NULL,
  "job_id" INTEGER NOT NULL,
  "candidate_id" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'applied',
  "resume_match_score" DECIMAL(5,2) NOT NULL,
  "match_details_json" JSONB,
  "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "applications_job_id_candidate_id_key"
  ON "applications"("job_id", "candidate_id");
CREATE INDEX IF NOT EXISTS "idx_applications_candidate"
  ON "applications"("candidate_id");
CREATE INDEX IF NOT EXISTS "idx_applications_job"
  ON "applications"("job_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_job_id_fkey') THEN
    ALTER TABLE "applications"
      ADD CONSTRAINT "applications_job_id_fkey"
      FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_candidate_id_fkey') THEN
    ALTER TABLE "applications"
      ADD CONSTRAINT "applications_candidate_id_fkey"
      FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "application_id" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "assessments_application_id_key"
  ON "assessments"("application_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_application_id_fkey') THEN
    ALTER TABLE "assessments"
      ADD CONSTRAINT "assessments_application_id_fkey"
      FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Matches migration 20260714171154_question_bank and the Prisma schema.
ALTER TABLE "question_bank"
  ALTER COLUMN "updated_at" DROP DEFAULT;
