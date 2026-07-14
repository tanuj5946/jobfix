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

    const aiAssessment = await aiServiceClient.createAssessment(selectedSkills, selectedRole);
    const finalAssessment = aiAssessment.final_assessment;

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

    this.validateSubmission(assessment.questions.map(question => question.id), answers);

    const existingSubmittedAttempt = await this.hasSubmittedAttempt(assessment.id, profile.id);
    if (existingSubmittedAttempt) {
      throw new Error('Assessment has already been submitted');
    }

    const attempt = await assessmentRepository.createAttempt(assessment.id, profile.id, answers);

    return aiServiceClient.evaluateAssessment({
      assessment_id: assessment.id,
      candidate_id: profile.id,
      attempt_id: Number(attempt.id),
    });
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

  private async hasSubmittedAttempt(assessmentId: number, candidateId: number) {
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { assessmentId, candidateId, status: 'submitted' },
    });
    return Boolean(attempt);
  }
}

export const assessmentService = new AssessmentService();
