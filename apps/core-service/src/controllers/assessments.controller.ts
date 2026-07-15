import type { Request, Response } from 'express';
import { prisma } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { assessmentService } from '../services/assessment.service';

export const createAssessment = asyncHandler(async (req: Request, res: Response) => {
  try {
    const assessment = await assessmentService.createForCandidate(req.user!.userId);
    res.status(201).json({ success: true, message: 'Assessment created', data: assessment });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Assessment creation failed',
    });
  }
});

export const getAssessmentById = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    return;
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { questions: { include: { skill: true } }, skills: { include: { skill: true } }, result: true },
  });

  if (!assessment) {
    res.status(404).json({ success: false, message: 'Assessment not found' });
    return;
  }

  res.json({ success: true, data: assessment });
});

export const listMyAssessments = asyncHandler(async (req: Request, res: Response) => {
  const assessments = await assessmentService.listResults(req.user!.userId);
  res.json({ success: true, data: assessments });
});

export const submitAnswer = asyncHandler(async (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    message: 'Submit the full assessment using POST /assessments/:id/submit',
  });
});

export const submitAssessment = asyncHandler(async (req: Request, res: Response) => {
  const assessmentId = Number(req.params.id);
  if (!Number.isInteger(assessmentId)) {
    res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    return;
  }

  try {
    const { answers } = req.body as {
      answers?: Array<{ question_id: number; candidate_answer: string }>;
    };
    const result = await assessmentService.submitCandidateAssessment(
      req.user!.userId,
      assessmentId,
      answers ?? [],
    );
    res.json({ success: true, message: 'Assessment submitted', data: result });
  }catch (error) {

  console.error("\n========== CREATE ASSESSMENT ERROR ==========");

  console.error(error);

  if (error instanceof Error) {
    console.error(error.stack);
  }

  console.error("=============================================\n");

  res.status(400).json({
    success: false,
    message:
      error instanceof Error
        ? error.message
        : "Assessment creation failed",
  });
}
});

export const getAssessmentResult = asyncHandler(async (req: Request, res: Response) => {
  const assessmentId = Number(req.params.id);
  if (!Number.isInteger(assessmentId)) {
    res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    return;
  }

  const result = await prisma.assessmentResult.findUnique({ where: { assessmentId } });
  if (!result) {
    res.status(404).json({ success: false, message: 'Result not found' });
    return;
  }

  res.json({ success: true, data: result });
});
