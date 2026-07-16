import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { recruitersApi } from '../../api/recruiters';
import type { CandidateRankingSort, RecruiterCandidateRanking } from '../../types';

const sortOptions: Array<{ value: CandidateRankingSort; label: string }> = [
  { value: 'overall', label: 'Highest Score' },
  { value: 'latest', label: 'Latest Application' },
  { value: 'resume_match', label: 'Resume Match' },
  { value: 'assessment_score', label: 'Assessment Score' },
];

export function RankedCandidatesPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [sort, setSort] = useState<CandidateRankingSort>('overall');
  const [candidates, setCandidates] = useState<RecruiterCandidateRanking[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = Number(jobId);
    if (!Number.isInteger(id)) return;
    setError('');
    recruitersApi.getRankedCandidates(id, sort)
      .then(setCandidates)
      .catch(() => setError('Unable to load candidate rankings.'));
  }, [jobId, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidate rankings</h1>
          <p className="mt-1 text-sm text-gray-500">Resume match, assessment score, skill coverage, and overall AI score.</p>
        </div>
        <label className="text-sm font-medium text-gray-700">Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value as CandidateRankingSort)} className="input mt-1 min-w-48">
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 overflow-x-auto card">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Candidate</th><th className="px-5 py-3">Resume Match</th><th className="px-5 py-3">Assessment</th><th className="px-5 py-3">Skill Coverage</th><th className="px-5 py-3">Overall AI Score</th><th className="px-5 py-3">Applied</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {candidates.map((candidate) => <tr key={candidate.applicationId}><td className="px-5 py-4"><p className="font-medium text-gray-900">{candidate.candidateName}</p><p className="mt-1 text-xs text-gray-500">{candidate.candidateEmail}</p></td><td className="px-5 py-4 font-medium text-brand-700">{candidate.resumeMatch}%</td><td className="px-5 py-4">{candidate.assessmentScore === null ? <span className="text-gray-500">{candidate.assessmentStatus === 'in_progress' ? 'In progress' : 'Pending'}</span> : `${candidate.assessmentScore}%`}</td><td className="px-5 py-4">{candidate.skillCoverage}%</td><td className="px-5 py-4 font-semibold text-emerald-700">{candidate.overallAiScore}%</td><td className="px-5 py-4 text-gray-500">{new Date(candidate.appliedAt).toLocaleDateString()}</td></tr>)}
            {!candidates.length && !error && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">No applications for this job yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
