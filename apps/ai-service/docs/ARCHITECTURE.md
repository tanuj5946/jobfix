# AI Service Architecture

```text
Resume Parser
  -> Skill Relevance
  -> Skill Weighting
  -> Assessment Blueprint
  -> Blueprint Validator
  -> Hybrid RAG Retrieval
  -> Missing Question Generation
  -> Question Validation
  -> Assessment Builder
  -> Return Processed Result to Core
  -> Submission
  -> MCQ Evaluation
  -> Conceptual Evaluation
  -> Skill Aggregation
  -> Recruiter Report
  -> Learning Recommendations
```

## Folders

- `assessment_engine/chains`: LangChain prompt/model/parser chains.
- `assessment_engine/graph`: LangGraph orchestration.
- `assessment_engine/prompts`: prompt text and prompt version registry.
- `assessment_engine/schemas`: Pydantic contracts.
- `assessment_engine/services`: business logic and orchestration helpers.
- `retrieval`: embedding and Core-backed question retrieval.
- `question_bank`: question generation and API schemas.
- `shared`: LLM, cache, errors, security, and observability utilities.

## Production Hardening

- Structured request logging with request IDs.
- Central exception handlers.
- TTL caches for LLM and question retrieval.
- Prompt version persistence in results.
- Metrics endpoint for latency and cache ratios.
- Input validation for user-controlled strings.
- Deterministic MCQ evaluation and structured LLM conceptual evaluation.
