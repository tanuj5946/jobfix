import { ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jobsApi } from '../../api/jobs';
import type { CreateJobPayload } from '../../api/jobs';

export function PostJobPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Pick<CreateJobPayload, 'title' | 'description' | 'location' | 'workMode' | 'experienceLevel'>>({
    title: '', description: '', location: '', workMode: 'remote', experienceLevel: 'fresher',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await jobsApi.create({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location?.trim() || undefined,
        requiredSkills: [],
      });
      navigate('/recruiter/dashboard', { replace: true });
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 409) {
        setError('Create a company before posting a job.');
      } else {
        setError('Unable to store this job posting. Please review the details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 p-6 text-white shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Job creation</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Create a polished job draft</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Use the existing workflow to store the draft, while the experience feels premium and frictionless.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Paste the role details and let the platform handle the extraction flow.</p>
        <Link to="/recruiter/company" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Manage company</Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Sparkles className="h-4 w-4 text-blue-600" />
            AI-powered intake is already wired in.
          </div>
          <p className="mt-2">The posting flows through the same backend logic, but now with clearer structure and a more premium experience.</p>
        </div>

        <div>
          <label htmlFor="job-title" className="mb-2 block text-sm font-medium text-slate-700">Job title</label>
          <input id="job-title" type="text" required minLength={2} maxLength={200} value={form.title} onChange={set('title')} className="input" placeholder="Backend Developer" />
        </div>
        <div>
          <label htmlFor="job-desc" className="mb-2 block text-sm font-medium text-slate-700">Job description</label>
          <textarea id="job-desc" required minLength={20} maxLength={20000} rows={12} value={form.description} onChange={set('description')} className="input resize-y" placeholder="Paste the complete role responsibilities, requirements, and qualifications here." />
          <p className="mt-2 text-xs text-slate-500">At least 20 characters. The draft is stored and the description is sent for skill extraction.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="job-location" className="mb-2 block text-sm font-medium text-slate-700">Location</label>
            <input id="job-location" type="text" value={form.location ?? ''} onChange={set('location')} className="input" placeholder="Bengaluru, India" />
          </div>
          <div>
            <label htmlFor="job-mode" className="mb-2 block text-sm font-medium text-slate-700">Work mode</label>
            <select id="job-mode" value={form.workMode ?? ''} onChange={set('workMode')} className="input">
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="job-exp" className="mb-2 block text-sm font-medium text-slate-700">Experience level</label>
          <select id="job-exp" value={form.experienceLevel ?? ''} onChange={set('experienceLevel')} className="input">
            <option value="fresher">Fresher</option>
            <option value="1_2_years">1–2 years</option>
            <option value="3_plus_years">3+ years</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Storing job…' : 'Store job draft'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
