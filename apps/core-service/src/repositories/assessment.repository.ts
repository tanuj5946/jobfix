import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface StoreAssessmentQuestion {
  question_id?: number | string | null;
  question_type: string;
  skill: string;
  difficulty?: string | null;
  question?: string;
  question_text?: string;
  options?: unknown;
  correct_answer?: string | null;
  rubric?: unknown;
  marks?: number;
}

export class AssessmentRepository {
  async persistAiEvaluation(
    assessmentId: number,
    attemptId: bigint,
    evaluation: Record<string, any>,
  ) {
    const answers = Array.isArray(evaluation.answers) ? evaluation.answers : [];
    const recommendations = Array.isArray(evaluation.learning_recommendations)
      ? evaluation.learning_recommendations : [];
    await prisma.$transaction(async tx => {
      for (const answer of answers) {
        await tx.assessmentAnswer.update({
          where: { id: Number(answer.answer_id) },
          data: {
            score: Number(answer.score), evaluationJson: answer,
            feedback: answer.feedback ?? null, isCorrect: answer.is_correct ?? null,
            marksAwarded: Number(answer.marks_awarded),
          },
        });
      }
      const assessment = await tx.assessment.findUniqueOrThrow({
        where: { id: assessmentId },
        select: {
          candidateId: true,
          skills: { include: { skill: { select: { id: true, name: true } } } },
        },
      });
      for (const recommendation of recommendations) {
        const skill = await tx.skill.upsert({
          where: { name: String(recommendation.skill) }, update: {}, create: { name: String(recommendation.skill) },
        });
        await tx.learningRecommendation.create({ data: {
          candidateId: assessment.candidateId, skillId: skill.id,
          resourceTitle: String(recommendation.resource_title), resourceUrl: recommendation.resource_url ?? null,
          resourceType: recommendation.resource_type ?? null, priority: recommendation.priority ?? 'medium',
        } });
      }
      const data = {
        attemptId,
        overallScore: Number(evaluation.overall_score), overallLevel: String(evaluation.overall_level ?? ''),
        skillBreakdownJson: (evaluation.skill_breakdown ?? {}) as Prisma.InputJsonValue,
        evaluationSummary: String(evaluation.evaluation_summary ?? ''), assessmentGrade: String(evaluation.assessment_grade ?? ''),
        passFail: String(evaluation.pass_fail ?? ''), confidenceScore: Number(evaluation.confidence_score ?? 0),
        recruiterReportJson: (evaluation.recruiter_report ?? {}) as Prisma.InputJsonValue,
        learningRecommendationsJson: recommendations as Prisma.InputJsonValue,
        promptVersionsJson: (evaluation.prompt_versions ?? {}) as Prisma.InputJsonValue,
      };
      await tx.assessmentResult.upsert({ where: { assessmentId }, update: data, create: { assessmentId, ...data } });

      const assessedAt = new Date();
      const assessmentSkillIds = new Map(
        assessment.skills.map(item => [item.skill.name.trim().toLocaleLowerCase(), item.skill.id]),
      );
      const skillBreakdown = evaluation.skill_breakdown;

      if (skillBreakdown && typeof skillBreakdown === 'object' && !Array.isArray(skillBreakdown)) {
        for (const [skillName, rawScore] of Object.entries(skillBreakdown)) {
          const score = Number(rawScore);
          const skillId = assessmentSkillIds.get(skillName.trim().toLocaleLowerCase());
          if (!skillId || !Number.isFinite(score)) continue;

          const verifiedScore = Math.max(0, Math.min(100, Number(score.toFixed(2))));
          const verifiedLevel = verifiedScore >= 80
            ? 'advanced'
            : verifiedScore >= 60
              ? 'intermediate'
              : 'beginner';

          await tx.candidateSkill.upsert({
            where: { candidateId_skillId: { candidateId: assessment.candidateId, skillId } },
            update: { verifiedScore, verifiedLevel, lastAssessedAt: assessedAt, source: 'assessment' },
            create: { candidateId: assessment.candidateId, skillId, verifiedScore, verifiedLevel, lastAssessedAt: assessedAt, source: 'assessment' },
          });
        }
      }
    },
  {
    timeout: 60000,
    maxWait: 60000,
  });
  }

