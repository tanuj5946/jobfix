import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Award,
  Zap,
  TrendingUp,
  Briefcase,
  Compass,
  GraduationCap,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll event listener for changing navbar opacity
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      const destination = user.role === 'recruiter'
        ? '/recruiter/dashboard'
        : user.role === 'admin'
          ? '/admin'
          : '/candidate/dashboard';
      navigate(destination);
    } else {
      navigate('/register');
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "How does the AI assessment work?",
      a: "JobFix uses advanced NLP models to evaluate candidates' technical skills and conceptual understanding through adaptive questionnaires. Rather than relying on simple keyword matching, our system evaluates the actual substance of answers and coding tasks to produce a verified Skill Score."
    },
    {
      q: "Is JobFix free for candidates?",
      a: "Yes! JobFix is free for candidates looking to showcase their verified skills, take AI-powered assessments, and get matched directly with hiring recruiters."
    },
    {
      q: "Can recruiters create custom assessments?",
      a: "Absolutely. Recruiters can specify target roles, experience levels, and required skill frameworks. The JobFix AI pipeline then dynamically configures conceptual and technical questions tailored to that job description."
    },
    {
      q: "Is my resume and data secure?",
      a: "We prioritize security. All user profiles, resumes, and assessment records are fully encrypted and only visible to authorized recruiters matching your target job specifications."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-600/20">
      
      {/* ── STICKY NAVBAR ────────────────────────────────────────── */}
      <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.03)] backdrop-blur-md border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Brain className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Job<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Fix</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#why-us" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">About</a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">FAQ</a>
          </nav>

          {/* Right Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <button onClick={handleGetStarted} className="btn-primary py-2 px-5 rounded-xl text-sm">
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                  Login
                </Link>
                <button onClick={handleGetStarted} className="btn-primary py-2 px-5 rounded-xl text-sm">
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white/95 px-6 py-6 shadow-xl backdrop-blur-md space-y-4">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-slate-700 hover:text-blue-600"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-slate-700 hover:text-blue-600"
            >
              How It Works
            </a>
            <a 
              href="#why-us" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-slate-700 hover:text-blue-600"
            >
              About
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-slate-700 hover:text-blue-600"
            >
              FAQ
            </a>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              {isAuthenticated ? (
                <button onClick={handleGetStarted} className="btn-primary w-full py-2.5 rounded-xl text-sm">
                  Dashboard
                </button>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex justify-center py-2.5 text-base font-semibold text-slate-700 hover:text-slate-900"
                  >
                    Login
                  </Link>
                  <button onClick={handleGetStarted} className="btn-primary w-full py-2.5 rounded-xl text-sm">
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute top-10 right-1/4 -z-10 h-[450px] w-[450px] translate-x-1/2 rounded-full bg-cyan-400/10 blur-[100px]" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left Column Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/50 px-3 py-1 text-xs font-semibold text-blue-700 tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Next-Gen Hiring Powered by AI</span>
              </div>

              {/* Big Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Hire Smarter.<br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                  Get Hired Faster.
                </span>
              </h1>

              {/* Subheading */}
              <p className="mx-auto lg:mx-0 max-w-xl text-lg text-slate-600 leading-relaxed">
                JobFix evaluates technical talent through adaptive AI-powered assessments instead of relying purely on resume keywords. Get verified skill scores and direct hiring pipelines.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button onClick={handleGetStarted} className="btn-primary w-full sm:w-auto px-8 py-3 rounded-2xl text-base shadow-xl shadow-blue-500/25">
                  Get Started
                </button>
                <Link to="/login" className="btn-secondary w-full sm:w-auto px-8 py-3 rounded-2xl text-base">
                  Explore Login
                </Link>
              </div>

              {/* Trust markers */}
              <div className="pt-6 border-t border-slate-200/50 flex flex-wrap justify-center lg:justify-start items-center gap-6 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-blue-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Verified Profiles</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-indigo-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Skill-based Assessment</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4.5 w-4.5 text-cyan-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Instant AI Insights</span>
                </div>
              </div>
            </div>

            {/* Right Column Dashboard Mockup Illustration */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-[450px] lg:max-w-none">
                
                {/* Glow ring */}
                <div className="absolute -inset-0.5 rounded-[32px] bg-gradient-to-tr from-blue-500 to-cyan-500 opacity-20 blur-lg" />
                
                {/* Dashboard Card Preview Container */}
                <div className="relative rounded-[30px] border border-slate-200/60 bg-white p-6 shadow-2xl shadow-slate-900/10">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-yellow-400" />
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="ml-2 text-xs font-medium text-slate-400">jobfix-ai-workspace v1.4</span>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">Active</span>
                  </div>

                  {/* Profile Match Score */}
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">AI Profile Match Score</span>
                        <span className="text-sm font-bold text-blue-600">94%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full w-[94%] bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full" />
                      </div>
                    </div>

                    {/* Skill verification scores */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Verified Tech Stack</span>
                      
                      <div className="flex items-center justify-between text-xs p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-700">TypeScript / React</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Advanced</span>
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-700">PostgreSQL / Prisma</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Intermediate</span>
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-700">Express / Node.js</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Advanced</span>
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                      </div>
                    </div>

                    {/* AI Assessment Result card overlay */}
                    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white space-y-2.5 shadow-xl">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs font-medium text-slate-300">AI Assessment Analytics</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        "Candidate demonstrates exceptional design patterns, solid API error handling, and clean code hygiene."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating Decorative Elements */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-lg flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                    <p className="text-xs font-semibold text-slate-800">Email Verified</p>
                  </div>
                </div>

                <div className="absolute -top-6 -right-6 bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-lg flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Matches</p>
                    <p className="text-xs font-semibold text-slate-800">12 High Priority</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ───────────────────────────────────── */}
      <section id="features" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600">Features</h2>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Modern features built for contemporary recruitment
            </p>
            <p className="text-base text-slate-500">
              Skip keyword filtering. Focus purely on validated technical competence.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            
            {/* Feature 1 */}
            <div className="group rounded-3xl border border-slate-100 bg-slate-50/50 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl hover:shadow-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI Resume Analysis</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Automatically analyze complex resume layouts, structures, and skill profiles to matches candidates to optimized target roles.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-3xl border border-slate-100 bg-slate-50/50 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl hover:shadow-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI Skill Assessment</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Experience adaptive coding and conceptual assessments that grade candidates on actual application output and core principles.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-3xl border border-slate-100 bg-slate-50/50 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl hover:shadow-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Verified Profiles</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Candidates must verify email addresses and complete skill validation. Only authenticated candidates showcase to recruiters.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-3xl border border-slate-100 bg-slate-50/50 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl hover:shadow-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Recruiter Insights</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track candidate rankings dynamically based on skill profiles. Sort and view AI generated report breakdown card.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group rounded-3xl border border-slate-100 bg-slate-50/50 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl hover:shadow-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Learning Recommendations</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dynamically receive courses, articles, or practice recommended specifically targeting areas that scored below benchmark levels.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group rounded-3xl border border-slate-100 bg-slate-50/50 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl hover:shadow-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Actionable Matching</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Direct matching logic that aligns recruiter target parameters with real candidate skill results, bypassing long screening pipelines.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600">Workflow</h2>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Simplicity at every step
            </p>
            <p className="text-base text-slate-500">
              We streamlined candidate verification and recruiter matching.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-2">
            
            {/* For Candidates */}
            <div className="space-y-8 bg-white rounded-3xl border border-slate-200/50 p-8 sm:p-10 shadow-lg shadow-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">For Candidates</h3>
              </div>

              <div className="relative border-l border-slate-100 pl-6 ml-4 space-y-6">
                
                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-blue-600 bg-white" />
                  <h4 className="text-sm font-bold text-slate-900">1. Verify Your Email First</h4>
                  <p className="text-xs text-slate-500 mt-1">Submit registration details, receive a token link in your email, and unlock account creation securely.</p>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-200 bg-white" />
                  <h4 className="text-sm font-bold text-slate-900">2. Upload & Parse Resume</h4>
                  <p className="text-xs text-slate-500 mt-1">Let the JobFix AI engine automatically extract target role, experiences, and technical skill categorizations.</p>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-200 bg-white" />
                  <h4 className="text-sm font-bold text-slate-900">3. Take Skill Assessments</h4>
                  <p className="text-xs text-slate-500 mt-1">Complete dynamically generated tests matching your focus skills to prove functional ability.</p>
                </div>

                {/* Step 4 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-200 bg-white" />
                  <h4 className="text-sm font-bold text-slate-900">4. Match With Recruiters</h4>
                  <p className="text-xs text-slate-500 mt-1">Get directly listed on recruiter search rankings based on verified scores, bypassing filters.</p>
                </div>

              </div>
            </div>

            {/* For Recruiters */}
            <div className="space-y-8 bg-white rounded-3xl border border-slate-200/50 p-8 sm:p-10 shadow-lg shadow-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">For Recruiters</h3>
              </div>

              <div className="relative border-l border-slate-100 pl-6 ml-4 space-y-6">
                
                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-indigo-600 bg-white" />
                  <h4 className="text-sm font-bold text-slate-900">1. Setup Recruiter Profile</h4>
                  <p className="text-xs text-slate-500 mt-1">Register verified company details and configure team roles to initiate your workspace.</p>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-200 bg-white" />
                  <h4 className="text-sm font-bold text-slate-900">2. Post Jobs & Prerequisites</h4>
                  <p className="text-xs text-slate-500 mt-1">Detail responsibilities and key skill targets. AI automatically indexes candidate pools.</p>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-200 bg-white" />
                  <h4 className="text-sm font-bold text-slate-900">3. Review AI Ranked Candidates</h4>
                  <p className="text-xs text-slate-500 mt-1">View applicant matches prioritized by direct assessment ratings, verified levels, and resume suitability.</p>
                </div>

                {/* Step 4 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-200 bg-white" />
                  <h4 className="text-sm font-bold text-slate-900">4. Interview & Hire Directly</h4>
                  <p className="text-xs text-slate-500 mt-1">Initiate interviews with reliable insight logs already prepared, drastically speeding up cycle times.</p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE JOBFIX SECTION ───────────────────────────── */}
      <section id="why-us" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            
            {/* Left text */}
            <div className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-600">Why JobFix</h2>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Fair, Skill-Based Hiring Made Easy
              </p>
              <p className="text-base text-slate-600">
                Traditional platforms filter by years of experience or university name, missing top tier talent. JobFix measures actual output.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Fair Skill-Based Hiring</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Focus solely on functional test outcomes and verified proficiencies.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">AI-Driven Adaptive Assessments</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Tests adapt to the applicant to truly measure deep technical understanding.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Actionable Upskilling Recommendations</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Personalized links help candidate bridge identified gaps automatically.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side illustration / graphic */}
            <div className="relative rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-950 p-8 sm:p-12 text-white overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
              
              <div className="space-y-6 relative">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">The Assessment Pipeline</span>
                <h3 className="text-2xl font-bold tracking-tight">How our models map credentials to capabilities</h3>
                
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-300">Resume Parsed JSON</span>
                    <span className="font-semibold text-emerald-400">Success</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-300">Target Role Recommendation</span>
                    <span className="font-semibold text-emerald-400">Software Engineer</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-300">Adaptive Question Batch</span>
                    <span className="font-semibold text-emerald-400">Generated</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Overall Capability Mapping</span>
                    <span className="font-semibold text-cyan-400">92% Matches</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-sm">
                  <p className="text-xs leading-relaxed text-slate-200">
                    JobFix has reduced recruiter screening timelines by up to <span className="font-bold text-white">65%</span>, while increasing candidate test-to-hire conversion ratios.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ───────────────────────────────── */}
      <section className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600">Testimonials</h2>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Trusted by tech companies and graduates
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            
            {/* Testimonial 1 */}
            <div className="bg-white rounded-3xl border border-slate-200/50 p-8 shadow-sm flex flex-col justify-between">
              <p className="text-sm text-slate-600 italic leading-relaxed">
                "As a fresher without an elite university label, I struggled to pass automated resume screeners. JobFix verified my React expertise and got me hired in weeks."
              </p>
              <div className="flex items-center gap-3.5 mt-6 pt-6 border-t border-slate-100">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-sm shrink-0">
                  AR
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Arjun Rao</h4>
                  <p className="text-[11px] text-slate-500">Junior Frontend Developer</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-3xl border border-slate-200/50 p-8 shadow-sm flex flex-col justify-between">
              <p className="text-sm text-slate-600 italic leading-relaxed">
                "Our sourcing team was overwhelmed by resume spam. JobFix sorted candidate list dynamically using live test scores, reducing time-to-hire immensely."
              </p>
              <div className="flex items-center gap-3.5 mt-6 pt-6 border-t border-slate-100">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center text-sm shrink-0">
                  SL
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Sarah Low</h4>
                  <p className="text-[11px] text-slate-500">HR Manager, Tech Corp</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-3xl border border-slate-200/50 p-8 shadow-sm flex flex-col justify-between">
              <p className="text-sm text-slate-600 italic leading-relaxed">
                "The adaptive technical tests are incredibly accurate. They focus on practical logic rather than pure theory, ensuring candidate competence matches real job needs."
              </p>
              <div className="flex items-center gap-3.5 mt-6 pt-6 border-t border-slate-100">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-bold flex items-center justify-center text-sm shrink-0">
                  MK
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Manoj Kumar</h4>
                  <p className="text-[11px] text-slate-500">VP Engineering, SaaS Inc</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-white">
        <div className="mx-auto max-w-4xl px-6">
          
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600">FAQ</h2>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Frequently Asked Questions
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-50/50 transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left font-semibold text-slate-800 hover:text-blue-600"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${activeFaq === index ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                </button>
                
                {activeFaq === index && (
                  <div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed border-t border-slate-200/20 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── CALL TO ACTION SECTION ─────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative rounded-[40px] bg-gradient-to-br from-blue-600 to-indigo-900 p-8 sm:p-16 text-center text-white overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
            
            <div className="relative max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Ready to Build Your Career?
              </h2>
              <p className="text-base text-blue-100">
                Sign up today to upload your resume, take adaptive AI assessments, and show verified skill benchmarks to top recruiters.
              </p>
              <div className="pt-4">
                <button onClick={handleGetStarted} className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-base font-bold text-blue-900 hover:bg-slate-50 transition-all hover:scale-105 shadow-xl">
                  Get Started for Free
                  <ArrowRight className="ml-2 h-4.5 w-4.5 text-blue-900" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Col 1 */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
                <Brain className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">JobFix</span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-400">
              AI-Powered Hiring for the Next Generation of Talent.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Features</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#features" className="hover:text-white transition-colors">Resume Parsing</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Skill Assessments</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Recruiter Dashboards</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#why-us" className="hover:text-white transition-colors">About Us</a></li>
              <li><span className="text-slate-500 cursor-not-allowed">Terms & Conditions</span></li>
              <li><span className="text-slate-500 cursor-not-allowed">Privacy Policy</span></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Contact & Socials</h4>
            <ul className="space-y-2.5 text-xs">
              <li><span className="hover:text-white transition-colors">support@jobfix.ai</span></li>
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub Repository</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a></li>
            </ul>
          </div>

        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} JobFix AI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
