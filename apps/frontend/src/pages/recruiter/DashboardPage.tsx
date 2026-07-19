import { ArrowRight, BriefcaseBusiness, Sparkles, Users } from 'lucide-react';
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
    { label: 'Active jobs', value: dashboard?.stats.activeJobs, tone: 'from-blue-500/10 to-blue-600/10', icon: BriefcaseBusiness },
    { label: 'Total jobs', value: dashboard?.stats.totalJobs, tone: 'from-emerald-500/10 to-emerald-600/10', icon: Sparkles },
    { label: 'Matches generated', value: dashboard?.stats.matchesGenerated, tone: 'from-cyan-500/10 to-cyan-600/10', icon: Users },
    { label: 'Verified candidates', value: dashboard?.stats.verifiedCandidates, tone: 'from-violet-500/10 to-violet-600/10', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 p-6 text-white shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">Recruiter workspace</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Run hiring with clarity and speed.</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Review AI-ranked matches, publish opportunities faster, and keep your pipeline moving with a premium command center.</p>
          </div>
          <Link to="/recruiter/jobs/new" className="btn-secondary bg-white/90 text-slate-900 hover:bg-white">
            Post a job
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5">
              <div className={`inline-flex rounded-2xl bg-gradient-to-br ${stat.tone} p-2`}>
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <p className="mt-4 text-sm text-slate-500">{stat.label}</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {stat.value === undefined ? '—' : numberFormatter.format(stat.value)}
              </p>
            </div>
          );
        })}
      </div>

      {dashboard?.recentJobs[0] && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Top candidates</h2>
              <p className="mt-1 text-sm text-slate-500">Ranked automatically for {dashboard.recentJobs[0].title}.</p>
            </div>
            <Link to={`/recruiter/jobs/${dashboard.recentJobs[0].id}/candidates`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Resume</th>
                  <th className="px-5 py-3">Assessment</th>
                  <th className="px-5 py-3">Coverage</th>
                  <th className="px-5 py-3">Overall AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topCandidates.map((candidate) => (
                  <tr key={candidate.applicationId}>
                    <td className="px-5 py-3 font-semibold text-slate-900">{candidate.candidateName}</td>
                    <td className="px-5 py-3 text-slate-700">{candidate.resumeMatch}%</td>
                    <td className="px-5 py-3 text-slate-700">{candidate.assessmentScore === null ? 'Pending' : `${candidate.assessmentScore}%`}</td>
                    <td className="px-5 py-3 text-slate-700">{candidate.skillCoverage}%</td>
                    <td className="px-5 py-3 font-semibold text-emerald-700">{candidate.overallAiScore}%</td>
                  </tr>
                ))}
                {!topCandidates.length && <tr><td colSpan={5} className="px-5 py-6 text-center text-slate-500">No candidates have applied yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Recent job postings</h2>
            <p className="mt-1 text-sm text-slate-500">Your latest jobs and generated candidate matches.</p>
          </div>
          <Link to="/recruiter/jobs/new" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Create job</Link>
        </div>

        {!dashboard ? (
          <p className="px-6 py-8 text-sm text-slate-500">Loading dashboard…</p>
        ) : dashboard.recentJobs.length === 0 ? (
          <div className="px-6 py-8">
            <p className="text-sm text-slate-500">You have not posted a job yet.</p>
            <Link to="/recruiter/jobs/new" className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
              Create your first job →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {dashboard.recentJobs.map((job) => (
              <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{job.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Updated {new Date(job.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${job.status === 'published' ? 'bg-emerald-100 text-emerald-700' : job.status === 'closed' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'}`}>
                    {job.status}
                  </span>
                  <span className="text-sm text-slate-500">{job.matchCount} matches</span>
                  {job.status === 'draft' && <button type="button" disabled={publishingJobId === job.id} onClick={() => void publishJob(job.id)} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50">{publishingJobId === job.id ? 'Publishing...' : 'Publish'}</button>}
                  <Link to={`/recruiter/jobs/${job.id}/candidates`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">View matches</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
