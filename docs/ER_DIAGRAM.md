# JobFix ER Diagram

```mermaid
erDiagram
  USER ||--o| CANDIDATE_PROFILE : has
  USER ||--o| RECRUITER_PROFILE : has
  CANDIDATE_PROFILE ||--o{ CANDIDATE_SKILL : owns
  SKILL ||--o{ CANDIDATE_SKILL : classifies
  RECRUITER_PROFILE ||--o{ JOB : posts
  JOB ||--o{ JOB_REQUIRED_SKILL : requires
  SKILL ||--o{ JOB_REQUIRED_SKILL : defines
  JOB ||--o{ APPLICATION : receives
  CANDIDATE_PROFILE ||--o{ APPLICATION : submits
  APPLICATION ||--o| ASSESSMENT : starts
  CANDIDATE_PROFILE ||--o{ ASSESSMENT : takes
  ASSESSMENT ||--o{ ASSESSMENT_QUESTION : contains
  ASSESSMENT ||--o| ASSESSMENT_RESULT : produces
  SKILL ||--o{ ASSESSMENT_QUESTION : covers
  JOB ||--o| JOB_DESCRIPTION_ANALYSIS : has

  USER { int id PK string role string email }
  CANDIDATE_PROFILE { int id PK int userId FK json parsedResumeJson }
  RECRUITER_PROFILE { int id PK int userId FK string companyName }
  JOB { int id PK int recruiterId FK string title string status }
  APPLICATION { int id PK int jobId FK int candidateId FK decimal resumeMatchScore string status }
  ASSESSMENT { int id PK int candidateId FK int applicationId FK string status }
  ASSESSMENT_QUESTION { int id PK int assessmentId FK boolean generatedByAi }
  ASSESSMENT_RESULT { int id PK int assessmentId FK decimal overallScore }
  SKILL { int id PK string name }
  QUESTION_BANK { bigint id PK string role string skill string questionType }
```

Notes:

- A company is represented by the recruiter’s `RecruiterProfile`; no duplicate Company model exists.
- `Application(jobId, candidateId)` is unique.
- `Assessment.applicationId` is unique when an assessment was created from an application.
- The Question Bank is independent reusable content. Retrieved questions are persisted in `AssessmentQuestion` with `generatedByAi = false`.
