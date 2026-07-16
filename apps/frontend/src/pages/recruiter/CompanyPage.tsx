import { useEffect, useState } from 'react';
import axios from 'axios';
import { companiesApi } from '../../api/companies';
import type { Company } from '../../types';

type CompanyForm = {
  name: string;
  website: string;
  industry: string;
};

const emptyForm: CompanyForm = { name: '', website: '', industry: '' };

export function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    companiesApi.getMine()
      .then((data) => {
        if (!active) return;
        setCompany(data);
        setForm({ name: data.name, website: data.website ?? '', industry: data.industry ?? '' });
      })
      .catch((cause) => {
        if (!active || !axios.isAxiosError(cause) || cause.response?.status !== 404) {
          if (active) setError('Unable to load company details.');
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const set = (field: keyof CompanyForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      name: form.name.trim(),
      website: form.website.trim() || null,
      industry: form.industry.trim() || null,
    };

    try {
      const saved = company
        ? await companiesApi.updateMine(payload)
        : await companiesApi.create(payload);
      setCompany(saved);
      setMessage(company ? 'Company updated.' : 'Company created.');
    } catch {
      setError('Unable to save company details. Check the website URL and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this company? This is allowed only when it has no job postings.')) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await companiesApi.deleteMine();
      setCompany(null);
      setForm(emptyForm);
      setMessage('Company deleted.');
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 409) {
        setError('This company has job postings and cannot be deleted.');
      } else {
        setError('Unable to delete company.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading company details…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Company</h1>
      <p className="mt-1 text-sm text-gray-500">Manage the company attached to your recruiter account.</p>

      <form onSubmit={handleSave} className="mt-6 card space-y-5 p-6">
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        <div>
          <label htmlFor="company-name" className="mb-1 block text-sm font-medium text-gray-700">Company name</label>
          <input id="company-name" required minLength={2} maxLength={200} value={form.name} onChange={set('name')} className="input" />
        </div>
        <div>
          <label htmlFor="company-website" className="mb-1 block text-sm font-medium text-gray-700">Website</label>
          <input id="company-website" type="url" value={form.website} onChange={set('website')} className="input" placeholder="https://example.com" />
        </div>
        <div>
          <label htmlFor="company-industry" className="mb-1 block text-sm font-medium text-gray-700">Industry</label>
          <input id="company-industry" value={form.industry} onChange={set('industry')} className="input" placeholder="Technology" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : company ? 'Update company' : 'Create company'}
          </button>
          {company && (
            <button type="button" disabled={saving} onClick={handleDelete} className="btn-secondary text-red-600 hover:text-red-700">
              Delete company
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
