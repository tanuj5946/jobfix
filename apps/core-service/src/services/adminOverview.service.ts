import { prisma } from '../config/database';

const countBy = (values: string[]) => Object.fromEntries(
  values.reduce<Map<string, number>>((counts, value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map()),
);

const decimalValue = (value: { toNumber(): number } | null | undefined) => value?.toNumber() ?? null;

/**
 * Read model for the admin portal. Operational changes continue to use the
 * company, job and application services; this service deliberately exposes no
 * duplicate admin CRUD commands.
 */
export const adminOverviewService = {
  async getOverview() {
    const [
      companies,
      jobs,
      applications,
      candidateCount,
      candidateWithResumeCount,
      recruiterCount,
      assessmentRows,
      assessmentScore,
      questionTotal,
      questionTypes,
      questionDifficulties,
      questionCoverage,
    ] = await Promise.all([
      prisma.recruiterProfile.findMany({
        where: { companyName: { not: null } },
        select: {
          id: true, companyName: true, companyWebsite: true, industry: true, createdAt: true,
          user: { select: { name: true, email: true } },
          _count: { select: { jobs: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.job.findMany({
        select: {
          id: true, title: true, status: true, createdAt: true,
          recruiter: { select: { companyName: true, user: { select: { name: true } } } },
          descriptionAnalysis: { select: { status: true } },
          _count: { select: { requiredSkills: true, applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.findMany({
        select: {
          id: true, status: true, resumeMatchScore: true, appliedAt: true,
          job: { select: { title: true } },
          candidate: { select: { user: { select: { name: true, email: true } } } },
          assessment: { select: { status: true, result: { select: { overallScore: true } } } },
        },
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.candidateProfile.count(),
      prisma.candidateProfile.count({ where: { resumeUrl: { not: null } } }),
      prisma.recruiterProfile.count(),
      prisma.assessment.findMany({ select: { status: true } }),
      prisma.assessmentResult.aggregate({ _avg: { overallScore: true } }),
      prisma.questionBank.count(),
      prisma.questionBank.groupBy({ by: ['questionType'], _count: { _all: true } }),
      prisma.questionBank.groupBy({ by: ['difficulty'], _count: { _all: true } }),
      prisma.questionBank.groupBy({ by: ['role', 'skill'], _count: { _all: true }, orderBy: { _count: { skill: 'desc' } }, take: 30 }),
    ]);

    const jobStatus = countBy(jobs.map(job => job.status));
    const applicationStatus = countBy(applications.map(application => application.status));
    const assessmentStatus = countBy(assessmentRows.map(assessment => assessment.status));
    const resumeAverage = applications.length
      ? applications.reduce((total, application) => total + application.resumeMatchScore.toNumber(), 0) / applications.length
      : null;

    return {
      statistics: {
        candidates: { total: candidateCount, withResume: candidateWithResumeCount, applications: applications.length },
        recruiters: { total: recruiterCount, withCompany: companies.length, jobs: jobs.length },
        jobs: { total: jobs.length, byStatus: jobStatus },
        applications: {
          total: applications.length,
          byStatus: applicationStatus,
          averageResumeMatch: resumeAverage,
          withAssessment: applications.filter(application => application.assessment).length,
        },
        assessments: {
          total: assessmentRows.length,
          byStatus: assessmentStatus,
          completed: assessmentStatus.completed ?? 0,
          averageScore: decimalValue(assessmentScore._avg.overallScore),
        },
        questionBank: {
          total: questionTotal,
          byType: Object.fromEntries(questionTypes.map(item => [item.questionType, item._count._all])),
          byDifficulty: Object.fromEntries(questionDifficulties.map(item => [item.difficulty, item._count._all])),
        },
      },
      companies: companies.map(company => ({
        id: company.id, name: company.companyName, website: company.companyWebsite, industry: company.industry,
        recruiterName: company.user.name, recruiterEmail: company.user.email, jobCount: company._count.jobs, createdAt: company.createdAt,
      })),
      jobs: jobs.map(job => ({
        id: job.id, title: job.title, status: job.status, createdAt: job.createdAt,
        companyName: job.recruiter.companyName, recruiterName: job.recruiter.user.name,
        skillCount: job._count.requiredSkills, applicationCount: job._count.applications,
        analysisStatus: job.descriptionAnalysis?.status ?? 'not_started',
      })),
      applications: applications.map(application => ({
        id: application.id, status: application.status, appliedAt: application.appliedAt,
        jobTitle: application.job.title, candidateName: application.candidate.user.name, candidateEmail: application.candidate.user.email,
        resumeMatchScore: application.resumeMatchScore.toNumber(), assessmentStatus: application.assessment?.status ?? null,
        assessmentScore: decimalValue(application.assessment?.result?.overallScore),
      })),
      questionCoverage: questionCoverage.map(item => ({ role: item.role, skill: item.skill, questionCount: item._count._all })),
    };
  },
};
