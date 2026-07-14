import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../../api/jobs';
import type { CreateJobPayload } from '../../api/jobs';

export function PostJobPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Pick<CreateJobPayload, 'title' | 'description' | 'location' | 'workMode' | 'experienceLevel'>>({
    title: '', description: '', location: '', workMode: 'remote', experienceLevel: 'fresher',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const job = await jobsApi.create({ ...form, requiredSkills: [] });
      navigate(`/recruiter/jobs/${job.id}/candidates`);
    } catch {
      setError('Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Post a New Job</h1>
      <p className="mt-1 text-sm text-gray-500">Fill in the details and add required skills.</p>

      <form onSubmit={handleSubmit} className="mt-6 card p-8 max-w-2xl space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="job-title" className="mb-1 block text-sm font-medium text-gray-700">Job title</label>
          <input id="job-title" type="text" required value={form.title} onChange={set('title')} className="input" placeholder="e.g. Backend Developer" />
        </div>
        <div>
          <label htmlFor="job-desc" className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea id="job-desc" rows={4} value={form.description} onChange={set('description')} className="input resize-none" placeholder="Role responsibilities and requirements…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="job-location" className="mb-1 block text-sm font-medium text-gray-700">Location</label>
            <input id="job-location" type="text" value={form.location} onChange={set('location')} className="input" placeholder="Bangalore, India" />
          </div>
          <div>
            <label htmlFor="job-mode" className="mb-1 block text-sm font-medium text-gray-700">Work mode</label>
            <select id="job-mode" value={form.workMode ?? ''} onChange={set('workMode')} className="input">
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
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
        <p className="text-xs text-gray-400">Required skills selector coming soon.</p>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating…' : 'Create job posting'}
        </button>
      </form>
    </div>
  );
}
