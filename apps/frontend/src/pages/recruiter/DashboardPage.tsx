export function RecruiterDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Recruiter Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your job postings and ranked candidate matches.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Active Jobs',        value: '—' },
          { label: 'Total Applicants',   value: '—' },
          { label: 'Matches Generated',  value: '—' },
        ].map(stat => (
          <div key={stat.label} className="card p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 card p-6">
        <p className="text-sm text-gray-400 italic">Dashboard content coming soon.</p>
      </div>
    </div>
  );
}
