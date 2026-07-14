# Folder Structure

```text
apps/ai-service
  assessment_engine/
    chains/          LangChain chains
    graph/           LangGraph workflows
    prompts/         Prompt text and version registry
    repositories/    Database persistence
    schemas/         Pydantic request/response/domain models
    services/        Business logic and orchestration
  question_bank/     Question-bank schemas and repository
  retrieval/         Embeddings, vector store, RAG retrieval
  resume_parser/     Existing resume parser
  shared/
    cache/           TTL caches
    errors/          Typed service exceptions
    llm/             Shared LLM factory
    observability/   Structured logging and metrics
    security/        Input validation
  tests/             Unit and service tests
```
