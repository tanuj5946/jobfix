"""
JobFix — ai-service
FastAPI application entry point.

Currently implemented:
  POST /parse-resume   → resume parsing + skill extraction (real LLM)
  GET  /health         → liveness probe

All other ai-service capabilities (question generation, grading,
match explanation, improvement plan) will be added here incrementally.
"""

import os
import tempfile
import logging
import asyncio
import time

from fastapi import FastAPI, File, Query, Request, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from resume_parser import ResumeParser
from resume_parser.schemas.resume_schema import ExtractedSkill
from assessment_engine.graph.assessment_graph import build_assessment_graph
from assessment_engine.graph.evaluation_graph import build_evaluation_graph
from assessment_engine.graph.job_analysis_graph import build_job_analysis_graph
from assessment_engine.schemas.job_description_analysis_schema import (
    JobDescriptionAnalysisRequest,
)
from assessment_engine.schemas.assessment_submission_schema import (
    AssessmentCreateRequest,
    AssessmentEvaluateRequest,
    AssessmentSubmitRequest,
)
from assessment_engine.schemas.question_generation_schema import (
    AssessmentGenerationRequest,
    AssessmentValidationRequest,
    QuestionGenerationRequest,
    QuestionValidationRequest,
)
from assessment_engine.services.question_generation_service import (
    QuestionGenerationService,
)
from assessment_engine.services.assessment_service import AssessmentService
from assessment_engine.services.question_storage_service import (
    QuestionStorageService,
)
from assessment_engine.services.question_validation_service import (
    QuestionValidationService,
)
from retrieval.question_bank_client import QuestionBankClient
from question_bank.generator.service import (
    question_generator_service as question_bank_generator_service,
)
from question_bank.schemas import (
    BulkQuestionCreate,
    QuestionCreate,
    QuestionResponse,
)
from retrieval.embedding_service import EmbeddingService
from shared.errors import AIServiceError, ValidationError
from shared.observability import (
    RequestContextMiddleware,
    get_request_id,
    metrics_registry,
)
from shared.security import validate_text, validate_text_list

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="JobFix AI Service",
    description="AI-powered resume parsing, skill extraction, and assessment engine.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # core-service only — restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestContextMiddleware)


