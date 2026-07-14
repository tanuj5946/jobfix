export function CareerCoachPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Career Coach</h1>
      <p className="mt-1 text-sm text-gray-500">
        AI-generated learning roadmap to close your skill gaps and reach your target role.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-3xl">
        {['High Priority', 'Medium Priority', 'Low Priority', 'Completed'].map(section => (
          <div key={section} className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700">{section}</h2>
            <p className="mt-2 text-sm text-gray-400 italic">No items yet.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
