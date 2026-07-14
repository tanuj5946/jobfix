import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assessmentsApi } from '../../api/assessments';
import { candidatesApi } from '../../api/candidates';
import type { Assessment, CandidateJobRecommendations, CandidateProfile, CandidateSkill } from '../../types';

export function CandidateDashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [skills, setSkills] = useState<CandidateSkill[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [recommendations, setRecommendations] = useState<CandidateJobRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const completedAssessments = useMemo(
    () => assessments.filter(item => item.status === 'completed'),
    [assessments],
  );
  const personalInfo = profile?.parsedResumeJson?.personal_info;

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [candidateProfile, candidateSkills, candidateAssessments, candidateRecommendations] = await Promise.all([
          candidatesApi.getProfile(),
          candidatesApi.getSkills(),
          assessmentsApi.listMine(),
          candidatesApi.getJobRecommendations(),
        ]);

        if (ignore) return;

        if (!candidateProfile.parsedResumeJson) {
          navigate('/candidate/resume-upload', { replace: true });
          return;
        }

        if (candidateSkills.length === 0) {
          navigate('/candidate/skills', { replace: true });
          return;
        }

        if (!candidateAssessments.some(item => item.status === 'completed')) {
          navigate('/candidate/assessment', { replace: true });
          return;
        }

        setProfile(candidateProfile);
        setSkills(candidateSkills);
        setAssessments(candidateAssessments);
        setRecommendations(candidateRecommendations);
      } catch {
        if (!ignore) setError('Could not load your dashboard.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-6 card p-6">
          <p className="text-sm text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Your parsed profile, verified progress, and next actions.</p>

      {error && <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Selected Skills', value: String(skills.length), color: 'text-brand-600' },
          { label: 'Assessments Taken', value: String(completedAssessments.length), color: 'text-emerald-600' },
          { label: 'Job Titles Found', value: String(recommendations?.jobTitles.length ?? 0), color: 'text-amber-600' },
        ].map(stat => (
          <div key={stat.label} className="card p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Parsed personal details</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">
                {personalInfo?.name ?? 'Name not detected'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{profile?.targetRole ?? 'Target role not detected'}</p>
            </div>
            <div className="flex gap-2">
              <Link to="/candidate/assessment" className="btn-primary">Retest</Link>
              <Link to="/candidate/skills" className="btn-secondary">Change skills</Link>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ['Email', personalInfo?.email],
              ['Phone', personalInfo?.phone],
              ['Location', personalInfo?.location],
              ['LinkedIn', personalInfo?.linkedin],
              ['GitHub', personalInfo?.github],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-200 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
                <dd className="mt-1 break-words text-sm text-gray-800">{value || 'Not detected'}</dd>
              </div>
            ))}
          </dl>

          {profile?.parsedResumeJson?.summary && (
            <div className="mt-5 rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Summary</p>
              <p className="mt-1 text-sm text-gray-700">{profile.parsedResumeJson.summary}</p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="text-base font-semibold text-gray-900">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map(item => (
                <span key={item.id} className="badge bg-gray-100 text-gray-700">{item.skill.name}</span>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold text-gray-900">Available jobs</h2>
            {recommendations?.recommendations.length ? (
              <div className="mt-3 space-y-2">
                {recommendations.recommendations.slice(0, 5).map(item => (
                  <div key={item.job.id} className="rounded-lg border border-gray-200 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium text-gray-900">{item.job.title}</p>
                      <span className="shrink-0 text-xs font-semibold text-brand-600">{item.matchScore}%</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{item.job.location ?? 'Location flexible'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">No published matches yet.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
