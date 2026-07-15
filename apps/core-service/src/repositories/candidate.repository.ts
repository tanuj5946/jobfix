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
    const uniqueSkillNames = this.uniqueSkillNames(skillNames);

    if (uniqueSkillNames.length) {
      await prisma.skill.createMany({
        data: uniqueSkillNames.map(name => ({ name })),
        skipDuplicates: true,
      });
    }

    const skills = uniqueSkillNames.length
      ? await prisma.skill.findMany({
          where: { name: { in: uniqueSkillNames } },
        })
      : [];

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
    const parsedSkillsByName = new Map<string, { name: string; confidence: number }>();
    for (const skill of skills) {
      const name = skill.name.trim();
      if (name) {
        parsedSkillsByName.set(name, { name, confidence: skill.confidence });
      }
    }

    const skillNames = Array.from(parsedSkillsByName.keys());
    if (!skillNames.length) {
      return;
    }

    await prisma.skill.createMany({
      data: skillNames.map(name => ({ name })),
      skipDuplicates: true,
    });

    const storedSkills = await prisma.skill.findMany({
      where: { name: { in: skillNames } },
    });

    for (const skill of storedSkills) {
      await prisma.candidateSkill.upsert({
        where: {
          candidateId_skillId: {
            candidateId,
            skillId: skill.id,
          },
        },
        update: {
          parseConfidence: parsedSkillsByName.get(skill.name)?.confidence,
          source: 'auto_detected',
        },
        create: {
          candidateId,
          skillId: skill.id,
          source: 'auto_detected',
          parseConfidence: parsedSkillsByName.get(skill.name)?.confidence,
        },
      });
    }

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
}

export const candidateRepository = new CandidateRepository();
