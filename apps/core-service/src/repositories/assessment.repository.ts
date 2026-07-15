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
