# SmartFresher AI Service

The AI service owns resume parsing, assessment generation, question retrieval/generation, answer evaluation, recruiter reports, and learning recommendations.

## Runtime Endpoints

- `GET /health`: liveness check.
- `GET /status`: readiness and dependency configuration.
- `GET /metrics`: in-process counters and latency averages.
- `POST /parse-resume`: parse a PDF/DOCX resume.
- `POST /assessment/create`: generate and persist an assessment.
- `GET /assessment/{assessment_id}`: load an assessment.
- `POST /assessment/submit`: submit answers and trigger evaluation.
- `GET /assessment/result/{assessment_id}`: load evaluation result.
- `GET /assessment/report/{assessment_id}`: load recruiter report.
- `GET /candidate/{candidate_id}/history`: load assessment history.
- `POST /questions`, `POST /questions/bulk`, `GET /questions/search`, `DELETE /questions/{id}`: manage question bank.

## Observability

Each request receives a `request_id`; callers may pass `x-request-id`. Logs include request metadata and key latency fields. `/metrics` exposes cache hits, cache misses, graph timings, retrieval latency, generation latency, evaluation latency, question reuse percentage, and average scores.

## Prompt Versioning

Prompt versions live in `assessment_engine/prompts/registry.py`. Assessment results persist `prompt_versions_json` so evaluation output can be reproduced and audited.

## Caching

The service uses in-process TTL caches for repeated LLM calls and frequently retrieved question-bank searches. Cache expiration and capacity are configured in `shared/cache/ttl_cache.py`.

## Deployment

1. Configure `GROQ_API_KEY`.
2. Configure `AI_DATABASE_URL` or `DATABASE_URL`.
3. Apply Prisma migrations from `apps/core-service`.
4. Install `apps/ai-service/requirements.txt`.
5. Run with Uvicorn.

```powershell
cd D:\jobfix\apps\core-service
npm.cmd run db:migrate

cd D:\jobfix\apps\ai-service
venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000
```
