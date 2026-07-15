import { Prisma } from '@prisma/client';
import { aiServiceClient } from './aiServiceClient';
import { assessmentRepository } from '../repositories/assessment.repository';
import { candidateService } from './candidate.service';
import { prisma } from '../config/database';

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
const aiAssessment = await aiServiceClient.createAssessment(
  selectedSkills,
  selectedRole,
);

console.log("\n========== AI ASSESSMENT ==========");
console.dir(aiAssessment, { depth: null });
console.log("==================================\n");

const finalAssessment = aiAssessment.final_assessment;

console.log("\n========== FINAL ASSESSMENT ==========");
console.dir(finalAssessment, { depth: null });
console.log("=====================================\n");
    if (!finalAssessment?.questions?.length) {
      throw new Error('AI service did not return assessment questions');
    }

    const saved = await assessmentRepository.createAssessmentFromAi(
      profile.id,
      selectedRole,
      finalAssessment.title,
      finalAssessment.questions,
      {
        skill_weights: aiAssessment.skill_weights ?? {},
        missing_core_skills: aiAssessment.missing_core_skills ?? [],
        blueprint: aiAssessment.blueprint ?? [],
      } as Prisma.InputJsonValue,
    );

    return saved;
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
