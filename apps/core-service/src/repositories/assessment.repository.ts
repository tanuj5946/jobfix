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
  async createAssessmentFromAi(
    candidateId: number,
    role: string,
    title: string,
    questions: StoreAssessmentQuestion[],
    metadata?: Prisma.InputJsonValue,
  ) {
    return prisma.$transaction(async tx => {
      const assessment = await tx.assessment.create({
        data: {
          candidateId,
          assessmentName: title,
          targetRole: role,
          status: 'in_progress',
          startedAt: new Date(),
          assessmentMetadataJson: metadata ?? Prisma.JsonNull,
        },
      });

      const skillIds = new Set<number>();

      for (const question of questions) {
        const skill = await tx.skill.upsert({
          where: { name: question.skill },
          update: {},
          create: { name: question.skill },
        });
        skillIds.add(skill.id);

        await tx.assessmentQuestion.create({
          data: {
            assessmentId: assessment.id,
            skillId: skill.id,
            questionText: question.question_text ?? question.question ?? '',
            questionType: question.question_type,
            difficulty: question.difficulty ?? undefined,
            optionsJson: question.options as Prisma.InputJsonValue,
            expectedAnswer: question.correct_answer ?? undefined,
            rubric: this.rubricToString(question.rubric),
            marks: question.marks ?? (question.question_type === 'conceptual' ? 2 : 1),
            generatedByAi: question.question_id == null,
          },
        });
      }

      for (const skillId of skillIds) {
        await tx.assessmentSkill.createMany({
          data: [{ assessmentId: assessment.id, skillId }],
          skipDuplicates: true,
        });
      }

      return tx.assessment.findUnique({
        where: { id: assessment.id },
        include: { questions: true, skills: { include: { skill: true } } },
      });
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
}

export const assessmentRepository = new AssessmentRepository();
