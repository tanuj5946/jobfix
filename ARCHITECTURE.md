# SmartFresher — System Architecture

## 1. Overview

SmartFresher is an AI-powered recruitment platform that replaces resume-based hiring with **skill-based verification**. Candidates take AI-generated assessments, build a verified competency profile, and get matched with recruiters based on proven skills rather than resume keywords. An Agentic Career Coach continuously analyzes performance and recommends improvements.

The system is built as **two independent microservices** behind a reverse proxy, with a shared PostgreSQL database, deployed via Docker on AWS EC2.

---

## 2. High-Level Architecture

```
                              ┌─────────────────────┐
                              │      Candidate /     │
                              │   Recruiter Browser   │
                              └───────────┬──────────┘
                                          │ HTTPS
                              ┌───────────▼──────────┐
                              │   NGINX Reverse Proxy │
                              │  (SSL termination,     │
                              │   routing, load balance)│
                              └───────────┬──────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                                             │
          ┌─────────▼──────────┐                       ┌──────────▼─────────┐
          │  React (Vite)        │                       │   Static Assets /    │
          │  Frontend SPA         │                       │   CDN (optional)      │
          └─────────┬──────────┘                       └────────────────────┘
                    │ REST API calls
                    │
          ┌─────────▼──────────────────────────────────────────────┐
          │           Microservice 1 — Core Service (Express.js)      │
          │  • Authentication (JWT + bcrypt)                          │
          │  • Candidate / Recruiter profile management                │
          │  • Job posting & management                                │
          │  • Dashboards & aggregated views                           │
          │  • AWS SES (transactional email)                           │
          │  • Acts as API Gateway — proxies AI-related requests        │
          │    to Microservice 2                                        │
          └─────────┬───────────────────────────┬───────────────────┘
                    │                             │
                    │ internal REST call          │
                    │                             │
          ┌─────────▼──────────────────────┐      │
          │  Microservice 2 — AI Service      │      │
          │  (FastAPI + LangGraph)             │      │
          │  • Resume parsing                   │      │
          │  • AI question generation           │      │
          │  • Answer grading / evaluation      │      │
          │  • Job–candidate match explanation  │      │
          │  • Career coach / improvement plans │      │
          │  • Calls Gemini 2.5 Flash via        │      │
          │    LangChain + LangGraph             │      │
          └─────────┬──────────────────────┘      │
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   PostgreSQL Database  │
                        │  (shared, single source │
                        │   of truth)              │
                        └──────────────────────┘

          Cross-cutting: OpenTelemetry tracing across both services
          Deployment: Docker containers, orchestrated via docker-compose,
                       hosted on AWS EC2, CI/CD via GitHub Actions
```

---

## 3. Component Breakdown

### 3.1 Frontend — React (Vite)
- Single-page application consumed by both candidates and recruiters (role-based routing/views).
- Talks **only** to Microservice 1 (Core Service), which acts as the single API gateway. The frontend never calls Microservice 2 directly — this keeps auth centralized and avoids exposing internal AI service endpoints publicly.
- Key screens: auth, resume upload, skill selection, assessment-taking, results, verified profile, career coach dashboard, job posting, ranked candidates, candidate detail.

### 3.2 Microservice 1 — Core Service (Express.js)
**Responsibility:** everything that is standard CRUD / business logic, not AI-driven.

| Function | Description |
|---|---|
| Authentication | JWT-based auth, bcrypt password hashing, register/login for both roles |
| Profile management | Candidate & recruiter profile CRUD |
| Job management | Job posting, editing, status (draft/published/closed) |
| Dashboards | Aggregated stats for candidate/recruiter home screens |
| Email | AWS SES integration for notifications (e.g., assessment complete, new match) |
| API Gateway role | Receives frontend requests that require AI processing and forwards them internally to Microservice 2, then relays the response back |

