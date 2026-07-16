-- A recruiter profile remains the owner of company data. Making the name
-- nullable allows an unused company to be deleted without deleting the
-- recruiter account itself.
ALTER TABLE "recruiter_profiles"
  ALTER COLUMN "company_name" DROP NOT NULL;
