CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "question_bank" (
    "id" BIGSERIAL NOT NULL,
    "role" VARCHAR(150) NOT NULL,
    "skill" VARCHAR(100) NOT NULL,
    "category" VARCHAR(100),
    "difficulty" VARCHAR(50) NOT NULL,
    "question_type" VARCHAR(50) NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" TEXT,
    "rubric" JSONB,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "embedding" vector(384) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_question_bank_metadata"
    ON "question_bank" ("role", "skill", "difficulty", "question_type");

CREATE INDEX IF NOT EXISTS "idx_question_bank_tags"
    ON "question_bank" USING GIN ("tags");

CREATE INDEX IF NOT EXISTS "idx_question_bank_embedding"
    ON "question_bank" USING ivfflat ("embedding" vector_cosine_ops)
    WITH (lists = 100);

CREATE OR REPLACE FUNCTION set_question_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated_at" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_question_bank_updated_at" ON "question_bank";

CREATE TRIGGER "trg_question_bank_updated_at"
BEFORE UPDATE ON "question_bank"
FOR EACH ROW
EXECUTE FUNCTION set_question_bank_updated_at();
