import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { adminApi, type AnalyticsDashboard, type AdminOverview, type AdminUser, type QuestionSeedResult } from '../../api/admin';
import { skillsApi } from '../../api/skills';
import type { Skill } from '../../types';

export function AdminPage() {
  const { pathname } = useLocation();
  const section = pathname.split('/')[2] || 'overview';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [role, setRole] = useState('Software Developer');
  const [countPerSkill, setCountPerSkill] = useState(10);
  const [result, setResult] = useState<QuestionSeedResult | null>(null);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    Promise.all([adminApi.listUsers(), skillsApi.list({}), adminApi.getOverview(), adminApi.getAnalytics()])
      .then(([loadedUsers, loadedSkills, loadedOverview, loadedAnalytics]) => {
        setUsers(loadedUsers);
        setSkills(loadedSkills.data);
        setOverview(loadedOverview);
        setAnalytics(loadedAnalytics);
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

  const sectionInfo: Record<string, { title: string; description: string }> = {
    overview: { title: 'Admin overview', description: 'Monitor the health of the JobFix platform at a glance.' },
    analytics: { title: 'Analytics', description: 'Review platform growth, hiring activity, and assessment performance.' },
    people: { title: 'People', description: 'Review candidate and recruiter accounts.' },
    operations: { title: 'Operations', description: 'Track companies, jobs, and applications across the platform.' },
    'question-bank': { title: 'Question bank', description: 'Maintain assessment coverage and generate new question sets.' },
  };
  const currentSection = sectionInfo[section] ?? sectionInfo.overview;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{currentSection.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{currentSection.description}</p>
      </div>

      {section === 'overview' && <>
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900">Seeded admin account</h2>
          <p className="mt-2 text-sm text-gray-600">Run <code>npm run seed:admin</code> in <code>apps/core-service</code> before signing in.</p>
          <p className="mt-2 text-sm text-gray-600">The email and password come from <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code>; default development values are documented in <code>.env.example</code>.</p>
        </section>
        {analytics && <AnalyticsDashboardPanel analytics={analytics} />}
      </>}

      {section === 'analytics' && analytics && <AnalyticsDashboardPanel analytics={analytics} />}
      {section === 'operations' && overview && <AdminOperations overview={overview} />}

      {section === 'question-bank' && <section className="card p-5">
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
      }

      {section === 'question-bank' && overview && <QuestionCoverageTable coverage={overview.questionCoverage} />}
      {section === 'people' && <>
        <UserSection title="Candidates" users={candidates} />
        <UserSection title="Recruiters" users={recruiters} />
      </>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function AnalyticsDashboardPanel({ analytics }: { analytics: AnalyticsDashboard }) {
  const summary = analytics.summary;
  return <section className="space-y-4">
    <div><h2 className="text-xl font-bold text-gray-900">Analytics dashboard</h2><p className="mt-1 text-sm text-gray-500">Live platform, assessment-pipeline, and job-demand metrics.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard title="Total candidates" value={summary.totalCandidates} detail="Candidate profiles" />
      <StatCard title="Total recruiters" value={summary.totalRecruiters} detail="Recruiter profiles" />
      <StatCard title="Jobs posted" value={summary.jobsPosted} detail="All job statuses" />
      <StatCard title="Applications" value={summary.applications} detail="Candidate submissions" />
      <StatCard title="Assessments" value={summary.assessments} detail="Created assessments" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <RateCard title="Question retrieval rate" value={summary.questionRetrievalRate} detail={`${summary.questionPipeline.retrieved} retrieved from the question bank`} />
      <RateCard title="Question generation rate" value={summary.questionGenerationRate} detail={`${summary.questionPipeline.generated} generated by AI`} />
      <RateCard title="Average resume match" value={summary.averageResumeMatch} detail="Across all applications" />
      <RateCard title="Average assessment score" value={summary.averageAssessmentScore} detail="Completed assessment results" />
    </div>
    <section className="card p-5"><h3 className="text-lg font-semibold text-gray-900">Most requested skills</h3><p className="mt-1 text-sm text-gray-500">Ranked by the number of jobs that require each skill.</p><div className="mt-4 flex flex-wrap gap-2">{analytics.mostRequestedSkills.map((skill, index) => <span key={skill.id} className="rounded-full bg-indigo-50 px-3 py-2 text-sm text-indigo-800">#{index + 1} {skill.name} <span className="text-indigo-600">({skill.requestedByJobs})</span></span>)}{analytics.mostRequestedSkills.length === 0 && <span className="text-sm text-gray-500">No job skill demand has been recorded yet.</span>}</div></section>
  </section>;
}

function AdminOperations({ overview }: { overview: AdminOverview }) {
  const { statistics } = overview;
  return <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Candidates" value={statistics.candidates.total} detail={`${statistics.candidates.withResume} resumes · ${statistics.candidates.applications} applications`} />
      <StatCard title="Recruiters" value={statistics.recruiters.total} detail={`${statistics.recruiters.withCompany} companies · ${statistics.recruiters.jobs} jobs`} />
      <StatCard title="Assessments" value={statistics.assessments.total} detail={`${statistics.assessments.completed} completed · ${formatScore(statistics.assessments.averageScore)} average`} />
      <StatCard title="Question bank" value={statistics.questionBank.total} detail={`${overview.questionCoverage.length} role-skill coverage entries`} />
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <MetricPanel title="Question-bank statistics" values={statistics.questionBank.byType} />
      <MetricPanel title="Question coverage by difficulty" values={statistics.questionBank.byDifficulty} />
      <MetricPanel title="Application status" values={statistics.applications.byStatus} />
      <MetricPanel title="Assessment statistics" values={statistics.assessments.byStatus} />
    </section>

    <ManagementTable title="Manage companies" empty="No companies have been created." headers={['Company', 'Recruiter', 'Industry', 'Jobs']}>
      {overview.companies.map(company => <tr key={company.id}><td className="font-medium">{company.name}</td><td>{company.recruiterName}<br /><span className="text-xs text-gray-500">{company.recruiterEmail}</span></td><td>{company.industry ?? '—'}</td><td>{company.jobCount}</td></tr>)}
    </ManagementTable>
    <ManagementTable title="Manage jobs" empty="No jobs have been created." headers={['Job', 'Company', 'Status', 'Skills', 'Applications']}>
      {overview.jobs.map(job => <tr key={job.id}><td className="font-medium">{job.title}<br /><span className="text-xs text-gray-500">AI: {job.analysisStatus}</span></td><td>{job.companyName ?? job.recruiterName}</td><td className="capitalize">{job.status}</td><td>{job.skillCount}</td><td>{job.applicationCount}</td></tr>)}
    </ManagementTable>
    <ManagementTable title="Manage applications" empty="No applications have been submitted." headers={['Candidate', 'Job', 'Status', 'Resume match', 'Assessment']}>
      {overview.applications.map(application => <tr key={application.id}><td className="font-medium">{application.candidateName}<br /><span className="text-xs text-gray-500">{application.candidateEmail}</span></td><td>{application.jobTitle}</td><td className="capitalize">{application.status}</td><td>{application.resumeMatchScore.toFixed(1)}%</td><td>{application.assessmentScore === null ? application.assessmentStatus ?? 'Not started' : `${application.assessmentScore.toFixed(1)}%`}</td></tr>)}
    </ManagementTable>
  </>;
}

function QuestionCoverageTable({ coverage }: { coverage: AdminOverview['questionCoverage'] }) {
  return <ManagementTable title="Question coverage" empty="No question-bank coverage is available." headers={['Role', 'Skill', 'Questions']}>
    {coverage.map(item => <tr key={`${item.role}-${item.skill}`}><td>{item.role}</td><td className="font-medium">{item.skill}</td><td>{item.questionCount}</td></tr>)}
  </ManagementTable>;
}

function StatCard({ title, value, detail }: { title: string; value: number; detail: string }) {
  return <div className="card p-5"><p className="text-sm font-medium text-gray-500">{title}</p><p className="mt-1 text-3xl font-bold text-gray-900">{value}</p><p className="mt-2 text-xs text-gray-500">{detail}</p></div>;
}

function RateCard({ title, value, detail }: { title: string; value: number | null; detail: string }) {
  return <div className="card p-5"><p className="text-sm font-medium text-gray-500">{title}</p><p className="mt-1 text-3xl font-bold text-gray-900">{value === null ? '—' : `${value.toFixed(1)}%`}</p><p className="mt-2 text-xs text-gray-500">{detail}</p></div>;
}

function MetricPanel({ title, values }: { title: string; values: Record<string, number> }) {
  return <section className="card p-5"><h2 className="text-lg font-semibold text-gray-900">{title}</h2><div className="mt-3 flex flex-wrap gap-2">{Object.entries(values).map(([key, value]) => <span key={key} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"><span className="capitalize">{key.replace(/_/g, ' ')}</span>: {value}</span>)}{Object.keys(values).length === 0 && <span className="text-sm text-gray-500">No data yet.</span>}</div></section>;
}

function ManagementTable({ title, headers, empty, children }: { title: string; headers: string[]; empty: string; children: React.ReactNode }) {
  const rows = Array.isArray(children) ? children : [children];
  return <section className="card overflow-hidden"><div className="border-b border-gray-200 px-5 py-4"><h2 className="text-lg font-semibold text-gray-900">{title}</h2><p className="mt-1 text-sm text-gray-500">Operational changes continue through the existing feature workflows.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{headers.map(header => <th key={header} className="px-5 py-3 font-medium">{header}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 text-gray-700">{rows.length ? children : <tr><td className="px-5 py-4 text-gray-500" colSpan={headers.length}>{empty}</td></tr>}</tbody></table></div></section>;
}

function formatScore(value: number | null) { return value === null ? 'No scores yet' : `${value.toFixed(1)}%`; }

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
