-- DropIndex
DROP INDEX "idx_question_bank_embedding";

-- DropIndex
DROP INDEX "idx_question_bank_tags";

-- AlterTable
ALTER TABLE "question_bank" ALTER COLUMN "updated_at" DROP DEFAULT;
