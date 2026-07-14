# Deployment Guide

## Required Environment

- `GROQ_API_KEY`
- `AI_DATABASE_URL` or `DATABASE_URL`

## Database

The core-service Prisma migrations own the shared PostgreSQL schema. Apply migrations before starting the AI service.

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
- Confirm Supabase has `vector` extension and question/assessment tables.
