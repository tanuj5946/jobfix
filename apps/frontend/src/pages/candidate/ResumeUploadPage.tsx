import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { candidatesApi } from '../../api/candidates';

export function ResumeUploadPage() {
  const navigate = useNavigate();
  const [file, setFile]       = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Upload Your Resume</h1>
      <p className="mt-1 text-sm text-gray-500">
        We'll extract your skills automatically using AI. Supports PDF and DOCX.
      </p>

      <div className="mt-6 card p-8 max-w-lg">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <label
          htmlFor="resume-file"
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-12 text-center hover:border-brand-400 transition-colors"
        >
          <span className="text-4xl">📄</span>
          <span className="mt-3 text-sm font-medium text-gray-700">
            {file ? file.name : 'Click to select or drag & drop'}
          </span>
          <span className="mt-1 text-xs text-gray-400">PDF or DOCX · Max 5 MB</span>
          <input id="resume-file" type="file" accept=".pdf,.docx" className="sr-only" onChange={handleFileChange} />
        </label>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="btn-primary mt-6 w-full"
        >
          {loading ? 'Uploading & parsing…' : 'Upload and Parse'}
        </button>
      </div>
    </div>
  );
}
