import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { questionBankService } from '../services/questionBank.service';
import { asyncHandler } from '../utils/asyncHandler';

type QuestionInput = {
  role: string; skill: string; category?: string | null; difficulty: string;
  question_type: string; question_text: string; options?: unknown; correct_answer?: string | null;
  rubric?: unknown; tags?: string[]; embedding: number[];
};

const questionColumns = Prisma.sql`id, role, skill, category, difficulty, question_type, question_text, options, correct_answer, rubric, tags, created_at, updated_at`;
const vector = (value: number[]) => `[${value.join(',')}]`;
const asNumber = (value: string) => Number.parseInt(value, 10);

function questionRow(row: Record<string, unknown>) {
  return { ...row, id: String(row.id) };
}

export const searchQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { role, skill, difficulty, question_type: questionType, embedding, limit = 10 } = req.body as {
    role?: string; skill?: string; difficulty?: string; question_type?: string; embedding?: number[]; limit?: number;
  };
  const filters: Prisma.Sql[] = [];
  if (role) filters.push(Prisma.sql`LOWER(role) = LOWER(${role})`);
  if (skill) filters.push(Prisma.sql`LOWER(skill) = LOWER(${skill})`);
  if (difficulty) filters.push(Prisma.sql`LOWER(difficulty) = LOWER(${difficulty})`);
  if (questionType) filters.push(Prisma.sql`LOWER(question_type) = LOWER(${questionType})`);
  const where = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.empty;
  const boundedLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const rows = embedding?.length
    ? await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        SELECT ${questionColumns}, 1 - (embedding <=> CAST(${vector(embedding)} AS vector)) AS similarity
        FROM question_bank ${where}
        ORDER BY embedding <=> CAST(${vector(embedding)} AS vector) LIMIT ${boundedLimit}`)
    : await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        SELECT ${questionColumns}, NULL::float AS similarity FROM question_bank ${where}
        ORDER BY created_at DESC LIMIT ${boundedLimit}`);
  res.json({ success: true, data: rows.map(questionRow) });
});

export const storeQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { questions } = req.body as { questions?: QuestionInput[] };
  if (!Array.isArray(questions) || !questions.length) {
    res.status(400).json({ success: false, message: 'questions is required' }); return;
  }
  const rows = await questionBankService.storeGenerated(questions);
  res.status(201).json({ success: true, data: (rows.flat() as Record<string, unknown>[]).map(questionRow) });
});

export const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const result = await prisma.questionBank.deleteMany({ where: { id } });
  if (!result.count) { res.status(404).json({ success: false, message: 'Question not found' }); return; }
  res.status(204).send();
});

export const createAssessment = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { candidate_id: number; role: string; title: string; questions: Array<Record<string, unknown>>; metadata?: Prisma.InputJsonValue };
  const names = [...new Set(body.questions.map(q => String(q.skill).trim()).filter(Boolean))];
  const saved = await prisma.$transaction(async tx => {
    await tx.skill.createMany({ data: names.map(name => ({ name })), skipDuplicates: true });
    const skills = await tx.skill.findMany({ where: { name: { in: names } } });
    const ids = new Map(skills.map(skill => [skill.name, skill.id]));
    const assessment = await tx.assessment.create({ data: { candidateId: body.candidate_id, targetRole: body.role, assessmentName: body.title, assessmentMetadataJson: body.metadata ?? Prisma.JsonNull } });
    await tx.assessmentQuestion.createMany({ data: body.questions.map(q => ({ assessmentId: assessment.id, skillId: ids.get(String(q.skill))!, questionText: String(q.question_text ?? q.question), questionType: String(q.question_type), difficulty: q.difficulty ? String(q.difficulty) : null, optionsJson: (q.options ?? null) as Prisma.InputJsonValue, expectedAnswer: q.correct_answer ? String(q.correct_answer) : null, rubric: q.rubric ? String(q.rubric) : null, marks: Number(q.marks ?? (q.question_type === 'conceptual' ? 2 : 1)), generatedByAi: q.id == null && q.question_id == null })) });
    await tx.assessmentSkill.createMany({ data: [...new Set(body.questions.map(q => ids.get(String(q.skill))!))].map(skillId => ({ assessmentId: assessment.id, skillId })), skipDuplicates: true });
    return assessment.id;
  });
  const assessment = await prisma.assessment.findUnique({ where: { id: saved }, include: { questions: { include: { skill: true } } } });
  res.status(201).json({ success: true, data: assessmentPayload(assessment!) });
});

