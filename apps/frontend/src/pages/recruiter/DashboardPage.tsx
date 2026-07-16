import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { jobsApi } from '../../api/jobs';
import { recruitersApi } from '../../api/recruiters';
import type { RecruiterCandidateRanking, RecruiterDashboard } from '../../types';

const numberFormatter = new Intl.NumberFormat('en-IN');

export function RecruiterDashboardPage() {
  const [dashboard, setDashboard] = useState<RecruiterDashboard | null>(null);
  const [topCandidates, setTopCandidates] = useState<RecruiterCandidateRanking[]>([]);
  const [error, setError] = useState('');
  const [publishingJobId, setPublishingJobId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    jobsApi.recruiterDashboard()
      .then(async (data) => {
        if (!active) return;
        setDashboard(data);
        if (data.recentJobs[0]) {
          const candidates = await recruitersApi.getRankedCandidates(data.recentJobs[0].id);
          if (active) setTopCandidates(candidates.slice(0, 5));
        }
      })
      .catch(() => {
        if (active) setError('Unable to load recruiter dashboard data.');
      });

    return () => { active = false; };
  }, []);

  const publishJob = async (jobId: number) => {
    setPublishingJobId(jobId);
    setError('');
    try {
      const published = await jobsApi.publish(jobId);
      setDashboard(current => current ? {
        ...current,
        stats: { ...current.stats, activeJobs: current.stats.activeJobs + 1 },
        recentJobs: current.recentJobs.map(job => job.id === jobId ? { ...job, status: published.status } : job),
      } : current);
    } catch (cause) {
      if (axios.isAxiosError(cause)) {
        setError(cause.response?.data?.message ?? 'Unable to publish this job.');
      } else {
        setError('Unable to publish this job.');
      }
    } finally {
      setPublishingJobId(null);
    }
  };

  const stats = [
    { label: 'Active Jobs', value: dashboard?.stats.activeJobs },
    { label: 'Total Jobs', value: dashboard?.stats.totalJobs },
    { label: 'Matches Generated', value: dashboard?.stats.matchesGenerated },
    { label: 'Verified Candidates', value: dashboard?.stats.verifiedCandidates },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruiter Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Manage job postings and review AI-ranked candidate matches.</p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn-primary">Post a job</Link>
      </div>

      {error && <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">
              {stat.value === undefined ? '—' : numberFormatter.format(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {dashboard?.recentJobs[0] && (
        <div className="mt-6 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4"><div><h2 className="font-semibold text-gray-900">Top candidates</h2><p className="mt-1 text-sm text-gray-500">Ranked automatically for {dashboard.recentJobs[0].title}.</p></div><Link to={`/recruiter/jobs/${dashboard.recentJobs[0].id}/candidates`} className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link></div>
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-100 text-sm"><thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Candidate</th><th className="px-5 py-3">Resume</th><th className="px-5 py-3">Assessment</th><th className="px-5 py-3">Coverage</th><th className="px-5 py-3">Overall AI</th></tr></thead><tbody className="divide-y divide-gray-100">{topCandidates.map((candidate) => <tr key={candidate.applicationId}><td className="px-5 py-3 font-medium text-gray-900">{candidate.candidateName}</td><td className="px-5 py-3">{candidate.resumeMatch}%</td><td className="px-5 py-3">{candidate.assessmentScore === null ? 'Pending' : `${candidate.assessmentScore}%`}</td><td className="px-5 py-3">{candidate.skillCoverage}%</td><td className="px-5 py-3 font-semibold text-emerald-700">{candidate.overallAiScore}%</td></tr>)}{!topCandidates.length && <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-500">No candidates have applied yet.</td></tr>}</tbody></table></div>
        </div>
      )}

      <div className="mt-6 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">Recent job postings</h2>
            <p className="mt-1 text-sm text-gray-500">Your latest jobs and generated candidate matches.</p>
          </div>
          <Link to="/recruiter/jobs/new" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Create job
          </Link>
        </div>

        {!dashboard ? (
          <p className="px-6 py-8 text-sm text-gray-500">Loading dashboard…</p>
        ) : dashboard.recentJobs.length === 0 ? (
          <div className="px-6 py-8">
            <p className="text-sm text-gray-500">You have not posted a job yet.</p>
            <Link to="/recruiter/jobs/new" className="mt-3 inline-flex text-sm font-medium text-brand-600 hover:underline">
              Create your first job →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dashboard.recentJobs.map((job) => (
              <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">{job.title}</p>
                  <p className="mt-1 text-xs text-gray-500">Updated {new Date(job.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${job.status === 'published' ? 'bg-emerald-100 text-emerald-700' : job.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                    {job.status}
                  </span>
                  <span className="text-sm text-gray-500">{job.matchCount} matches</span>
                  {job.status === 'draft' && <button type="button" disabled={publishingJobId === job.id} onClick={() => void publishJob(job.id)} className="text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50">{publishingJobId === job.id ? 'Publishing...' : 'Publish'}</button>}
                  <Link to={`/recruiter/jobs/${job.id}/candidates`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                    View matches
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
