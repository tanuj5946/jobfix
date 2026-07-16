CREATE TABLE "applications" (
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

CREATE UNIQUE INDEX "applications_job_id_candidate_id_key"
  ON "applications"("job_id", "candidate_id");
CREATE INDEX "idx_applications_candidate" ON "applications"("candidate_id");
CREATE INDEX "idx_applications_job" ON "applications"("job_id");

ALTER TABLE "applications"
  ADD CONSTRAINT "applications_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applications"
  ADD CONSTRAINT "applications_candidate_id_fkey"
  FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
