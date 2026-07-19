# Deployment Guide

## Required Environment

- `GROQ_API_KEY`
- `CORE_API_URL`
- `INTERNAL_API_KEY`

## Core-owned data

The Core service owns the shared PostgreSQL schema and is the only service that connects to it. The AI service communicates with Core through its authenticated internal HTTP API.

```powershell
cd D:\jobfix\apps\core-service
npm.cmd run db:migrate
```

## Start Service

```powershell
cd D:\jobfix\apps\ai-service
venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000
```

## Production Checks

- Confirm `GET /health` returns `ok`.
- Confirm `GET /status` returns `ready`.
- Confirm `GET /metrics` responds.
- Confirm Core can reach PostgreSQL and its internal API accepts the configured key.
