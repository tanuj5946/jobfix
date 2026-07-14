import { useParams } from 'react-router-dom';

export function AssessmentResultsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Assessment Results</h1>
      <p className="mt-1 text-sm text-gray-500">Assessment ID: {id}</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Overall Score',    value: '—%' },
          { label: 'Level Achieved',   value: '—' },
          { label: 'Skills Verified',  value: '—' },
        ].map(stat => (
          <div key={stat.label} className="card p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-brand-600">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 card p-6 max-w-3xl">
        <p className="text-sm text-gray-400 italic">
          Score breakdown, per-skill results, and AI feedback will appear here.
        </p>
      </div>
    </div>
  );
}