function assessmentPayload(assessment: { id: number; candidateId: number; targetRole: string | null; assessmentName: string | null; assessmentMetadataJson: Prisma.JsonValue | null; questions: Array<{ id: number; questionText: string; questionType: string; difficulty: string | null; optionsJson: Prisma.JsonValue | null; expectedAnswer: string | null; rubric: string | null; marks: Prisma.Decimal; skill: { name: string } }> }) {
  return { id: assessment.id, candidate_id: assessment.candidateId, target_role: assessment.targetRole, assessment_name: assessment.assessmentName, assessment_metadata_json: assessment.assessmentMetadataJson ?? {}, questions: assessment.questions.map(q => ({ question_id: q.id, question_type: q.questionType, skill: q.skill.name, difficulty: q.difficulty, question: q.questionText, options: q.optionsJson, correct_answer: q.expectedAnswer, rubric: q.rubric, marks: Number(q.marks) })) };
}

export const getAssessment = asyncHandler(async (req, res) => {
  const assessment = await prisma.assessment.findUnique({ where: { id: asNumber(req.params.id) }, include: { questions: { include: { skill: true } } } });
  if (!assessment) { res.status(404).json({ success: false, message: 'Assessment not found' }); return; }
  res.json({ success: true, data: assessmentPayload(assessment) });
});

export const createAttempt = asyncHandler(async (req, res) => {
  const assessmentId = asNumber(req.params.id);
  const { candidate_id: candidateId, answers } = req.body as { candidate_id: number; answers: Array<{ question_id: number; candidate_answer: string }> };
  const attempt = await prisma.$transaction(async tx => {
    const created = await tx.assessmentAttempt.create({ data: { assessmentId, candidateId, status: 'submitted', submittedAt: new Date() } });
    await tx.assessmentAnswer.createMany({ data: answers.map(a => ({ attemptId: created.id, questionId: a.question_id, candidateAnswer: a.candidate_answer })) });
    await tx.assessment.update({ where: { id: assessmentId }, data: { status: 'completed', completedAt: new Date() } });
    return created;
  });
  res.status(201).json({ success: true, data: { id: String(attempt.id), assessment_id: assessmentId, candidate_id: candidateId } });
});

export const getAttempt = asyncHandler(async (req, res) => {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: BigInt(req.params.id) }, include: { answers: { include: { question: { include: { skill: true } } } } } });
  if (!attempt) { res.status(404).json({ success: false, message: 'Attempt not found' }); return; }
  res.json({ success: true, data: { id: String(attempt.id), assessment_id: attempt.assessmentId, candidate_id: attempt.candidateId, answers: attempt.answers.map(a => ({ id: a.id, question_id: a.questionId, candidate_answer: a.candidateAnswer, question_text: a.question.questionText, question_type: a.question.questionType, difficulty: a.question.difficulty, options_json: a.question.optionsJson, expected_answer: a.question.expectedAnswer, rubric: a.question.rubric, marks: Number(a.question.marks), skill: a.question.skill.name })) } });
});

