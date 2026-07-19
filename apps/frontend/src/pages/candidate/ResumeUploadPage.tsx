import { FileText, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { candidatesApi } from '../../api/candidates';

export function ResumeUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const result = await candidatesApi.uploadResume(file);
      navigate('/candidate/skills', { state: { parsedResume: result.parsed } });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError('Resume parsing is taking longer than expected. Please try a smaller PDF or try again in a moment.');
          return;
        }

        const message = err.response?.data?.message;
        if (typeof message === 'string') {
          setError(message);
          return;
        }
      }

      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-6 text-white shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">Resume intake</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Upload your resume with confidence</h1>
        <p className="mt-3 max-w-2xl text-sm text-blue-50/90 sm:text-base">We’ll extract your experience, preferences, and skills automatically using AI so you can move into the next step faster.</p>
      </div>

      <div className="mt-6 card p-8">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <label
          htmlFor="resume-file"
          className="flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-300 bg-slate-50/70 px-6 py-14 text-center transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
            <FileText className="h-8 w-8" />
          </div>
          <span className="mt-4 text-sm font-semibold text-slate-800">
            {file ? file.name : 'Click to select or drag & drop'}
          </span>
          <span className="mt-2 text-xs text-slate-500">PDF or DOCX · Max 5 MB</span>
          <input id="resume-file" type="file" accept=".pdf,.docx" className="sr-only" onChange={handleFileChange} />
        </label>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Why it works
          </div>
          <p className="mt-2">Your resume is parsed locally for structure, then enriched with AI-based skill extraction and role recommendations.</p>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="btn-primary mt-6 w-full"
        >
          {loading ? 'Uploading & parsing…' : 'Upload and parse'}
        </button>
      </div>
    </div>
  );
}
