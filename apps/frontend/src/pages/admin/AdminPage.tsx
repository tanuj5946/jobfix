import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { adminApi, type AdminUser, type QuestionSeedResult } from '../../api/admin';
import { skillsApi } from '../../api/skills';
import type { Skill } from '../../types';

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [role, setRole] = useState('Software Developer');
  const [countPerSkill, setCountPerSkill] = useState(10);
  const [result, setResult] = useState<QuestionSeedResult | null>(null);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    Promise.all([adminApi.listUsers(), skillsApi.list({})])
      .then(([loadedUsers, loadedSkills]) => {
        setUsers(loadedUsers);
        setSkills(loadedSkills.data);
      })
      .catch(() => setError('Unable to load admin data.'));
  }, []);

  const candidates = useMemo(() => users.filter(user => user.role === 'candidate'), [users]);
  const recruiters = useMemo(() => users.filter(user => user.role === 'recruiter'), [users]);
  const recommendedSkillNames = useMemo(() => getSkillsForRole(role), [role]);
  const displayedSkills = useMemo(
    () => recommendedSkillNames.length
      ? skills.filter(skill => recommendedSkillNames.includes(skill.name.toLowerCase()))
      : skills,
    [recommendedSkillNames, skills],
  );

  useEffect(() => {
    if (!recommendedSkillNames.length || !skills.length) return;
    setSelectedSkills(
      skills
        .filter(skill => recommendedSkillNames.includes(skill.name.toLowerCase()))
        .map(skill => skill.id),
    );
  }, [recommendedSkillNames, skills]);

  const toggleSkill = (id: number) => {
    setSelectedSkills(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  };

  const seed = async () => {
    if (!selectedSkills.length) {
      setError('Select at least one skill before seeding.');
      return;
    }
    setError('');
    setSeeding(true);
    try {
      setResult(await adminApi.seedQuestions({ role, skillIds: selectedSkills, countPerSkill }));
    } catch (cause) {
      if (axios.isAxiosError(cause)) {
        const response = cause.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
        const details = response?.errors
          ? Object.values(response.errors).flat().join(' ')
          : undefined;
        setError(details || response?.message || 'Question seeding failed.');
      } else {
        setError(cause instanceof Error ? cause.message : 'Question seeding failed.');
      }
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="mt-1 text-sm text-gray-500">Review platform users and seed question-bank content.</p>
      </div>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900">Seeded admin account</h2>
        <p className="mt-2 text-sm text-gray-600">Run <code>npm run seed:admin</code> in <code>apps/core-service</code> before signing in.</p>
        <p className="mt-2 text-sm text-gray-600">The email and password come from <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code>; default development values are documented in <code>.env.example</code>.</p>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900">Question-bank seeding</h2>
        <p className="mt-1 text-sm text-gray-500">Select one or more skills. Each selected skill is generated and stored independently.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Target role<input className="input mt-1 w-full" value={role} onChange={event => setRole(event.target.value)} placeholder="e.g. Frontend Developer" /></label>
          <label className="text-sm font-medium text-gray-700">Questions per skill<input className="input mt-1 w-full" type="number" min="1" max="25" value={countPerSkill} onChange={event => setCountPerSkill(Number(event.target.value))} /></label>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          {recommendedSkillNames.length
            ? 'Skills have been selected based on the target role. You can adjust the selection.'
            : 'No role-specific skill set found; choose the skills to seed.'}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          {displayedSkills.map(skill => <label key={skill.id} className="flex items-center gap-2 rounded border border-gray-200 p-2 text-sm"><input type="checkbox" checked={selectedSkills.includes(skill.id)} onChange={() => toggleSkill(skill.id)} />{skill.name}</label>)}
        </div>
        <button className="btn-primary mt-4" disabled={seeding} onClick={seed}>{seeding ? 'Seeding…' : `Seed ${selectedSkills.length || ''} skill${selectedSkills.length === 1 ? '' : 's'}`}</button>
        {result && <p className="mt-3 text-sm text-emerald-700">Stored {result.stored} of {result.generated} generated questions.</p>}
      </section>

      <UserSection title="Candidates" users={candidates} />
      <UserSection title="Recruiters" users={recruiters} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function getSkillsForRole(role: string): string[] {
  const value = role.trim().toLowerCase();
  if (!value) return [];
  if (value.includes('frontend') || value.includes('front end')) {
    return ['javascript', 'react', 'html', 'css', 'git'];
  }
  if (value.includes('backend') || value.includes('back end')) {
    return ['python', 'java', 'node.js', 'sql', 'dbms', 'git'];
  }
  if (value.includes('full stack') || value.includes('fullstack')) {
    return ['javascript', 'react', 'node.js', 'html', 'css', 'sql', 'dbms', 'git'];
  }
  if (value.includes('data')) {
    if (value.includes('analyst')) {
      return ['excel', 'advanced excel', 'sql', 'power bi', 'tableau', 'data visualization', 'statistics', 'data cleaning', 'python', 'pandas'];
    }
    if (value.includes('engineer')) {
      return ['python', 'sql', 'postgresql', 'mongodb', 'etl', 'data modeling', 'apache airflow', 'docker'];
    }
    return ['python', 'sql', 'pandas', 'numpy', 'statistics', 'machine learning', 'data visualization'];
  }
  if (value.includes('devops') || value.includes('cloud')) {
    return ['aws', 'azure', 'google cloud', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'linux', 'git'];
  }
  if (value.includes('qa') || value.includes('test')) {
    return ['unit testing', 'integration testing', 'selenium', 'cypress', 'postman', 'jira', 'agile'];
  }
  if (value.includes('ui') || value.includes('ux') || value.includes('designer')) {
    return ['figma', 'ui design', 'ux research', 'wireframing', 'prototyping', 'accessibility'];
  }
  if (value.includes('mobile') || value.includes('android') || value.includes('ios')) {
    return ['android development', 'ios development', 'react native', 'flutter', 'kotlin', 'swift', 'git'];
  }
  if (value.includes('java')) {
    return ['java', 'oops concept', 'data structures', 'algorithms', 'dbms', 'git'];
  }
  if (value.includes('software') || value.includes('developer') || value.includes('engineer')) {
    return ['python', 'java', 'javascript', 'c++', 'sql', 'data structures', 'algorithms', 'oops concept', 'git'];
  }
  return [];
}

function UserSection({ title, users }: { title: string; users: AdminUser[] }) {
  return <section className="card overflow-hidden"><div className="border-b border-gray-200 px-5 py-4"><h2 className="text-lg font-semibold text-gray-900">{title} ({users.length})</h2></div><div className="divide-y divide-gray-100">{users.map(user => <details key={user.id} className="px-5 py-4"><summary className="cursor-pointer font-medium text-gray-900">{user.name} <span className="ml-2 text-sm font-normal text-gray-500">{user.email}</span></summary>{user.candidateProfile && <div className="mt-3 text-sm text-gray-600"><p>Target role: {user.candidateProfile.targetRole ?? 'Not selected'}</p><p>Skills: {user.candidateProfile.candidateSkills.map(item => item.skill.name).join(', ') || 'None'}</p><p>Assessments: {user.candidateProfile.assessments.length}</p></div>}{user.recruiterProfile && <div className="mt-3 text-sm text-gray-600"><p>Company: {user.recruiterProfile.companyName}</p><p>Industry: {user.recruiterProfile.industry ?? 'Not specified'}</p><p>Jobs: {user.recruiterProfile.jobs.map(job => job.title).join(', ') || 'None'}</p></div>}</details>)}{users.length === 0 && <p className="px-5 py-4 text-sm text-gray-500">No {title.toLowerCase()} yet.</p>}</div></section>;
}
