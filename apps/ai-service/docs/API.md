# API Documentation

## Operations

- `GET /health`: returns service liveness.
- `GET /status`: returns readiness and configuration state.
- `GET /metrics`: returns in-process counters and timing aggregates.
- `POST /parse-resume`: accepts PDF/DOCX upload and returns parsed resume data.
- `POST /assessment/generate`: generates an assessment without persistence.
- `POST /assessment/create`: generates and stores an assessment.
- `GET /assessment/{assessment_id}`: loads a stored assessment.
- `POST /assessment/submit`: stores answers, evaluates them, and returns `submission_id`.
- `GET /assessment/result/{assessment_id}`: returns the latest stored result.
- `GET /assessment/report/{assessment_id}`: returns recruiter report JSON.
- `GET /candidate/{candidate_id}/history`: returns candidate assessment history.
- `POST /questions`: inserts one question-bank item.
- `POST /questions/bulk`: inserts question-bank items.
- `GET /questions/search`: searches by metadata or hybrid query.
- `DELETE /questions/{question_id}`: deletes one question-bank item.

## Error Shape

```json
{
  "error": "validation_error",
  "message": "Submission answers cannot be empty",
  "details": {},
  "request_id": "..."
}
```
