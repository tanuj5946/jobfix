# Developer Guide

## Local Setup

Install dependencies from `requirements.txt`, configure `.env`, and run the service with Uvicorn.

## Adding Prompts

Add prompt files under `assessment_engine/prompts` and register the prompt in `assessment_engine/prompts/registry.py`. Persisted assessment results include prompt versions for auditability.

## Adding Metrics

Use `metrics_registry.increment(name)` for counters and `metrics_registry.observe(name, milliseconds)` for timings. Metrics are exposed through `GET /metrics`.

## Adding Validation

Use `shared.errors.ValidationError` for user-correctable failures. FastAPI returns structured `422` responses for these errors.

## Tests

Tests live in `apps/ai-service/tests`. External services should be mocked or replaced with fakes.
