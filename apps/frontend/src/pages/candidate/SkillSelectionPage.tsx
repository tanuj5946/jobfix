import { Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { candidatesApi } from '../../api/candidates';
import { skillsApi } from '../../api/skills';
import type { CandidateJobRecommendations, CandidateSkill, ParsedResume, Skill } from '../../types';

interface SkillSelectionLocationState {
  parsedResume?: ParsedResume;
}

export function SkillSelectionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const parsedResume = (location.state as SkillSelectionLocationState | null)?.parsedResume;
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);
  const [profileTargetRole, setProfileTargetRole] = useState<string | null>(parsedResume?.target_role_guess ?? null);
  const [recommendations, setRecommendations] = useState<CandidateJobRecommendations | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedCount = selectedSkillIds.size;

  const selectedSkillNames = useMemo(() => {
    const namesById = new Map(candidateSkills.map(item => [item.skillId, item.skill.name]));
    for (const skill of searchResults) {
      namesById.set(skill.id, skill.name);
    }
    return Array.from(selectedSkillIds)
      .map(id => namesById.get(id))
      .filter((name): name is string => Boolean(name));
  }, [candidateSkills, searchResults, selectedSkillIds]);

  const loadRecommendations = async () => {
    setRecommendationsLoading(true);
    try {
      const result = await candidatesApi.getJobRecommendations();
      setRecommendations(result);
      setProfileTargetRole(result.targetRole);
    } catch {
      setRecommendations(null);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadSkills = async () => {
      setLoading(true);
      setError('');
      try {
        const skills = await candidatesApi.getSkills();
        if (ignore) return;
        setCandidateSkills(skills);
        setSelectedSkillIds(new Set(skills.map(item => item.skillId)));
        void loadRecommendations();
      } catch (err) {
        if (ignore) return;
        setError(getErrorMessage(err, 'Could not load skills from your parsed resume.'));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void loadSkills();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const query = search.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const result = await skillsApi.list({ search: query });
        if (!ignore) setSearchResults(result.data);
      } catch {
        if (!ignore) setSearchResults([]);
      } finally {
        if (!ignore) setSearching(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  const toggleSkill = (skillId: number) => {
    setSuccess('');
    setSelectedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await candidatesApi.confirmSkills(Array.from(selectedSkillIds));
      setCandidateSkills(updated);
      setSelectedSkillIds(new Set(updated.map(item => item.skillId)));
      await loadRecommendations();
      setSuccess('Skills confirmed. Starting your assessment...');
      window.setTimeout(() => navigate('/candidate/assessment'), 650);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not confirm selected skills.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 p-6 text-white shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Skill selection</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Refine your profile before the interview</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Review the skills detected from your resume, add anything important, and keep the recommendations aligned with your strongest fit.</p>
      </div>

      {(parsedResume || profileTargetRole) && (
        <section className="card p-5">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Parsed role</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{profileTargetRole ?? parsedResume?.target_role_guess ?? 'Role not detected'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Resume summary</p>
              <p className="mt-1 text-sm text-slate-600">{parsedResume?.summary ?? 'Resume details saved. Confirm skills to refresh job recommendations.'}</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Detected skills</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedCount} selected</p>
            </div>
            <button type="button" onClick={handleConfirm} disabled={saving || selectedCount === 0} className="btn-primary">
              {saving ? 'Confirming...' : 'Confirm skills and continue'}
            </button>
          </div>

          {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {success && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

          <div className="mt-5">
            {loading ? (
              <p className="text-sm text-slate-500">Loading parsed resume skills...</p>
            ) : candidateSkills.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-500">
                No parsed skills found yet. Upload a resume first, then return here.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {candidateSkills.map(item => (
                  <label key={item.id} className="flex cursor-pointer items-center justify-between gap-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{item.skill.name}</span>
                      <span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="badge bg-slate-100 text-slate-700">{formatSource(item.source)}</span>
                        {item.parseConfidence !== null && (
                          <span className="badge bg-blue-50 text-blue-700">{Math.round(item.parseConfidence * 100)}% confidence</span>
                        )}
                      </span>
                    </span>
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-2">
                      <input type="checkbox" checked={selectedSkillIds.has(item.skillId)} onChange={() => toggleSkill(item.skillId)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="text-base font-semibold text-slate-900">Add skills</h2>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input type="search" value={search} onChange={event => setSearch(event.target.value)} className="w-full bg-transparent text-sm text-slate-700 outline-none" placeholder="Search skill name" />
            </div>
            <div className="mt-3 space-y-2">
              {searching && <p className="text-sm text-slate-500">Searching...</p>}
              {!searching && search.trim().length >= 2 && searchResults.length === 0 && <p className="text-sm text-slate-500">No matching skills found.</p>}
              {searchResults.map(skill => (
                <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)} className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm transition-all ${selectedSkillIds.has(skill.id) ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  <span className="truncate">{skill.name}</span>
                  <span className="ml-3 text-xs font-semibold">{selectedSkillIds.has(skill.id) ? 'Selected' : 'Add'}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold text-slate-900">Selected</h2>
            {selectedSkillNames.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Choose at least one skill.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedSkillNames.map(name => (
                  <span key={name} className="badge bg-blue-50 text-blue-700">{name}</span>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">Available job titles</h2>
            </div>
            {recommendationsLoading ? (
              <p className="mt-3 text-sm text-slate-500">Finding matching jobs...</p>
            ) : !recommendations || recommendations.jobTitles.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No published jobs match this resume yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {recommendations.jobTitles.slice(0, 6).map(title => <span key={title} className="badge bg-emerald-50 text-emerald-700">{title}</span>)}
                </div>
                <div className="space-y-2">
                  {recommendations.recommendations.slice(0, 4).map(item => (
                    <div key={item.job.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{item.job.title}</p>
                        <span className="shrink-0 text-xs font-semibold text-blue-600">{item.matchScore}%</span>
                      </div>
                      {item.matchedSkills.length > 0 && <p className="mt-1 truncate text-xs text-slate-500">Matches {item.matchedSkills.slice(0, 3).join(', ')}</p>}
                    </div>
                  ))}
                </div>
                <Link to="/candidate/assessment" className="btn-secondary w-full">
                  Continue to assessment
                </Link>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function formatSource(source: CandidateSkill['source']) {
  return source === 'auto_detected' ? 'Resume parsed' : 'Confirmed';
}

function getErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
  }

  return fallback;
}
