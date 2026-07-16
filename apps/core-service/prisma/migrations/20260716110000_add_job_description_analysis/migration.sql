ALTER TABLE "job_required_skills"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

CREATE TABLE "job_description_analyses" (
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

CREATE UNIQUE INDEX "job_description_analyses_job_id_key"
  ON "job_description_analyses"("job_id");

ALTER TABLE "job_description_analyses"
  ADD CONSTRAINT "job_description_analyses_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
