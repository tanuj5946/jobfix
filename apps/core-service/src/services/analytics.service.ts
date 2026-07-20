import { prisma } from '../config/database';

const decimalValue = (value: { toNumber(): number } | null | undefined) => value?.toNumber() ?? null;

export const analyticsService = {
  async getSummary() {
    const [
      totalCandidates,
      totalRecruiters,
      jobsPosted,
      applications,
      assessments,
      assessmentQuestions,
      generatedQuestions,
      resumeMatch,
      assessmentScore,
    ] = await Promise.all([
      prisma.candidateProfile.count(),
      prisma.recruiterProfile.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.assessment.count(),
      prisma.assessmentQuestion.count(),
      prisma.assessmentQuestion.count({ where: { generatedByAi: true } }),
      prisma.application.aggregate({ _avg: { resumeMatchScore: true } }),
      prisma.assessmentResult.aggregate({ _avg: { overallScore: true } }),
    ]);

    const retrievedQuestions = assessmentQuestions - generatedQuestions;
    const percentage = (value: number) => assessmentQuestions
      ? Number(((value / assessmentQuestions) * 100).toFixed(2))
      : null;

    return {
      totalCandidates,
      totalRecruiters,
      jobsPosted,
      applications,
      assessments,
      questionRetrievalRate: percentage(retrievedQuestions),
      questionGenerationRate: percentage(generatedQuestions),
      questionPipeline: { total: assessmentQuestions, retrieved: retrievedQuestions, generated: generatedQuestions },
      averageResumeMatch: decimalValue(resumeMatch._avg.resumeMatchScore),
      averageAssessmentScore: decimalValue(assessmentScore._avg.overallScore),
    };
  },

  async getMostRequestedSkills(limit = 10) {
    const groupedSkills = await prisma.jobRequiredSkill.groupBy({
      by: ['skillId'],
      _count: { _all: true },
      orderBy: { _count: { skillId: 'desc' } },
      take: limit,
    });
    const skills = await prisma.skill.findMany({
      where: { id: { in: groupedSkills.map(item => item.skillId) } },
      select: { id: true, name: true, category: true },
    });
    const byId = new Map(skills.map(skill => [skill.id, skill]));
    return groupedSkills.flatMap(item => {
      const skill = byId.get(item.skillId);
      return skill ? [{ id: skill.id, name: skill.name, category: skill.category, requestedByJobs: item._count._all }] : [];
    });
  },

  async getDashboard() {
    const [summary, mostRequestedSkills] = await Promise.all([
      this.getSummary(),
      this.getMostRequestedSkills(),
    ]);
    return { summary, mostRequestedSkills };
  },
};
