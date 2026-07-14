import { useParams, Link } from 'react-router-dom';

export function RankedCandidatesPage() {
  const { jobId } = useParams<{ jobId: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Ranked Candidates</h1>
      <p className="mt-1 text-sm text-gray-500">Job ID: {jobId} — Candidates ranked by AI match score.</p>

      <div className="mt-6 card divide-y divide-gray-100">
        {/* Placeholder rows */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-200" />
              <div>
                <p className="text-sm font-medium text-gray-900">Candidate Name —</p>
                <p className="text-xs text-gray-400">Skills pending match</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="badge bg-brand-100 text-brand-700">—% match</span>
              <Link to={`/recruiter/candidates/${i + 1}`} className="text-sm text-brand-600 hover:underline">
                View profile →
              </Link>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-400 italic">Real match data will populate once ai-service is connected through core-service.</p>
    </div>
  );
}
