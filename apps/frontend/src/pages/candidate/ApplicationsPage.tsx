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
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Application history</h1>
      <p className="mt-1 text-sm text-gray-500">Track submitted applications and deterministic resume-match results.</p>
      {error && <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 space-y-4">
        {applications.map((application) => (
          <article key={application.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{application.job.title}</h2>
                <p className="mt-1 text-sm text-gray-500">Applied {new Date(application.appliedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <span className="badge bg-brand-100 text-brand-700">{application.status}</span>
                <p className="mt-2 text-sm font-semibold text-emerald-600">{application.resumeMatchScore}% resume match</p>
              </div>
            </div>
            {application.matchDetailsJson && (
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div><p className="font-medium text-gray-700">Matched skills</p><p className="mt-1 text-gray-500">{application.matchDetailsJson.matchedSkills.join(', ') || 'None yet'}</p></div>
                <div><p className="font-medium text-gray-700">Missing skills</p><p className="mt-1 text-gray-500">{application.matchDetailsJson.missingSkills.join(', ') || 'None'}</p></div>
                <div className="sm:col-span-2"><p className="font-medium text-gray-700">Skill gap</p><div className="mt-2 flex flex-wrap gap-2">{(application.matchDetailsJson.skillGap ?? []).length ? (application.matchDetailsJson.skillGap ?? []).map((gap) => <span key={gap.skill} className={`badge ${gap.priority === 'high' ? 'bg-red-100 text-red-700' : gap.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{gap.skill} · {gap.priority}</span>) : <p className="text-gray-500">No identified skill gaps.</p>}</div></div>
              </div>
            )}
          </article>
        ))}
        {!applications.length && !error && <p className="card p-6 text-sm text-gray-500">You have not applied to a job yet.</p>}
      </div>
    </div>
  );
}
