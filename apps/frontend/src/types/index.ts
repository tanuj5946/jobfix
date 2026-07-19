// ============================================================
// Shared TypeScript types — aligned to the JobFix Prisma schema.
// ============================================================

// ---- Auth ----
export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface User {
  id: number;
  role: UserRole;
  name: string;
  email: string;
  createdAt: string;
}

// ---- Candidate ----
export interface CandidateProfile {
  id: number;
  userId: number;
  resumeUrl: string | null;
  resumeText: string | null;
  parsedResumeJson: ParsedResume | null;
  targetRole: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedResume {
  personal_info: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    github: string | null;
    linkedin: string | null;
  };
  skills: Array<{ name: string; confidence: number }>;
  target_role_guess: string | null;
  experience: unknown[];
  education: unknown[];
  summary: string | null;
}

export interface ResumeUploadResult {
  parsed: ParsedResume;
  profile: CandidateProfile;
  skills: CandidateSkill[];
}

// ---- Recruiter ----
export interface RecruiterProfile {
  id: number;
  userId: number;
  companyName: string | null;
  companyWebsite: string | null;
  industry: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecruiterDashboard {
  stats: {
    activeJobs: number;
    totalJobs: number;
    matchesGenerated: number;
    verifiedCandidates: number;
  };
  recentJobs: Array<{
    id: number;
    title: string;
    status: JobStatus;
    updatedAt: string;
    matchCount: number;
  }>;
}

export type CandidateRankingSort = 'overall' | 'latest' | 'resume_match' | 'assessment_score';

export interface RecruiterCandidateRanking {
  applicationId: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  status: ApplicationStatus;
  appliedAt: string;
  resumeMatch: number;
  assessmentScore: number | null;
  skillCoverage: number;
  overallAiScore: number;
  assessmentStatus: string;
}

// ---- Skills ----
export interface Skill {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
}

export type SkillSource = 'auto_detected' | 'manually_added';
export type VerifiedLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CandidateSkill {
  id: number;
  candidateId: number;
  skillId: number;
  skill: Skill;
  source: SkillSource;
  parseConfidence: number | null;
  verifiedScore: number | null;
  verifiedLevel: VerifiedLevel | null;
  lastAssessedAt: string | null;
}

// ---- Assessments ----
export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned';
export type QuestionType = 'mcq' | 'coding' | 'conceptual';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Assessment {
  id: number;
  candidateId: number;
  assessmentName: string | null;
  targetRole: string | null;
  status: AssessmentStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface MCQOption {
  id: string;
  text: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface AssessmentQuestion {
  id: number;
  assessmentId: number;
  skillId: number;
  skill?: Skill;
  questionText: string;
  questionType: QuestionType;
  difficulty: Difficulty | null;
  optionsJson: Array<MCQOption | string> | null;   // MCQ only
  expectedAnswer: string | null;
  rubric: string | null;
  testCasesJson: TestCase[] | null;  // coding only
  marks: number;
  generatedByAi: boolean;
}

export interface AssessmentAnswer {
  id: number;
  questionId: number;
  candidateAnswer: string | null;
  score: number | null;
  evaluationJson: unknown | null;
  feedback: string | null;
  answeredAt: string;
}

export interface SkillBreakdown {
  skillId: number;
  score: number;
  level: VerifiedLevel;
}

export interface AssessmentResult {
  id: number;
  assessmentId: number;
  overallScore: number;
  overallLevel: VerifiedLevel | null;
  skillBreakdownJson: SkillBreakdown[] | null;
  evaluationSummary: string | null;
  generatedAt: string;
}

// ---- Jobs ----
export type JobStatus = 'draft' | 'published' | 'closed';
export type WorkMode = 'remote' | 'hybrid' | 'onsite';
export type ExperienceLevel = 'fresher' | '1_2_years' | '3_plus_years';
export type SkillImportance = 'high' | 'medium' | 'low';

export interface Job {
  id: number;
  recruiterId: number;
  title: string;
  description: string | null;
  status: JobStatus;
  location: string | null;
  workMode: WorkMode | null;
  experienceLevel: ExperienceLevel | null;
  minVerifiedLevel: VerifiedLevel | null;
  createdAt: string;
  updatedAt: string;
  requiredSkills?: JobRequiredSkill[];
}

export interface JobRequiredSkill {
  id: number;
  jobId: number;
  skillId: number;
  skill: Skill;
  importance: SkillImportance;
}

export interface JobRecommendation {
  job: Job;
  matchScore: number;
  matchedSkills: string[];
}

export interface CandidateJobRecommendations {
  targetRole: string | null;
  skills: string[];
  jobTitles: string[];
  recommendations: JobRecommendation[];
}

export type ApplicationStatus = 'applied' | 'reviewed' | 'shortlisted' | 'rejected' | 'withdrawn';

export interface Application {
  id: number;
  jobId: number;
  candidateId: number;
  status: ApplicationStatus;
  resumeMatchScore: number;
  matchDetailsJson: {
    matchedSkills: string[];
    missingSkills: string[];
    skillGap?: Array<{ skill: string; priority: 'high' | 'medium' | 'low' }>;
    resumeSkills?: string[];
    jobSkills?: Array<{ name: string; importance: string }>;
    evaluatedSkillCount: number;
    calculation: string;
  } | null;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
  job: Job & {
    recruiter: { user: Pick<User, 'name'> };
  };
}

// ---- Matching ----
export interface JobMatch {
  id: number;
  jobId: number;
  candidateId: number;
  matchScore: number;
  aiExplanation: string | null;
  matchedAt: string;
  candidate?: CandidateProfile & { user: Pick<User, 'name' | 'email'> };
}

// ---- Career Coach ----
export type ResourceType = 'course' | 'article' | 'practice_problems' | 'video';
export type RecommendationStatus = 'pending' | 'completed';
export type Priority = 'high' | 'medium' | 'low';

export interface LearningRecommendation {
  id: number;
  candidateId: number;
  skillId: number;
  skill: Skill;
  resourceTitle: string;
  resourceUrl: string | null;
  resourceType: ResourceType | null;
  priority: Priority;
  status: RecommendationStatus;
  createdAt: string;
  updatedAt: string;
}

// ---- API Response envelope ----
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