### 3.3 Microservice 2 — AI Service (FastAPI + LangGraph)
**Responsibility:** all AI/agentic logic. Isolated from Microservice 1 so it can be developed, scaled, and iterated on independently (see [4. Why Two Microservices](#4-why-two-microservices)).

| Module | Description |
|---|---|
| Resume Parsing | Extracts text from uploaded PDF/DOCX, uses Gemini to output structured skills/experience JSON |
| Question Generation | Generates MCQ, coding, and conceptual questions per skill and difficulty level |
| Grading / Evaluation | Scores candidate answers — deterministic for MCQ, AI-assisted for conceptual/coding |
| Match Explanation | Computes job–candidate match score and generates a natural-language explanation for recruiters |
| Career Coach | Analyzes skill gaps vs. target role, recommends learning resources, triggers reassessment suggestions |

Internally orchestrated as a **LangGraph** state graph — each module above is (or contains) one or more graph nodes, with conditional edges controlling flow (e.g., retry on malformed AI output, branch by question type).

### 3.4 Database — PostgreSQL
- Single shared database, source of truth for both services.
- Core entities: `users`, `candidate_profiles`, `recruiter_profiles`, `skills`, `candidate_skills`, `assessments`, `assessment_questions`, `assessment_answers`, `assessment_results`, `jobs`, `job_matches`, `learning_recommendations`.
- Both microservices connect directly to the same PostgreSQL instance (simplest approach for MVP scale). See `smartfresher_schema.sql` for full DDL.

### 3.5 NGINX Reverse Proxy
- Single entry point for all external traffic.
- Handles SSL termination, routes `/api/*` (or subdomain-based routing) to the Express.js service, and serves the built React frontend as static files.
- Only Microservice 1 and the frontend are exposed externally; Microservice 2 stays internal-only, reachable solely via Microservice 1.

### 3.6 Observability — OpenTelemetry
- Both microservices emit traces, allowing a request to be followed end-to-end: frontend → Core Service → AI Service → Gemini API → back.
- Critical for debugging AI-service latency/failures, since LLM calls are the most likely source of slowness or errors.

### 3.7 Deployment
- Each app (`frontend`, `core-service`, `ai-service`) is containerized independently via Docker.
- `docker-compose.yml` orchestrates all containers + PostgreSQL for local dev and single-VM deployment.
- Hosted on **AWS EC2**; **GitHub Actions** handles CI (lint/build/test) and CD (build images, deploy on merge to main).

---

## 4. Why Two Microservices

| Reason | Explanation |
|---|---|
| **Different tech needs** | Express.js is well-suited for fast CRUD/auth; Python (FastAPI) is the natural fit for LangGraph/LangChain-based AI orchestration. |
| **Independent scaling** | AI workloads (LLM calls) are slower and more resource-variable than CRUD operations — they can be scaled or rate-limited independently without affecting core auth/job features. |
| **Independent development pace** | AI logic is iterative (prompt tuning, grading accuracy) and generally takes longer to stabilize than CRUD features. Splitting services lets the AI service evolve without blocking or being blocked by core feature development. |
| **Security boundary** | The AI service holds the Gemini API key and does the heaviest data processing (resumes, answers); keeping it internal-only (never exposed to the public internet directly) reduces attack surface. |

---

## 5. Data Flow — Key User Journeys

**Candidate Assessment Flow:**
```
Candidate uploads resume (Frontend)
   → Core Service stores file, calls AI Service /parse-resume
   → AI Service extracts skills → returns structured JSON
   → Candidate confirms/edits skills (Frontend → Core Service)
   → Core Service calls AI Service /generate-assessment
   → AI Service generates questions → Core Service stores them, serves to Frontend
   → Candidate submits answers → Core Service calls AI Service /grade-assessment
   → AI Service scores + generates feedback → Core Service persists assessment_results
   → Candidate's verified skill profile updates
```

**Recruiter Matching Flow:**
```
Recruiter posts job (Frontend → Core Service)
   → Core Service calls AI Service /match-explanation for candidate pool
   → AI Service scores + explains matches → Core Service persists job_matches
   → Recruiter views ranked candidates (Frontend ← Core Service)
```

**Career Coach Flow:**
```
Post-assessment, Core Service triggers AI Service /improvement-plan
   → AI Service analyzes gaps vs. target role → generates roadmap + resources
   → Core Service persists to learning_recommendations
   → Candidate views roadmap on dashboard, can trigger reassessment
```

---

## 6. Technology Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Core Backend | Express.js |
| AI Backend | FastAPI + LangGraph + LangChain |
| LLM | Gemini 2.5 Flash |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Email | AWS SES |
| Reverse Proxy | NGINX |
| Containerization | Docker |
| Hosting | AWS EC2 |
| CI/CD | GitHub Actions |
| Observability | OpenTelemetry |

---

## 7. Repository Structure

```
smartfresher/
├── apps/
│   ├── frontend/          # React + Vite
│   ├── core-service/      # Express.js
│   └── ai-service/        # FastAPI + LangGraph
├── infra/
│   ├── docker/
│   └── nginx/
├── .github/workflows/     # CI/CD pipelines
├── docker-compose.yml
├── smartfresher_schema.sql
└── README.md
```

---

## 8. Open Design Decisions

These are flagged for the team to finalize as the build progresses:

- **Coding question grading**: real sandboxed code execution vs. AI-only review of logic (execution is more rigorous but adds sandboxing/security complexity).
- **Inter-service communication**: synchronous REST calls (current plan, simplest for MVP) vs. async message queue if AI processing times become a bottleneck (e.g., long-running question generation).
- **Unconfirmed resume-detected skills**: whether skills detected but not confirmed by the candidate are discarded or shown as "unverified mentions" on their profile.