@app.exception_handler(AIServiceError)
async def ai_service_exception_handler(
    request: Request,
    exc: AIServiceError,
):
    logger.error(
        "handled_ai_service_error | %s",
        {
            "request_id": get_request_id(),
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
        },
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "request_id": get_request_id(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    logger.error(
        "unhandled_error | %s",
        {
            "request_id": get_request_id(),
            "error": str(exc),
        },
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "The AI service could not complete the request.",
            "request_id": get_request_id(),
        },
    )

# ── Singleton parser (loads LLM once at startup) ──────────────────────────────
parser = ResumeParser()
embedding_service = EmbeddingService()
assessment_graph = build_assessment_graph()
evaluation_graph = build_evaluation_graph()
job_analysis_graph = build_job_analysis_graph()
assessment_service = AssessmentService(
    assessment_graph=assessment_graph
)
question_generation_service = QuestionGenerationService()
question_validation_service = QuestionValidationService()


# ── Response schemas ──────────────────────────────────────────────────────────

class PersonalInfoResponse(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    github: str | None = None
    linkedin: str | None = None


class ParsedResumeResponse(BaseModel):
    """
    Response contract consumed by core-service AiServiceClient.parseResume().
    All fields must stay stable — changing them requires updating core-service too.
    """
    personal_info: PersonalInfoResponse
    skills: list[ExtractedSkill]           # [{name, confidence}]
    target_role_guess: str | None          # first entry from target_roles, or None
    experience: list
    education: list
    summary: str | None


class QuestionBankSeedRequest(BaseModel):
    role: str = "Software Developer"
    skills: list[str]
    count_per_skill: int = 10


def get_question_bank_client() -> QuestionBankClient:
    try:
        return QuestionBankClient()
    except AIServiceError:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Question bank is not configured: {str(exc)}",
        )


def build_question_embedding(question: QuestionCreate) -> list[float]:
    if question.embedding:
        return question.embedding

    return embedding_service.embed_question(
        question_text=question.question_text,
        role=question.role,
        skill=question.skill,
        difficulty=question.difficulty,
        question_type=question.question_type,
        tags=question.tags,
    )


def validate_and_store_generated_questions(
    questions: list[dict],
    existing_questions: list[dict | str],
) -> dict:
    validation = question_validation_service.validate_questions(
        questions=questions,
        existing_questions=existing_questions,
    )
    stored_questions = QuestionStorageService().store_questions(
        validation["valid_questions"]
    )

    return {
        **validation,
        "stored_questions": stored_questions,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service", "version": "0.1.0"}


@app.get("/status")
def status():
    return {
        "status": "ready",
        "service": "ai-service",
        "version": "0.1.0",
        "core_api_configured": bool(os.getenv("CORE_API_URL") and os.getenv("INTERNAL_API_KEY")),
    }


@app.get("/metrics")
def metrics():
    return metrics_registry.snapshot()


@app.post("/parse-resume", response_model=ParsedResumeResponse)
async def parse_resume(file: UploadFile = File(...)):
    """
    Accept a PDF or DOCX resume, parse it with LLM, and return structured data.

    Called by core-service POST /candidates/me/resume.
    Never called directly by the frontend.
    """
    # Validate MIME type
    allowed_types = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Upload PDF or DOCX.",
        )

    # Determine temp file extension from original filename or content type
    suffix = ".pdf"
    if file.filename and file.filename.endswith(".docx"):
        suffix = ".docx"
    elif file.content_type and "wordprocessingml" in file.content_type:
        suffix = ".docx"

    # Write to a temp file so the existing file-path-based parser can process it
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        logger.info(f"Parsing resume: {file.filename!r} ({len(content)} bytes)")

        result: dict = await asyncio.to_thread(parser.parse, tmp_path)

        logger.info(
            f"Parsed successfully — {len(result.get('skills', []))} skills, "
            f"target_roles={result.get('target_roles', [])}"
        )

    except AIServiceError:
        raise
    except Exception as exc:
        logger.error(f"Resume parsing failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(exc)}")

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # ── Map parser output → API response ──────────────────────────────────────
    personal_raw = result.get("personal_info", {}) or {}

    # target_role_guess: first inferred role, or None
    target_roles: list = result.get("target_roles") or []
    target_role_guess = target_roles[0] if target_roles else None

    # skills: the schema now returns list[dict] from model_dump()
    raw_skills: list = result.get("skills") or []
    skills = [
        ExtractedSkill(
            name=s.get("name", ""),
            confidence=float(s.get("confidence", 0.5)),
        )
        for s in raw_skills
        if isinstance(s, dict) and s.get("name")
    ]

    return ParsedResumeResponse(
        personal_info=PersonalInfoResponse(**{
            k: personal_raw.get(k) for k in PersonalInfoResponse.model_fields
        }),
        skills=skills,
        target_role_guess=target_role_guess,
        experience=result.get("experience") or [],
        education=result.get("education") or [],
        summary=result.get("summary"),
    )


@app.post("/resume/parse", response_model=ParsedResumeResponse)
async def parse_resume_alias(file: UploadFile = File(...)):
    return await parse_resume(file)


@app.post("/assessment/generate")
async def generate_assessment(payload: AssessmentGenerationRequest):
    try:
        validate_text(payload.target_role, field_name="target_role")
        validate_text_list(payload.selected_skills, field_name="selected_skills")
        start_time = time.perf_counter()
        initial_state = {
            "target_role": payload.target_role,
            "selected_skills": payload.selected_skills,
            "retry_count": 0,
            "generation_retry_count": 0,
            "validated_generated_questions": [],
        }
        result = await asyncio.to_thread(
            assessment_graph.invoke,
            initial_state,
        )
        metrics_registry.observe(
            "assessment_generation_time_ms",
            (time.perf_counter() - start_time) * 1000,
        )
        return result
    except AIServiceError:
        raise
    except Exception as exc:
        logger.error(f"Assessment generation failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Assessment generation failed: {str(exc)}",
        )


@app.post("/jobs/analyze-description")
async def analyze_job_description(payload: JobDescriptionAnalysisRequest):
    """Extract structured recruiter-facing requirements from a stored job description."""
    try:
        validate_text(payload.title, field_name="title")
        validate_text(payload.description, field_name="description")
        return await asyncio.to_thread(
            job_analysis_graph.invoke,
            {"title": payload.title, "description": payload.description},
        )
    except AIServiceError:
        raise
    except Exception as exc:
        logger.error("Job description analysis failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Job description analysis failed: {str(exc)}",
        )


@app.post("/assessment/create")
async def create_assessment(payload: AssessmentCreateRequest):
    raise HTTPException(status_code=410, detail="Create assessments through the Core API")


@app.post("/assessment/validate")
async def validate_assessment(payload: AssessmentValidationRequest):
    try:
        return await asyncio.to_thread(
            validate_and_store_generated_questions,
            [question.model_dump() for question in payload.questions],
            payload.existing_questions,
        )
    except AIServiceError:
        raise
    except Exception as exc:
        logger.error(f"Assessment validation failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Assessment validation failed: {str(exc)}",
        )


@app.post("/assessment/submit")
async def submit_assessment(payload: AssessmentSubmitRequest):
    raise HTTPException(status_code=410, detail="Submit assessments through the Core API")


@app.post("/assessment/evaluate")
async def evaluate_assessment(payload: AssessmentEvaluateRequest):
    try:
        result = await asyncio.to_thread(
            assessment_service.evaluate_assessment,
            assessment_id=payload.assessment_id,
            attempt_id=payload.attempt_id,
        )
        return {
            "submission_id": payload.attempt_id,
            "assessment_id": payload.assessment_id,
            "candidate_id": payload.candidate_id,
            "result": result,
        }
    except AIServiceError:
        raise
    except Exception as exc:
        logger.error(f"Assessment evaluation failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Assessment evaluation failed: {str(exc)}",
        )


@app.get("/assessment/result/{assessment_id}")
async def get_assessment_result(assessment_id: int):
    result = await asyncio.to_thread(
        assessment_service.load_result,
        assessment_id,
    )
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Assessment result not found",
        )
    return result


