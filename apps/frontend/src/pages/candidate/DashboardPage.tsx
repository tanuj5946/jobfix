import { ArrowRight, Sparkles, Target, TrendingUp } from 'lucide-react';
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
      <div className="space-y-4">
        <div className="card p-6">
          <p className="text-sm text-slate-500">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-6 text-white shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">Candidate workspace</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Your next opportunity is waiting.</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90 sm:text-base">Track your parsed profile, sharpen your readiness, and keep moving toward roles that fit your strengths.</p>
          </div>
          <Link to="/candidate/assessment" className="btn-secondary bg-white/90 text-slate-900 hover:bg-white">
            Continue assessment
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Selected skills', value: String(skills.length), icon: Target, tone: 'from-blue-500/10 to-blue-600/10' },
          { label: 'Assessments taken', value: String(completedAssessments.length), icon: Sparkles, tone: 'from-emerald-500/10 to-emerald-600/10' },
          { label: 'Job titles found', value: String(recommendations?.jobTitles.length ?? 0), icon: TrendingUp, tone: 'from-cyan-500/10 to-cyan-600/10' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5">
              <div className={`inline-flex rounded-2xl bg-gradient-to-br ${stat.tone} p-2`}>
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <p className="mt-4 text-sm text-slate-500">{stat.label}</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Parsed profile</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{personalInfo?.name ?? 'Name not detected'}</h2>
              <p className="mt-1 text-sm text-slate-500">{profile?.targetRole ?? 'Target role not detected'}</p>
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
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</dt>
                <dd className="mt-1 break-words text-sm text-slate-700">{value || 'Not detected'}</dd>
              </div>
            ))}
          </dl>

          {profile?.parsedResumeJson?.summary && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Summary</p>
              <p className="mt-1 text-sm text-slate-700">{profile.parsedResumeJson.summary}</p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="text-base font-semibold text-slate-900">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map(item => (
                <span key={item.id} className="badge bg-blue-50 text-blue-700">{item.skill.name}</span>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold text-slate-900">Available jobs</h2>
            {recommendations?.recommendations.length ? (
              <div className="mt-3 space-y-2">
                {recommendations.recommendations.slice(0, 5).map(item => (
                  <div key={item.job.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{item.job.title}</p>
                      <span className="shrink-0 text-xs font-semibold text-blue-600">{item.matchScore}%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.job.location ?? 'Location flexible'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No published matches yet.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
