# JobFix API Documentation

Base path: `/api`. Protected routes use the HTTP-only `accessToken` cookie. Browser clients must send requests with credentials enabled.

## Authentication

| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public candidate/general login |
| POST | `/auth/recruiter/login` | Public recruiter login |
| POST | `/auth/logout` | Authenticated session logout |
| GET | `/auth/me` | Authenticated |

## Candidate and applications

| Method | Endpoint | Access |
|---|---|---|
| GET/PATCH | `/candidates/me` | Candidate |
| POST | `/candidates/me/resume` | Candidate |
| GET | `/candidates/me/skills` | Candidate |
| POST | `/candidates/me/skills/confirm` | Candidate |
| GET | `/candidates/me/job-recommendations` | Candidate |
| GET | `/applications/me` | Candidate |
| POST | `/applications/jobs/:jobId` | Candidate |
| POST/GET | `/assessments`, `/assessments/me` | Candidate |
| GET | `/assessments/:id`, `/assessments/:id/result` | Candidate owner |
| POST | `/assessments/:id/answers`, `/assessments/:id/submit` | Candidate |

## Recruiter and hiring

| Method | Endpoint | Access |
|---|---|---|
| GET/PATCH | `/recruiters/me` | Recruiter |
| GET | `/recruiters/dashboard` | Recruiter |
| GET | `/recruiters/jobs/:jobId/candidates?sort=overall|latest|resume_match|assessment_score` | Recruiter owner |
| GET/POST/PATCH/DELETE | `/companies/me`, `/companies` | Recruiter |
| GET | `/jobs`, `/jobs/:id` | Public; published jobs only |
| GET | `/jobs/mine` | Recruiter |
| POST | `/jobs` | Recruiter |
| PATCH/DELETE | `/jobs/:id` | Recruiter owner |
| POST | `/jobs/:id/publish`, `/jobs/:id/close` | Recruiter owner |

## Shared and administration

| Method | Endpoint | Access |
|---|---|---|
| GET | `/skills` | Public |
| GET | `/admin/users`, `/admin/users/:id` | Admin |
| GET | `/admin/overview` | Admin |
| POST | `/admin/questions/seed` | Admin |
| GET | `/admin/analytics` | Admin |
| GET | `/admin/analytics/summary` | Admin |
| GET | `/admin/analytics/most-requested-skills?limit=10` | Admin |
| GET/POST | `/career-coach/plan` | Candidate |
| GET/POST | `/matches/job/:jobId`, `/matches/job/:jobId/run` | Recruiter |

## Analytics payload

`GET /admin/analytics` returns `summary` and `mostRequestedSkills`.

`summary` contains candidate, recruiter, job, application, and assessment totals; retrieval/generation rates; question-source totals; average resume match; and average assessment score. Rates are calculated from persisted assessment-question source flags.