  async createAssessmentFromAi(
    candidateId: number,
    role: string,
    title: string,
    questions: StoreAssessmentQuestion[],
    metadata?: Prisma.InputJsonValue,
    applicationId?: number,
  ) {
    const skillNames = this.uniqueSkillNames(
      questions.map(question => question.skill),
    );

    if (skillNames.length) {
      await prisma.skill.createMany({
        data: skillNames.map(name => ({ name })),
        skipDuplicates: true,
      });
    }

    const skills = await prisma.skill.findMany({
      where: { name: { in: skillNames } },
      select: { id: true, name: true },
    });
    const skillIdByName = new Map(
      skills.map(skill => [skill.name, skill.id]),
    );

    const assessmentId = await prisma.$transaction(
      async tx => {
        const assessment = await tx.assessment.create({
          data: {
            candidateId,
            applicationId,
            assessmentName: title,
            targetRole: role,
            status: 'in_progress',
            startedAt: new Date(),
            assessmentMetadataJson: metadata ?? Prisma.JsonNull,
          },
        });

        const questionRows = questions.map(question => {
          const skillName = this.normalizeSkillName(question.skill);
          const skillId = skillIdByName.get(skillName);
          if (!skillId) {
            throw new Error(`Unable to resolve skill ID for "${question.skill}"`);
          }

          return {
            assessmentId: assessment.id,
            skillId,
            questionText:
              question.question_text ??
              question.question ??
              '',
            questionType: question.question_type,
            difficulty: question.difficulty ?? undefined,
            optionsJson:
              question.options as Prisma.InputJsonValue,
            expectedAnswer:
              question.correct_answer ?? undefined,
            rubric: this.rubricToString(question.rubric),
            marks:
              question.marks ??
              (question.question_type === 'conceptual'
                ? 2
                : 1),
            generatedByAi:
              question.question_id == null,
          };
        });

        if (questionRows.length) {
          await tx.assessmentQuestion.createMany({
            data: questionRows,
          });
        }

        await tx.assessmentSkill.createMany({
          data: Array.from(new Set(questionRows.map(question => question.skillId))).map(
            skillId => ({
              assessmentId: assessment.id,
              skillId,
            }),
          ),
          skipDuplicates: true,
        });

        return assessment.id;
      },
      {
        timeout: 60000,
      },
    );

    return prisma.assessment.findUnique({
      where: {
        id: assessmentId,
      },
      include: {
        questions: {
          include: {
            skill: true,
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
  }

  findCandidateAssessment(assessmentId: number, candidateId: number) {
    return prisma.assessment.findFirst({
      where: { id: assessmentId, candidateId },
      include: {
        questions: { include: { skill: true } },
        result: true,
      },
    });
  }

  listCandidateAssessments(candidateId: number) {
    return prisma.assessment.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: { result: true },
    });
  }

  findLatestResult(candidateId: number) {
    return prisma.assessmentResult.findFirst({
      where: { assessment: { candidateId } },
      orderBy: { generatedAt: 'desc' },
      include: { assessment: true },
    });
  }

  async createAttempt(
    assessmentId: number,
    candidateId: number,
    answers: Array<{ question_id: number; candidate_answer: string }>,
  ) {
    return prisma.$transaction(async tx => {
      const existing = await tx.assessmentAttempt.findFirst({
        where: { assessmentId, candidateId, status: 'submitted' },
      });

      if (existing) {
        throw new Error('Assessment has already been submitted');
      }

      const attempt = await tx.assessmentAttempt.create({
        data: {
          assessmentId,
          candidateId,
          status: 'submitted',
          submittedAt: new Date(),
        },
      });

      await tx.assessmentAnswer.createMany({
        data: answers.map(answer => ({
          attemptId: attempt.id,
          questionId: answer.question_id,
          candidateAnswer: answer.candidate_answer,
        })),
        skipDuplicates: true,
      });

      return attempt;
    });
  }

  private rubricToString(rubric: unknown): string | undefined {
    if (rubric == null) return undefined;
    if (typeof rubric === 'string') return rubric;
    return JSON.stringify(rubric);
  }

  private uniqueSkillNames(skillNames: string[]) {
    return Array.from(
      new Set(
        skillNames
          .map(skillName => skillName.trim())
          .filter(Boolean),
      ),
    );
  }

  private normalizeSkillName(skillName: string) {
    return skillName.trim();
  }
}

export const assessmentRepository = new AssessmentRepository();