export const getResult = asyncHandler(async (req, res) => {
  const result = await prisma.assessmentResult.findUnique({ where: { assessmentId: asNumber(req.params.id) } });
  if (!result) { res.status(404).json({ success: false, message: 'Result not found' }); return; }
  res.json({ success: true, data: { overall_score: Number(result.overallScore), overall_level: result.overallLevel, skill_breakdown_json: result.skillBreakdownJson, evaluation_summary: result.evaluationSummary, assessment_grade: result.assessmentGrade, pass_fail: result.passFail, confidence_score: result.confidenceScore && Number(result.confidenceScore), recruiter_report_json: result.recruiterReportJson, learning_recommendations_json: result.learningRecommendationsJson, prompt_versions_json: result.promptVersionsJson } });
});

export const getCandidateHistory = asyncHandler(async (req, res) => {
  const rows = await prisma.assessment.findMany({ where: { candidateId: asNumber(req.params.id) }, include: { result: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: rows.map(row => ({ id: row.id, candidate_id: row.candidateId, status: row.status, created_at: row.createdAt, result: row.result && { overall_score: Number(row.result.overallScore), assessment_grade: row.result.assessmentGrade, pass_fail: row.result.passFail } })) });
});

export const persistEvaluation = asyncHandler(async (req, res) => {
  const assessmentId = asNumber(req.params.id);
  const { attempt_id: attemptId, answers, result, recommendations = [] } = req.body as { attempt_id: string | number; answers: Array<{ answer_id: number; score: number; evaluation_json: Prisma.InputJsonValue; feedback?: string; is_correct?: boolean | null; marks_awarded: number }>; result: Record<string, unknown>; recommendations?: Array<{ skill: string; resource_title: string; resource_url?: string; resource_type?: string; priority?: string }> };
  await prisma.$transaction(async tx => {
    for (const answer of answers) await tx.assessmentAnswer.update({ where: { id: answer.answer_id }, data: { score: answer.score, evaluationJson: answer.evaluation_json, feedback: answer.feedback, isCorrect: answer.is_correct, marksAwarded: answer.marks_awarded } });
    for (const recommendation of recommendations) {
      const skill = await tx.skill.upsert({ where: { name: recommendation.skill }, update: {}, create: { name: recommendation.skill } });
      const assessment = await tx.assessment.findUniqueOrThrow({ where: { id: assessmentId }, select: { candidateId: true } });
      await tx.learningRecommendation.create({ data: { candidateId: assessment.candidateId, skillId: skill.id, resourceTitle: recommendation.resource_title, resourceUrl: recommendation.resource_url, resourceType: recommendation.resource_type, priority: recommendation.priority ?? 'medium' } });
    }
    await tx.assessmentResult.upsert({ where: { assessmentId }, update: { attemptId: BigInt(attemptId), overallScore: Number(result.overall_score), overallLevel: String(result.overall_level ?? ''), skillBreakdownJson: (result.skill_breakdown ?? {}) as Prisma.InputJsonValue, evaluationSummary: String(result.evaluation_summary ?? ''), assessmentGrade: String(result.assessment_grade ?? ''), passFail: String(result.pass_fail ?? ''), confidenceScore: Number(result.confidence_score ?? 0), recruiterReportJson: (result.recruiter_report ?? {}) as Prisma.InputJsonValue, learningRecommendationsJson: (result.learning_recommendations ?? []) as Prisma.InputJsonValue, promptVersionsJson: (result.prompt_versions ?? {}) as Prisma.InputJsonValue }, create: { assessmentId, attemptId: BigInt(attemptId), overallScore: Number(result.overall_score), overallLevel: String(result.overall_level ?? ''), skillBreakdownJson: (result.skill_breakdown ?? {}) as Prisma.InputJsonValue, evaluationSummary: String(result.evaluation_summary ?? ''), assessmentGrade: String(result.assessment_grade ?? ''), passFail: String(result.pass_fail ?? ''), confidenceScore: Number(result.confidence_score ?? 0), recruiterReportJson: (result.recruiter_report ?? {}) as Prisma.InputJsonValue, learningRecommendationsJson: (result.learning_recommendations ?? []) as Prisma.InputJsonValue, promptVersionsJson: (result.prompt_versions ?? {}) as Prisma.InputJsonValue } });
  });
  res.status(204).send();
});
