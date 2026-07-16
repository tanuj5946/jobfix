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
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create a job posting</h1>
          <p className="mt-1 text-sm text-gray-500">Paste the job description to create a draft. JobFix automatically extracts the skills needed before it can be published.</p>
        </div>
        <Link to="/recruiter/company" className="text-sm font-medium text-brand-600 hover:text-brand-700">Manage company</Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 card space-y-5 p-6">
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="job-title" className="mb-1 block text-sm font-medium text-gray-700">Job title</label>
          <input id="job-title" type="text" required minLength={2} maxLength={200} value={form.title} onChange={set('title')} className="input" placeholder="Backend Developer" />
        </div>
        <div>
          <label htmlFor="job-desc" className="mb-1 block text-sm font-medium text-gray-700">Job description</label>
          <textarea id="job-desc" required minLength={20} maxLength={20000} rows={12} value={form.description} onChange={set('description')} className="input resize-y" placeholder="Paste the complete role responsibilities, requirements, and qualifications here." />
          <p className="mt-1 text-xs text-gray-500">At least 20 characters. JobFix stores the draft and sends the description for skill extraction.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="job-location" className="mb-1 block text-sm font-medium text-gray-700">Location</label>
            <input id="job-location" type="text" value={form.location ?? ''} onChange={set('location')} className="input" placeholder="Bengaluru, India" />
          </div>
          <div>
            <label htmlFor="job-mode" className="mb-1 block text-sm font-medium text-gray-700">Work mode</label>
            <select id="job-mode" value={form.workMode ?? ''} onChange={set('workMode')} className="input">
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="job-exp" className="mb-1 block text-sm font-medium text-gray-700">Experience level</label>
          <select id="job-exp" value={form.experienceLevel ?? ''} onChange={set('experienceLevel')} className="input">
            <option value="fresher">Fresher</option>
            <option value="1_2_years">1–2 years</option>
            <option value="3_plus_years">3+ years</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Storing job…' : 'Store job draft'}
        </button>
      </form>
    </div>
  );
}
