import { BriefcaseBusiness } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { applicationsApi } from '../../api/applications';
import { jobsApi } from '../../api/jobs';
import type { Job } from '../../types';

export function CandidateJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applyingTo, setApplyingTo] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    jobsApi.list({ limit: 50 })
      .then((response) => setJobs(response.data))
      .catch(() => setError('Unable to load published jobs.'));
  }, []);

  const apply = async (jobId: number) => {
    setApplyingTo(jobId);
    setError('');
    setMessage('');
    try {
      const application = await applicationsApi.apply(jobId);
      setMessage(`Application submitted. Resume match: ${application.resumeMatchScore}%.`);
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 409) {
        setError('You have already applied to this job.');
      } else if (axios.isAxiosError(cause) && cause.response?.status === 400) {
        setError('Upload and parse your resume before applying to a job.');
      } else {
        setError('Unable to submit your application.');
      }
    } finally {
      setApplyingTo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 p-6 text-white shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Candidate opportunities</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Browse jobs that fit your profile</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Apply with your existing profile, resume insights, and AI-ready skill summary.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="space-y-4">
        {jobs.map((job) => (
          <article key={job.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                  <BriefcaseBusiness className="h-4 w-4" />
                  {job.location ?? 'Location flexible'} · {job.workMode ?? 'Work mode not specified'}
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{job.title}</h2>
              </div>
              <button type="button" disabled={applyingTo === job.id} onClick={() => apply(job.id)} className="btn-primary">
                {applyingTo === job.id ? 'Applying…' : 'Apply'}
              </button>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{job.description}</p>
            {!!job.requiredSkills?.length && (
              <div className="mt-4 flex flex-wrap gap-2">
                {job.requiredSkills.map((item) => <span key={item.id} className="badge bg-blue-50 text-blue-700">{item.skill.name}</span>)}
              </div>
            )}
          </article>
        ))}
        {!jobs.length && !error && <div className="card p-6 text-sm text-slate-500">No published jobs are available yet.</div>}
      </div>
    </div>
  );
}
