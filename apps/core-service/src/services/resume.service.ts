import { Prisma } from '@prisma/client';
import { aiServiceClient } from './aiServiceClient';
import { candidateRepository } from '../repositories/candidate.repository';

export class ResumeService {
  async uploadAndParseResume(
    userId: number,
    file: Express.Multer.File,
  ) {
    this.validateResume(file);

    const parsed = await aiServiceClient.parseResume(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    const profile = await candidateRepository.upsertParsedResume(
      userId,
      parsed as unknown as Prisma.InputJsonValue,
      parsed.target_role_guess,
      `memory://${Date.now()}-${file.originalname}`,
    );

    await candidateRepository.upsertDetectedSkills(
      profile.id,
      parsed.skills,
    );

    const updatedProfile = await candidateRepository.findProfileByUserId(userId);

    return {
      parsed,
      profile: updatedProfile,
      suggested_roles: this.suggestRoles(parsed),
      suggested_skills: parsed.skills,
    };
  }

  private validateResume(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    if (!file) {
      throw new Error('No resume file uploaded');
    }

    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);

    if (!allowed.has(file.mimetype)) {
      throw new Error('Resume must be a PDF or DOCX file');
    }
  }

  private suggestRoles(parsed: { target_role_guess: string | null; skills: Array<{ name: string }> }) {
    const roles = new Set<string>();
    if (parsed.target_role_guess) roles.add(parsed.target_role_guess);

    const skillNames = parsed.skills.map(skill => skill.name.toLowerCase());
    if (skillNames.some(skill => ['react', 'javascript', 'typescript'].includes(skill))) {
      roles.add('Frontend Developer');
    }
    if (skillNames.some(skill => ['node.js', 'fastapi', 'postgresql', 'python'].includes(skill))) {
      roles.add('Backend Developer');
    }
    if (skillNames.some(skill => ['pandas', 'numpy', 'machine learning'].includes(skill))) {
      roles.add('Data Analyst');
    }

    return Array.from(roles);
  }
}

export const resumeService = new ResumeService();
