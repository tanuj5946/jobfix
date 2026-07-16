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
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Browse jobs</h1>
      <p className="mt-1 text-sm text-gray-500">Apply with your existing JobFix resume and skills profile.</p>
      {error && <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="mt-6 space-y-4">
        {jobs.map((job) => (
          <article key={job.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{job.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{job.location ?? 'Location flexible'} · {job.workMode ?? 'Work mode not specified'}</p>
              </div>
              <button type="button" disabled={applyingTo === job.id} onClick={() => apply(job.id)} className="btn-primary">
                {applyingTo === job.id ? 'Applying…' : 'Apply'}
              </button>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-700">{job.description}</p>
            {!!job.requiredSkills?.length && (
              <div className="mt-4 flex flex-wrap gap-2">
                {job.requiredSkills.map((item) => <span key={item.id} className="badge bg-brand-50 text-brand-700">{item.skill.name}</span>)}
              </div>
            )}
          </article>
        ))}
        {!jobs.length && !error && <p className="card p-6 text-sm text-gray-500">No published jobs are available yet.</p>}
      </div>
    </div>
  );
}