@app.get("/assessment/report/{assessment_id}")
async def get_assessment_report(assessment_id: int):
    report = await asyncio.to_thread(
        assessment_service.load_report,
        assessment_id,
    )
    if not report:
        raise HTTPException(
            status_code=404,
            detail="Assessment report not found",
        )
    return report


@app.get("/candidate/{candidate_id}/history")
async def get_candidate_history(candidate_id: int):
    return await asyncio.to_thread(
        assessment_service.candidate_history,
        candidate_id,
    )


@app.get("/assessment/{assessment_id}")
async def get_assessment(assessment_id: int):
    assessment = await asyncio.to_thread(
        assessment_service.load_assessment,
        assessment_id,
    )
    if not assessment:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found",
        )
    return assessment


@app.post("/questions/generate")
async def generate_questions(payload: QuestionGenerationRequest):
    try:
        validate_text(payload.role, field_name="role")
        validate_text(payload.skill, field_name="skill")
        validate_text(payload.difficulty, field_name="difficulty")
        generated_questions = await asyncio.to_thread(
            question_generation_service.generate_questions,
            role=payload.role,
            skill=payload.skill,
            difficulty=payload.difficulty,
            question_type=payload.question_type,
            count=payload.count,
            existing_questions=payload.existing_questions,
        )
        return {
            "generated_questions": generated_questions
        }
    except Exception as exc:
        logger.error(f"Question generation failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Question generation failed: {str(exc)}",
        )


@app.post("/questions/seed")
async def seed_question_bank(payload: QuestionBankSeedRequest):
    """Generate and store question-bank questions for one or more skills."""
    validate_text(payload.role, field_name="role")
    validate_text_list(payload.skills, field_name="skills")
    if not 1 <= payload.count_per_skill <= 25:
        raise ValidationError("count_per_skill must be between 1 and 25")

    results = []
    for skill in dict.fromkeys(payload.skills):
        stats = await asyncio.to_thread(
            question_bank_generator_service.generate,
            role=payload.role,
            skill=skill,
            count=payload.count_per_skill,
        )
        results.append({"skill": skill, **stats})

    return {
        "role": payload.role,
        "results": results,
        "generated": sum(item["generated"] for item in results),
        "prepared": sum(item["prepared"] for item in results),
        "failed": sum(item["failed"] for item in results),
    }


@app.post("/questions/validate")
async def validate_questions(payload: QuestionValidationRequest):
    try:
        return await asyncio.to_thread(
            validate_and_store_generated_questions,
            [question.model_dump() for question in payload.questions],
            payload.existing_questions,
        )
    except Exception as exc:
        logger.error(f"Question validation failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Question validation failed: {str(exc)}",
        )


@app.post("/questions", response_model=QuestionResponse, status_code=201)
def create_question(question: QuestionCreate):
    return {**question.model_dump(), "embedding": build_question_embedding(question)}


@app.post("/questions/bulk", response_model=list[QuestionResponse], status_code=201)
def create_questions_bulk(payload: BulkQuestionCreate):
    return [{**question.model_dump(), "embedding": build_question_embedding(question)} for question in payload.questions]


@app.get("/questions/search", response_model=list[QuestionResponse])
def search_questions(
    role: str | None = Query(default=None),
    skill: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    question_type: str | None = Query(default=None),
    query_text: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
):
    question_bank_client = get_question_bank_client()

    try:
        if query_text:
            embedding = embedding_service.embed_text(query_text)
            return question_bank_client.hybrid_search(
                embedding=embedding,
                role=role,
                skill=skill,
                difficulty=difficulty,
                question_type=question_type,
                limit=limit,
            )

        return question_bank_client.search_by_metadata(
            role=role,
            skill=skill,
            difficulty=difficulty,
            question_type=question_type,
            limit=limit,
        )
    except Exception as exc:
        logger.error(f"Question search failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Question search failed: {str(exc)}",
        )


@app.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: int):
    raise HTTPException(status_code=410, detail="Question deletion is owned by the Core API")
