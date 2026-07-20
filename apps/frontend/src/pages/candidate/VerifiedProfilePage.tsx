import { Award, CheckCircle2, ClipboardCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { candidatesApi } from '../../api/candidates';
import type { CandidateProfile, CandidateSkill } from '../../types';

const levelStyles = {
  advanced: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-blue-100 text-blue-700',
  beginner: 'bg-amber-100 text-amber-700',
};

export function VerifiedProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [skills, setSkills] = useState<CandidateSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([candidatesApi.getProfile(), candidatesApi.getSkills()])
      .then(([loadedProfile, loadedSkills]) => {
        if (!active) return;
        setProfile(loadedProfile);
        setSkills(loadedSkills);
      })
      .catch(() => active && setError('Unable to load your verified profile. Please try again.'))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, []);

  const verifiedSkills = useMemo(
    () => skills.filter(skill => skill.verifiedScore !== null && skill.verifiedLevel),
    [skills],
  );
  const averageScore = verifiedSkills.length
    ? Math.round(verifiedSkills.reduce((sum, skill) => sum + Number(skill.verifiedScore), 0) / verifiedSkills.length)
    : null;
  const personalInfo = profile?.parsedResumeJson?.personal_info;

  if (loading) return <div className="card p-6 text-sm text-slate-500">Loading your verified profile…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-700 p-6 text-white shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-100">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified candidate profile
            </div>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{personalInfo?.name ?? 'Your skill profile'}</h1>
            <p className="mt-2 text-sm text-blue-100 sm:text-base">{profile?.targetRole ?? 'Select a target role'} · Recruiters can use your assessed skills to evaluate fit.</p>
          </div>
          <Link to="/candidate/assessment" className="btn-secondary shrink-0 border-white/20 bg-white text-slate-900 hover:bg-slate-100">Take an assessment</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <ProfileStat icon={Award} label="Verified skills" value={String(verifiedSkills.length)} detail="Assessment-backed competencies" />
        <ProfileStat icon={Sparkles} label="Average score" value={averageScore === null ? '—' : `${averageScore}%`} detail="Across verified skills" />
        <ProfileStat icon={ClipboardCheck} label="Profile status" value={verifiedSkills.length ? 'Ready' : 'In progress'} detail={verifiedSkills.length ? 'Visible in recruiter matching' : 'Complete an assessment to verify skills'} />
      </section>

      {!verifiedSkills.length ? (
        <section className="card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Sparkles className="h-6 w-6" /></div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">No verified skills yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Complete an assessment to turn your selected skills into a recruiter-ready, verified profile.</p>
          <Link to="/candidate/assessment" className="btn-primary mt-5">Start assessment</Link>
        </section>
      ) : (
        <section className="card p-6">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">Verified competencies</h2><p className="mt-1 text-sm text-slate-500">Scores are updated when you complete a new assessment.</p></div><CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {verifiedSkills.map(skill => {
              const level = skill.verifiedLevel as keyof typeof levelStyles;
              return <article key={skill.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{skill.skill.name}</h3><span className={`badge capitalize ${levelStyles[level] ?? 'bg-slate-100 text-slate-700'}`}>{skill.verifiedLevel}</span></div>
                <p className="mt-5 text-3xl font-semibold text-slate-900">{Math.round(Number(skill.verifiedScore))}%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" style={{ width: `${Number(skill.verifiedScore)}%` }} /></div>
                <p className="mt-3 text-xs text-slate-500">Last assessed {skill.lastAssessedAt ? new Date(skill.lastAssessedAt).toLocaleDateString() : 'recently'}</p>
              </article>;
            })}
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Profile details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Target role" value={profile?.targetRole} />
          <Detail label="Email" value={personalInfo?.email} />
          <Detail label="Location" value={personalInfo?.location} />
        </div>
      </section>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value, detail }: { icon: typeof Award; label: string; value: string; detail: string }) {
  return <article className="card p-5"><Icon className="h-5 w-5 text-blue-600" /><p className="mt-4 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-2 text-sm font-medium text-slate-800">{value || 'Not provided'}</p></div>;
}
