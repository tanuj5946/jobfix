import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class CandidateRepository {
  findProfileByUserId(userId: number) {
    return prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        candidateSkills: { include: { skill: true } },
        assessments: {
          orderBy: { createdAt: 'desc' },
          include: { result: true },
        },
        learningRecommendations: { include: { skill: true } },
      },
    });
  }

  upsertParsedResume(
    userId: number,
    parsedResume: Prisma.InputJsonValue,
    targetRole?: string | null,
    resumeUrl?: string | null,
  ) {
    return prisma.candidateProfile.upsert({
      where: { userId },
      update: {
        resumeUrl: resumeUrl ?? undefined,
        parsedResumeJson: parsedResume,
        targetRole: targetRole ?? undefined,
      },
      create: {
        userId,
        resumeUrl: resumeUrl ?? undefined,
        parsedResumeJson: parsedResume,
        targetRole: targetRole ?? undefined,
      },
    });
  }

  updateSelectedRole(candidateId: number, targetRole: string) {
    return prisma.candidateProfile.update({
      where: { id: candidateId },
      data: { targetRole },
    });
  }

  async replaceSelectedSkills(candidateId: number, skillNames: string[]) {
    const skills = [];

    for (const skillName of skillNames) {
      const skill = await prisma.skill.upsert({
        where: { name: skillName },
        update: {},
        create: { name: skillName },
      });
      skills.push(skill);
    }

    await prisma.candidateSkill.deleteMany({
      where: { candidateId },
    });

    if (skills.length) {
      await prisma.candidateSkill.createMany({
        data: skills.map(skill => ({
          candidateId,
          skillId: skill.id,
          source: 'manually_added',
        })),
        skipDuplicates: true,
      });
    }

    return prisma.candidateSkill.findMany({
      where: { candidateId },
      include: { skill: true },
      orderBy: { skill: { name: 'asc' } },
    });
  }

  async upsertDetectedSkills(
    candidateId: number,
    skills: Array<{ name: string; confidence: number }>,
  ) {
    for (const parsedSkill of skills) {
      const skill = await prisma.skill.upsert({
        where: { name: parsedSkill.name },
        update: {},
        create: { name: parsedSkill.name },
      });

      await prisma.candidateSkill.upsert({
        where: {
          candidateId_skillId: { candidateId, skillId: skill.id },
        },
        update: {
          parseConfidence: parsedSkill.confidence,
          source: 'auto_detected',
        },
        create: {
          candidateId,
          skillId: skill.id,
          source: 'auto_detected',
          parseConfidence: parsedSkill.confidence,
        },
      });
    }
  }
}

export const candidateRepository = new CandidateRepository();
