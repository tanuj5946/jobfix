import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface GeneratedQuestionForStorage {
  role: string; skill: string; category?: string | null; difficulty: string;
  question_type: string; question_text: string; options?: unknown; correct_answer?: string | null;
  rubric?: unknown; tags?: string[]; embedding?: number[] | null;
}

const columns = Prisma.sql`id, role, skill, category, difficulty, question_type, question_text, options, correct_answer, rubric, tags, created_at, updated_at`;
const vector = (values: number[]) => `[${values.join(',')}]`;

/** Core is the sole writer for the pgvector-backed question bank. */
export const questionBankService = {
  async storeGenerated(questions: GeneratedQuestionForStorage[]) {
    const valid = questions.filter(question => Array.isArray(question.embedding) && question.embedding.length);
    if (!valid.length) return [];
    return prisma.$transaction(valid.map(question => prisma.$queryRaw(Prisma.sql`
      INSERT INTO question_bank (role, skill, category, difficulty, question_type, question_text, options, correct_answer, rubric, tags, embedding)
      VALUES (${question.role}, ${question.skill}, ${question.category ?? null}, ${question.difficulty}, ${question.question_type},
        ${question.question_text}, CAST(${JSON.stringify(question.options ?? null)} AS jsonb), ${question.correct_answer ?? null},
        CAST(${JSON.stringify(question.rubric ?? null)} AS jsonb), ${question.tags ?? []}, CAST(${vector(question.embedding!)} AS vector))
      RETURNING ${columns}`)));
  },
};
