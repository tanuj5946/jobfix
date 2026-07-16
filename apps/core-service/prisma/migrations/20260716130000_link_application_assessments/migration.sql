ALTER TABLE "assessments"
  ADD COLUMN "application_id" INTEGER;

CREATE UNIQUE INDEX "assessments_application_id_key"
  ON "assessments"("application_id");

ALTER TABLE "assessments"
  ADD CONSTRAINT "assessments_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
