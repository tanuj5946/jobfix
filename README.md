# JobFix

JobFix is an AI-assisted hiring platform with a single React application for candidates, recruiters, and administrators. Recruiters create companies and jobs, candidates apply using parsed resumes, and JobFix generates job-skill assessments and ranked candidate results.

## What runs locally

| Path | Technology | Responsibility |
|---|---|---|
| `apps/frontend` | React, Vite, TypeScript | Candidate, recruiter, and admin portal |
| `apps/core-service` | Express, Prisma, PostgreSQL | Authentication, business rules, REST API, data persistence |
| `apps/ai-service` | FastAPI, LangGraph | Resume parsing, job analysis, questions, and evaluation |

The browser calls the Core Service at `/api`. The Core Service calls the AI Service internally at `AI_SERVICE_URL`.

## 1. Prerequisites

Install the following before starting:

- Node.js 18 or newer, including npm.
- Python 3.11 or 3.12, installed from python.org (not only the Microsoft Store launcher).
- PostgreSQL 14+ with the `vector` extension, or a Supabase PostgreSQL project with pgvector enabled.
- A Groq API key for the AI Service.

Check your tools in PowerShell:

```powershell
node --version
npm --version
py --version
```

## 2. Get the source and install Node dependencies

```powershell
git clone https://github.com/tanuj5946/jobfix.git
cd jobfix

cd apps/core-service
npm install

cd ../frontend
npm install
```

## 3. Configure PostgreSQL

### Local PostgreSQL

Create a database and enable pgvector:

```sql
CREATE DATABASE jobfix;
\c jobfix
CREATE EXTENSION IF NOT EXISTS vector;
```

Use the same connection string for `DATABASE_URL` and `DIRECT_URL` when PostgreSQL is local:

```text
postgresql://postgres:YOUR_PASSWORD@localhost:5432/jobfix
```

### Supabase

Use two URLs from **Supabase Dashboard → Settings → Database → Connection string**:

- `DATABASE_URL`: Transaction Pooler URL, port `6543`, with `pgbouncer=true`.
- `DIRECT_URL`: Direct Connection URL, port `5432`; Prisma migrations use this URL.

Do not use the pooler URL as `DIRECT_URL`. It can cause migration and TLS errors.

## 4. Configure the Core Service

Copy the example environment file:

```powershell
cd apps/core-service
Copy-Item .env.example .env
```

Edit `apps/core-service/.env` and set at least:

```dotenv
DATABASE_URL="your pooled or local PostgreSQL URL"
DIRECT_URL="your direct PostgreSQL URL"
JWT_SECRET="a-long-random-secret-at-least-16-characters"
AI_SERVICE_URL="http://localhost:8000"
PORT=3001
CORS_ORIGINS="http://localhost:5173"

ADMIN_NAME="JobFix Admin"
ADMIN_EMAIL="admin@jobfix.local"
ADMIN_PASSWORD="use-a-strong-local-password"
```

Never commit `.env`, database URLs, JWT secrets, or API keys.

## 5. Apply Prisma migrations safely

Generate the client and deploy all committed migrations:

```powershell
cd apps/core-service
npm run db:generate
npx prisma migrate deploy
npx prisma migrate status
```

Use `prisma migrate deploy` for every existing, shared, staging, or production database. It only applies migrations missing from `_prisma_migrations`; it does not reset data.

Do **not** run these against a database with data:

```powershell
npx prisma migrate reset
npx prisma db push
npx prisma migrate dev
```

`migrate dev` is only for creating a new migration on an isolated local development database.

## 6. Seed skills and the admin account

```powershell
cd apps/core-service
npm run seed:skills
npm run seed:admin
```

The admin email and password come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. Change the example password before using any shared environment.

## 7. Configure and start the AI Service

Create a fresh virtual environment. This is important if `venv` was created using a removed or Microsoft Store Python installation.

```powershell
cd apps/ai-service
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Set the AI environment variables for the current PowerShell session:

```powershell
$env:GROQ_API_KEY="your-groq-api-key"
$env:AI_DATABASE_URL="your-direct-postgresql-url"
```

`AI_DATABASE_URL` may be replaced with `DATABASE_URL` if the AI Service should use the same direct PostgreSQL connection. Start the service:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

Verify it in a separate terminal:

```powershell
Invoke-WebRequest http://localhost:8000/health
```

Expected: an HTTP 200 response.

## 8. Start the Core Service

Open a second terminal:

```powershell
cd jobfix/apps/core-service
npm run dev
```

Verify it:

```powershell
Invoke-WebRequest http://localhost:3001/health
```

Expected: HTTP 200 and a JSON health response. If it cannot connect to PostgreSQL, check `DIRECT_URL`, TLS settings, and the database provider’s connection-string guidance.

## 9. Start the frontend

Open a third terminal:

```powershell
cd jobfix/apps/frontend
npm run dev
```

Open <http://localhost:5173>. Vite proxies browser requests from `/api` to `http://localhost:3001`.

## 10. Manual functional verification

Use this sequence after all three services are healthy:

1. Sign up or sign in as a recruiter.
2. Open **Company** and create the company profile.
3. Open **Post a Job**, add a complete job description, and save the draft.
4. Wait for job-description analysis to complete, then publish the job from the recruiter dashboard.
5. Sign up or sign in as a candidate.
6. Upload a PDF or DOCX resume and confirm detected skills.
7. Open **Browse Jobs** and apply to the published job.
8. Confirm the application shows Resume Match, Missing Skills, and Skill Gap.
9. Open **Assessment**, complete all questions, and submit.
10. Return to the recruiter dashboard and view ranked candidates.
11. Sign in with the seeded admin account and open **Administration** to view platform analytics and Question Bank coverage.

## Useful commands

Run these from `apps/core-service`:

```powershell
npm run build          # TypeScript build
npm run db:generate    # Regenerate Prisma Client
npx prisma migrate deploy
npx prisma migrate status
npm run db:studio      # Opens Prisma Studio
npm run seed:skills
npm run seed:admin
```

Run these from `apps/frontend`:

```powershell
npm run build
npm run dev
```

## Troubleshooting

### Prisma reports schema drift

Do not reset the database. Check migration history first:

```powershell
cd apps/core-service
npx prisma migrate status
```

Use [migration documentation](docs/MIGRATION_SUMMARY.md) and the committed migration SQL to apply a forward-only repair. Back up production data before any manual SQL.

### Core Service fails with a Supabase TLS or connection error

Confirm that `DIRECT_URL` is the Supabase direct connection URL on port `5432` and that `DATABASE_URL` is the pooler URL on port `6543` with `pgbouncer=true`. Copy fresh URLs from Supabase rather than editing credentials manually.

### AI Service Python cannot start

Delete and recreate only the local `apps/ai-service/venv` directory using a currently installed Python interpreter, then reinstall `requirements.txt`. Do not reuse a virtual environment that points to a removed interpreter.

### Candidate cannot apply

Candidates must upload and parse a resume before applying. Jobs must be AI-analysed and published before they appear in Browse Jobs.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [ER Diagram](docs/ER_DIAGRAM.md)
- [API Documentation](docs/API.md)
- [Migration Summary](docs/MIGRATION_SUMMARY.md)
- [AI Service Notes](apps/ai-service/docs/README.md)
