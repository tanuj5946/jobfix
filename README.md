# SmartFresher

> AI-powered skill verification and hiring platform. Candidates prove skills through AI-generated assessments; recruiters find the right fit via verified competency matching — not resume keywords.

---

## Monorepo Structure

```
smartfresher/
├── apps/
│   ├── frontend/       # React + Vite + TypeScript + Tailwind CSS
│   ├── core-service/   # Express.js + TypeScript + Prisma + PostgreSQL
│   └── ai-service/     # FastAPI + LangGraph  ← developed separately (see note below)
├── packages/           # Shared utilities (future use)
├── .gitignore
└── README.md
```

> **ai-service note**: The AI service (`apps/ai-service`) is developed and run independently by a separate developer. It is not part of this README's setup instructions. See `apps/ai-service/` for its own setup. The frontend **never** calls ai-service directly — all AI requests flow through core-service, which proxies them internally.

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **PostgreSQL** ≥ 14 running locally (or via Docker — see below)

---

## 1. Environment Setup

### core-service

```bash
cd apps/core-service
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, AI_SERVICE_URL
```

### frontend

The frontend reads `VITE_API_URL` — if not set, it defaults to `/api` (proxied by Vite dev server to core-service on port 3001). No `.env` file needed for basic local dev.

---

## 2. Database Setup

### Option A — Local PostgreSQL

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE smartfresher;"

# Run Prisma migrations
cd apps/core-service
npm install
npx prisma migrate dev --name init
```

### Option B — PostgreSQL via Docker (quick start)

```bash
docker run -d \
  --name sf-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=smartfresher \
  -p 5432:5432 \
  postgres:16-alpine
```

Then run `npx prisma migrate dev` as above.

---

## 3. Running Locally

### core-service (port 3001)

```bash
cd apps/core-service
npm install
npm run dev
```

Verify: `GET http://localhost:3001/health` → `{ "status": "ok" }`

### frontend (port 5173)

```bash
cd apps/frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

> The Vite dev server proxies `/api/*` → `http://localhost:3001`, so the frontend and core-service work together with no CORS issues in development.

---

## 4. Prisma Cheat Sheet

```bash
cd apps/core-service

# Generate Prisma client after schema changes
npm run db:generate

# Create and apply a new migration
npm run db:migrate

# Open Prisma Studio (DB GUI)
npm run db:studio

# Push schema directly (no migration file — use only in dev)
npm run db:push
```

---

## 5. API Overview (core-service)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register candidate or recruiter |
| POST | `/auth/login` | Public | Login, returns JWT |
| GET | `/auth/me` | JWT | Current user |
| GET/PATCH | `/candidates/me` | Candidate | Profile |
| POST | `/candidates/me/resume` | Candidate | Upload + AI-parse resume |
| GET/POST | `/candidates/me/skills` | Candidate | Skills |
| GET/PATCH | `/recruiters/me` | Recruiter | Profile |
| GET/POST/PATCH/DELETE | `/jobs` | Public (GET) / Recruiter | Job CRUD |
| GET | `/skills` | Public | Browse/search skills |
| POST | `/assessments` | Candidate | Create assessment (triggers AI question gen) |
| POST | `/assessments/:id/answers` | Candidate | Submit answer (triggers AI grading) |
| POST | `/assessments/:id/submit` | Candidate | Finalise assessment |
| GET | `/matches/job/:jobId` | Recruiter | Ranked candidates |
| POST | `/matches/job/:jobId/run` | Recruiter | Trigger AI match computation |
| POST/GET | `/career-coach/plan` | Candidate | Generate / retrieve improvement plan |
| GET | `/health` | Public | Health check |

---

## 6. What's Mocked vs. Functional

| Feature | Status |
|---------|--------|
| Register / Login | ✅ **Functional** — real bcrypt + JWT |
| JWT middleware | ✅ **Functional** |
| Prisma DB schema | ✅ **Functional** — all 14 tables |
| Candidate/Recruiter CRUD | ✅ **Functional** (DB-backed) |
| Skills list/search | ✅ **Functional** (DB-backed) |
| Resume upload → AI parsing | 🔵 **Mock** — `AiServiceClient.parseResume()` returns hardcoded data |
| Assessment question generation | 🔵 **Mock** — `AiServiceClient.generateAssessment()` returns 3 sample questions |
| Answer grading | 🔵 **Mock** — `AiServiceClient.gradeAssessment()` returns fixed partial marks |
| Job–candidate matching | 🔵 **Mock** — `AiServiceClient.getMatchExplanation()` returns fixed 78.5% score |
| Career coach / improvement plan | 🔵 **Mock** — `AiServiceClient.getImprovementPlan()` returns 2 sample gaps |
| Frontend routing | ✅ **Functional** — all routes render, auth guard works |
| Frontend API calls | 🔵 **Mock returns** — functions exist, call core-service endpoints |

To wire up real AI: replace the mock method bodies in [`src/services/aiServiceClient.ts`](apps/core-service/src/services/aiServiceClient.ts) with HTTP calls to `env.AI_SERVICE_URL`.

---

## 7. Project Conventions

- **Frontend → core-service only.** The frontend never calls ai-service directly.
- **core-service → ai-service** via `AiServiceClient`. `AI_SERVICE_URL` is the only config needed.
- **Prisma schema** is the single source of truth for DB structure — do not run raw SQL migrations separately.
- **Zod** for all request validation in core-service.
- **JWT** is stored in `localStorage` on the frontend (key: `sf_token`). Token is attached via axios interceptor.
