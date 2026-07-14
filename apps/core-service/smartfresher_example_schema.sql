-- ============================================================
-- SmartFresher Database Schema (PostgreSQL)
-- ============================================================

-- Enable UUID generation (optional — use if you prefer UUIDs over serial ids)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS & PROFILES
-- ============================================================

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('candidate', 'recruiter')),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_profiles (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_url          TEXT,
    resume_text         TEXT,
    parsed_resume_json  JSONB,
    target_role         VARCHAR(150),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE TABLE recruiter_profiles (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name        VARCHAR(200) NOT NULL,
    company_website     TEXT,
    industry            VARCHAR(100),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- ============================================================
-- 2. SKILLS
-- ============================================================

CREATE TABLE skills (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    category        VARCHAR(100),
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_skills (
    id                  SERIAL PRIMARY KEY,
    candidate_id        INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    skill_id            INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    source              VARCHAR(20) NOT NULL DEFAULT 'manually_added'
                        CHECK (source IN ('auto_detected', 'manually_added')),
    parse_confidence    NUMERIC(5,2),           -- confidence from resume parsing (nullable, only if auto_detected)
    verified_score      NUMERIC(5,2),           -- latest assessment score for this skill
    verified_level      VARCHAR(20) CHECK (verified_level IN ('beginner', 'intermediate', 'advanced')),
    last_assessed_at    TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (candidate_id, skill_id)
);

-- ============================================================
-- 3. ASSESSMENTS
-- ============================================================

CREATE TABLE assessments (
    id              SERIAL PRIMARY KEY,
    candidate_id    INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    assessment_name VARCHAR(200),
    target_role     VARCHAR(150),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    -- NOTE: overall/total score removed from here — single source of truth is assessment_results
);

CREATE TABLE assessment_skills (
    id              SERIAL PRIMARY KEY,
    assessment_id   INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE (assessment_id, skill_id)
);

CREATE TABLE assessment_questions (
    id              SERIAL PRIMARY KEY,
    assessment_id   INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    question_type   VARCHAR(20) NOT NULL CHECK (question_type IN ('mcq', 'coding', 'conceptual')),
    difficulty      VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    options_json    JSONB,          -- MCQ only: [{"id":"A","text":"..."}, ...]
    expected_answer TEXT,           -- MCQ correct option id / conceptual model answer
    rubric          TEXT,           -- conceptual/coding grading rubric
    test_cases_json JSONB,          -- coding only: [{"input":..., "expected_output":...}, ...]
    marks           NUMERIC(5,2) NOT NULL DEFAULT 1,
    generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_answers (
    id                  SERIAL PRIMARY KEY,
    question_id         INTEGER NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    candidate_answer    TEXT,
    score               NUMERIC(5,2),
    evaluation_json     JSONB,      -- structured AI grading output (per-criterion breakdown, etc.)
    feedback            TEXT,
    answered_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (question_id)
);

CREATE TABLE assessment_results (
    id                  SERIAL PRIMARY KEY,
    assessment_id       INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    overall_score       NUMERIC(5,2) NOT NULL,
    overall_level       VARCHAR(20) CHECK (overall_level IN ('beginner', 'intermediate', 'advanced')),
    skill_breakdown_json JSONB,     -- [{"skill_id":.., "score":.., "level":..}, ...]
    evaluation_summary  TEXT,
    generated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id)
);

-- ============================================================
-- 4. JOBS & MATCHING
-- ============================================================

CREATE TABLE jobs (
    id                  SERIAL PRIMARY KEY,
    recruiter_id        INTEGER NOT NULL REFERENCES recruiter_profiles(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'closed')),
    location            VARCHAR(150),
    work_mode           VARCHAR(20) CHECK (work_mode IN ('remote', 'hybrid', 'onsite')),
    experience_level    VARCHAR(20) CHECK (experience_level IN ('fresher', '1_2_years', '3_plus_years')),
    min_verified_level  VARCHAR(20) CHECK (min_verified_level IN ('beginner', 'intermediate', 'advanced')),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_required_skills (
    id              SERIAL PRIMARY KEY,
    job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    importance      VARCHAR(10) NOT NULL DEFAULT 'medium'
                    CHECK (importance IN ('high', 'medium', 'low')),
    UNIQUE (job_id, skill_id)
);

CREATE TABLE job_matches (
    id              SERIAL PRIMARY KEY,
    job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id    INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    match_score     NUMERIC(5,2) NOT NULL,
    ai_explanation  TEXT,
    matched_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, candidate_id)
);

-- ============================================================
-- 5. CAREER COACH
-- ============================================================

CREATE TABLE learning_recommendations (
    id              SERIAL PRIMARY KEY,
    candidate_id    INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    resource_title  VARCHAR(255) NOT NULL,
    resource_url    TEXT,
    resource_type   VARCHAR(50),        -- course / article / practice_problems / video
    priority        VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES (for common query patterns)
-- ============================================================

CREATE INDEX idx_candidate_skills_candidate ON candidate_skills(candidate_id);
CREATE INDEX idx_assessments_candidate ON assessments(candidate_id);
CREATE INDEX idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX idx_jobs_recruiter ON jobs(recruiter_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_job_matches_job ON job_matches(job_id);
CREATE INDEX idx_job_matches_candidate ON job_matches(candidate_id);
CREATE INDEX idx_learning_recommendations_candidate ON learning_recommendations(candidate_id);
-- ============================================================
-- SmartFresher Database Schema (PostgreSQL)
-- ============================================================

-- Enable UUID generation (optional — use if you prefer UUIDs over serial ids)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS & PROFILES
-- ============================================================

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('candidate', 'recruiter')),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_profiles (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_url          TEXT,
    resume_text         TEXT,
    parsed_resume_json  JSONB,
    target_role         VARCHAR(150),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE TABLE recruiter_profiles (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name        VARCHAR(200) NOT NULL,
    company_website     TEXT,
    industry            VARCHAR(100),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- ============================================================
-- 2. SKILLS
-- ============================================================

CREATE TABLE skills (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    category        VARCHAR(100),
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_skills (
    id                  SERIAL PRIMARY KEY,
    candidate_id        INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    skill_id            INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    source              VARCHAR(20) NOT NULL DEFAULT 'manually_added'
                        CHECK (source IN ('auto_detected', 'manually_added')),
    parse_confidence    NUMERIC(5,2),           -- confidence from resume parsing (nullable, only if auto_detected)
    verified_score      NUMERIC(5,2),           -- latest assessment score for this skill
    verified_level      VARCHAR(20) CHECK (verified_level IN ('beginner', 'intermediate', 'advanced')),
    last_assessed_at    TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (candidate_id, skill_id)
);

-- ============================================================
-- 3. ASSESSMENTS
-- ============================================================

CREATE TABLE assessments (
    id              SERIAL PRIMARY KEY,
    candidate_id    INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    assessment_name VARCHAR(200),
    target_role     VARCHAR(150),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    -- NOTE: overall/total score removed from here — single source of truth is assessment_results
);

CREATE TABLE assessment_skills (
    id              SERIAL PRIMARY KEY,
    assessment_id   INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE (assessment_id, skill_id)
);

CREATE TABLE assessment_questions (
    id              SERIAL PRIMARY KEY,
    assessment_id   INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    question_type   VARCHAR(20) NOT NULL CHECK (question_type IN ('mcq', 'coding', 'conceptual')),
    difficulty      VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    options_json    JSONB,          -- MCQ only: [{"id":"A","text":"..."}, ...]
    expected_answer TEXT,           -- MCQ correct option id / conceptual model answer
    rubric          TEXT,           -- conceptual/coding grading rubric
    test_cases_json JSONB,          -- coding only: [{"input":..., "expected_output":...}, ...]
    marks           NUMERIC(5,2) NOT NULL DEFAULT 1,
    generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_answers (
    id                  SERIAL PRIMARY KEY,
    question_id         INTEGER NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    candidate_answer    TEXT,
    score               NUMERIC(5,2),
    evaluation_json     JSONB,      -- structured AI grading output (per-criterion breakdown, etc.)
    feedback            TEXT,
    answered_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (question_id)
);

CREATE TABLE assessment_results (
    id                  SERIAL PRIMARY KEY,
    assessment_id       INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    overall_score       NUMERIC(5,2) NOT NULL,
    overall_level       VARCHAR(20) CHECK (overall_level IN ('beginner', 'intermediate', 'advanced')),
    skill_breakdown_json JSONB,     -- [{"skill_id":.., "score":.., "level":..}, ...]
    evaluation_summary  TEXT,
    generated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id)
);

-- ============================================================
-- 4. JOBS & MATCHING
-- ============================================================

CREATE TABLE jobs (
    id                  SERIAL PRIMARY KEY,
    recruiter_id        INTEGER NOT NULL REFERENCES recruiter_profiles(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'closed')),
    location            VARCHAR(150),
    work_mode           VARCHAR(20) CHECK (work_mode IN ('remote', 'hybrid', 'onsite')),
    experience_level    VARCHAR(20) CHECK (experience_level IN ('fresher', '1_2_years', '3_plus_years')),
    min_verified_level  VARCHAR(20) CHECK (min_verified_level IN ('beginner', 'intermediate', 'advanced')),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_required_skills (
    id              SERIAL PRIMARY KEY,
    job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    importance      VARCHAR(10) NOT NULL DEFAULT 'medium'
                    CHECK (importance IN ('high', 'medium', 'low')),
    UNIQUE (job_id, skill_id)
);

CREATE TABLE job_matches (
    id              SERIAL PRIMARY KEY,
    job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id    INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    match_score     NUMERIC(5,2) NOT NULL,
    ai_explanation  TEXT,
    matched_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, candidate_id)
);

-- ============================================================
-- 5. CAREER COACH
-- ============================================================

CREATE TABLE learning_recommendations (
    id              SERIAL PRIMARY KEY,
    candidate_id    INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    resource_title  VARCHAR(255) NOT NULL,
    resource_url    TEXT,
    resource_type   VARCHAR(50),        -- course / article / practice_problems / video
    priority        VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES (for common query patterns)
-- ============================================================

CREATE INDEX idx_candidate_skills_candidate ON candidate_skills(candidate_id);
CREATE INDEX idx_assessments_candidate ON assessments(candidate_id);
CREATE INDEX idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX idx_jobs_recruiter ON jobs(recruiter_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_job_matches_job ON job_matches(job_id);
CREATE INDEX idx_job_matches_candidate ON job_matches(candidate_id);
CREATE INDEX idx_learning_recommendations_candidate ON learning_recommendations(candidate_id);
