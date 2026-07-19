import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { applicationsApi } from '../../api/applications';
import type { Application } from '../../types';

export function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    applicationsApi.listMine()
      .then(setApplications)
      .catch(() => setError('Unable to load application history.'));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 p-6 text-white shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Application history</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Track every opportunity you’ve pursued</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Review submitted applications, match quality, and the skill gaps that matter in each role.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        {applications.map((application) => (
          <article key={application.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{application.job.title}</h2>
                <p className="mt-1 text-sm text-slate-500">Applied {new Date(application.appliedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <span className="badge bg-blue-50 text-blue-700">{application.status}</span>
                <p className="mt-2 text-sm font-semibold text-emerald-600">{application.resumeMatchScore}% resume match</p>
              </div>
            </div>
            {application.matchDetailsJson && (
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div><p className="font-semibold text-slate-800">Matched skills</p><p className="mt-1 text-slate-500">{application.matchDetailsJson.matchedSkills.join(', ') || 'None yet'}</p></div>
                <div><p className="font-semibold text-slate-800">Missing skills</p><p className="mt-1 text-slate-500">{application.matchDetailsJson.missingSkills.join(', ') || 'None'}</p></div>
                <div className="sm:col-span-2"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /><p className="font-semibold text-slate-800">Skill gap</p></div><div className="mt-2 flex flex-wrap gap-2">{(application.matchDetailsJson.skillGap ?? []).length ? (application.matchDetailsJson.skillGap ?? []).map((gap) => <span key={gap.skill} className={`badge ${gap.priority === 'high' ? 'bg-red-100 text-red-700' : gap.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{gap.skill} · {gap.priority}</span>) : <p className="text-slate-500">No identified skill gaps.</p>}</div></div>
              </div>
            )}
          </article>
        ))}
        {!applications.length && !error && <div className="card p-6 text-sm text-slate-500">You have not applied to a job yet.</div>}
      </div>
    </div>
  );
}
