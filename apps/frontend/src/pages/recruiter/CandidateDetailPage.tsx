import { useParams } from 'react-router-dom';

export function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Candidate Profile</h1>
      <p className="mt-1 text-sm text-gray-500">Candidate ID: {candidateId}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">AI Match Summary</h2>
          <p className="text-sm text-gray-400 italic">Match score and explanation from ai-service will appear here.</p>
        </div>
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Verified Skills</h2>
          <p className="text-sm text-gray-400 italic">Candidate's skill breakdown will appear here.</p>
        </div>
      </div>
    </div>
  );
}
