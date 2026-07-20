import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { assessmentsApi } from '../../api/assessments';
import { candidatesApi } from '../../api/candidates';
import type { Assessment, AssessmentQuestion, CandidateProfile, CandidateSkill } from '../../types';

type LoadedAssessment = Assessment & { questions: AssessmentQuestion[] };

export function AssessmentPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [skills, setSkills] = useState<CandidateSkill[]>([]);
  const [assessment, setAssessment] = useState<LoadedAssessment | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const unansweredCount = useMemo(() => {
    if (!assessment) return 0;
    return assessment.questions.filter(question => !answers[question.id]?.trim()).length;
  }, [answers, assessment]);

  const testedSkillNames = useMemo(() => {
    if (!assessment) return [];

    const candidateSkillNamesById = new Map(skills.map(item => [item.skillId, item.skill.name]));
    const names = assessment.questions
      .map(question => question.skill?.name ?? candidateSkillNamesById.get(question.skillId))
      .filter((name): name is string => Boolean(name));

    return Array.from(new Set(names));
  }, [assessment, skills]);

  useEffect(() => {
    let ignore = false;

    const loadAssessment = async () => {
      setLoading(true);
      setError('');
      try {
        const [candidateProfile, candidateSkills, existingAssessments] = await Promise.all([
          candidatesApi.getProfile(),
          candidatesApi.getSkills(),
          assessmentsApi.listMine(),
        ]);

        if (ignore) return;

        setProfile(candidateProfile);
        setSkills(candidateSkills);

        if (!candidateProfile.parsedResumeJson) {
          navigate('/candidate/resume-upload', { replace: true });
          return;
        }

        if (candidateSkills.length === 0) {
          navigate('/candidate/skills', { replace: true });
          return;
        }

        const active = existingAssessments.find(item => item.status === 'in_progress' || item.status === 'pending');
        const nextAssessment = active
          ? await assessmentsApi.getById(active.id)
          : await assessmentsApi.create({
              targetRole: candidateProfile.targetRole ?? 'General Software Developer',
              skillIds: candidateSkills.map(item => item.skillId),
            });

        if (!ignore) setAssessment(nextAssessment);
      } catch (err) {
        if (!ignore) {
          setError(getErrorMessage(err, 'Could not prepare your assessment. Please try again.'));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void loadAssessment();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const setAnswer = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!assessment || unansweredCount > 0) return;

    setSubmitting(true);
    setError('');
    try {
      await assessmentsApi.submitAll(assessment.id, {
        answers: assessment.questions.map(question => ({
          question_id: question.id,
          candidate_answer: answers[question.id],
        })),
      });
      navigate('/candidate/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit the assessment. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Assessment</h1>
      <p className="mt-1 text-sm text-gray-500">
        Answer these questions to finish onboarding and unlock your dashboard.
      </p>

      {error && <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="mt-6 card max-w-3xl p-6">
          <p className="text-sm text-gray-500">Preparing your assessment...</p>
        </div>
      ) : assessment ? (
        <div className="mt-6 max-w-3xl space-y-4">
          <section className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Target role</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {profile?.targetRole ?? 'General Software Developer'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {testedSkillNames.map(name => (
                <span key={name} className="badge bg-gray-100 text-gray-700">{name}</span>
              ))}
            </div>
          </section>

          {assessment.questions.map((question, index) => (
            <section key={question.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Question {index + 1}</p>
                  <h2 className="mt-1 text-base font-semibold text-gray-900">{question.questionText}</h2>
                </div>
                <span className="badge bg-brand-50 text-brand-700">{question.questionType}</span>
              </div>

              {question.optionsJson?.length ? (
                <div className="mt-4 space-y-2">
                  {question.optionsJson.map((option, optionIndex) => {
                    const normalized = normalizeOption(option, optionIndex);

                    return (
                    <label key={normalized.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={normalized.text}
                        checked={answers[question.id] === normalized.text}
                        onChange={event => setAnswer(question.id, event.target.value)}
                        className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>{normalized.id}. {normalized.text}</span>
                    </label>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={answers[question.id] ?? ''}
                  onChange={event => setAnswer(question.id, event.target.value)}
                  rows={5}
                  className="input mt-4 resize-y"
                  placeholder="Write your answer"
                />
              )}
            </section>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/candidate/skills" className="btn-secondary">Change skills</Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || unansweredCount > 0}
              className="btn-primary"
            >
              {submitting ? 'Submitting...' : unansweredCount > 0 ? `${unansweredCount} unanswered` : 'Submit Assessment'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalizeOption(option: { id: string; text: string } | string, index: number) {
  if (typeof option !== 'string') return option;

  return {
    id: String.fromCharCode(65 + index),
    text: option,
  };
}

function getErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') {
      return 'Assessment evaluation is taking longer than expected. Your answers may still be processing; wait a moment before trying again.';
    }

    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
  }

  return fallback;
}
