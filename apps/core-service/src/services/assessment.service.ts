import { Prisma } from '@prisma/client';
import { aiServiceClient, type AiAssessmentQuestion } from './aiServiceClient';
import { assessmentRepository } from '../repositories/assessment.repository';
import { candidateService } from './candidate.service';
import { prisma } from '../config/database';
import { questionBankService } from './questionBank.service';

export class AssessmentService {
  async createForCandidate(userId: number) {
    const profile = await candidateService.getProfile(userId);
    const selectedRole = profile.targetRole;
    const selectedSkills = profile.candidateSkills.map(item => item.skill.name);

    if (!selectedRole) {
      throw new Error('Select a role before generating an assessment');
    }

    if (!selectedSkills.length) {
      throw new Error('Select at least one skill before generating an assessment');
    }
    return this.createFromSkills({
      candidateId: profile.id,
      targetRole: selectedRole,
      selectedSkills,
      metadata: { source: 'candidate_skills' } as Prisma.InputJsonValue,
    });
  }

  async createForApplication(applicationId: number) {
    const existing = await prisma.assessment.findUnique({ where: { applicationId } });
    if (existing) return existing;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { requiredSkills: { include: { skill: true } } } },
      },
    });
    if (!application) throw new Error('Application not found');

    const selectedSkills = application.job.requiredSkills.map((item) => item.skill.name);
    if (!selectedSkills.length) {
      throw new Error('The job has no extracted skills for assessment generation');
    }

    return this.createFromSkills({
      candidateId: application.candidateId,
      targetRole: application.job.title,
      selectedSkills,
      applicationId,
      metadata: {
        source: 'job_description_skills',
        application_id: applicationId,
        job_id: application.jobId,
      } as Prisma.InputJsonValue,
    });
  }

  private async createFromSkills({
    candidateId,
    targetRole,
    selectedSkills,
    metadata,
    applicationId,
  }: {
    candidateId: number;
    targetRole: string;
    selectedSkills: string[];
    metadata: Prisma.InputJsonValue;
    applicationId?: number;
  }) {
    const aiAssessment = await aiServiceClient.createAssessment(
      selectedSkills,
      targetRole,
    );

    const finalAssessment = aiAssessment.final_assessment;
    if (!finalAssessment?.questions?.length) {
      throw new Error('AI service did not return assessment questions');
    }

    // Generated questions are returned by AI; Core validates ownership of the
    // write and persists reusable question-bank entries itself.
    await questionBankService.storeGenerated(
      finalAssessment.questions
        .filter(question => question.question_id == null)
        .map(question => ({
          role: targetRole,
          skill: question.skill,
          difficulty: question.difficulty,
          question_type: question.question_type,
          question_text: question.question_text ?? question.question ?? '',
          options: question.options,
          correct_answer: question.correct_answer,
          rubric: question.rubric,
          tags: [],
          embedding: (question as AiAssessmentQuestion & { embedding?: number[] }).embedding,
        })),
    );

    return assessmentRepository.createAssessmentFromAi(
      candidateId,
      targetRole,
      finalAssessment.title,
      finalAssessment.questions,
      {
        ...(metadata as object),
        skill_weights: aiAssessment.skill_weights ?? {},
        missing_core_skills: aiAssessment.missing_core_skills ?? [],
        blueprint: aiAssessment.blueprint ?? [],
      } as Prisma.InputJsonValue,
      applicationId,
    );
  }

  async getCandidateAssessment(userId: number, assessmentId: number) {
    const profile = await candidateService.getProfile(userId);
    const assessment = await assessmentRepository.findCandidateAssessment(assessmentId, profile.id);
    if (!assessment) throw new Error('Assessment not found');
    return assessment;
  }

  async submitCandidateAssessment(
    userId: number,
    assessmentId: number,
    answers: Array<{ question_id: number; candidate_answer: string }>,
  ) {
    const profile = await candidateService.getProfile(userId);
    const assessment = await assessmentRepository.findCandidateAssessment(assessmentId, profile.id);

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (assessment.result) {
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      // A duplicate request can happen if the browser retries after the AI
      // service has completed. Treat it as successful and return the result.
      return {
        assessment_id: assessment.id,
        result: assessment.result,
      };
    }

    this.validateSubmission(assessment.questions.map(question => question.id), answers);

    const existingSubmittedAttempt = await prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId: assessment.id,
        candidateId: profile.id,
        status: 'submitted',
      },
      orderBy: { createdAt: 'desc' },
    });

    // If evaluation previously failed after the answers were persisted, retry
    // evaluation using the same attempt instead of blocking the candidate.
    const attempt = existingSubmittedAttempt ?? await assessmentRepository.createAttempt(
      assessment.id,
      profile.id,
      answers,
    );

    const evaluation = await aiServiceClient.evaluateAssessment({
      assessment_id: assessment.id,
      candidate_id: profile.id,
      attempt_id: Number(attempt.id),
    });

    if (!evaluation.result || typeof evaluation.result !== 'object') {
      throw new Error('AI service did not return an evaluation result');
    }
    await assessmentRepository.persistAiEvaluation(
      assessment.id,
      attempt.id,
      evaluation.result as Record<string, any>,
    );

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    return evaluation;
  }

  async listResults(userId: number) {
    const profile = await candidateService.getProfile(userId);
    return assessmentRepository.listCandidateAssessments(profile.id);
  }

  private validateSubmission(
    questionIds: number[],
    answers: Array<{ question_id: number; candidate_answer: string }>,
  ) {
    if (!Array.isArray(answers) || !answers.length) {
      throw new Error('Answers are required');
    }

    const expected = new Set(questionIds);
    const received = new Set(answers.map(answer => answer.question_id));
    const missing = questionIds.filter(questionId => !received.has(questionId));
    const invalid = answers.filter(answer => !expected.has(answer.question_id));

    if (missing.length) {
      throw new Error(`Missing answers for questions: ${missing.join(', ')}`);
    }

    if (invalid.length) {
      throw new Error('Submission contains invalid assessment question IDs');
    }

    for (const answer of answers) {
      if (!answer.candidate_answer?.trim()) {
        throw new Error('Candidate answers cannot be empty');
      }
    }
  }

}

export const assessmentService = new AssessmentService();
