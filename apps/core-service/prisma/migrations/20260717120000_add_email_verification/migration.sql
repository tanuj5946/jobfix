-- Add email-verification state and a single-use verification token for users.
ALTER TABLE "users"
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "email_verification_token" TEXT,
  ADD COLUMN "email_verification_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_email_verification_token_key"
  ON "users"("email_verification_token");
