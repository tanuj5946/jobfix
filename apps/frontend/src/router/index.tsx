import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '../layouts/AppShell';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleGuard } from '../components/RoleGuard';

// Auth pages
import { LandingPage } from '../pages/LandingPage';
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage').then(module => ({ default: module.RegisterPage })));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage').then(module => ({ default: module.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));

// Candidate pages
const CandidateDashboardPage = lazy(() => import('../pages/candidate/DashboardPage').then(module => ({ default: module.CandidateDashboardPage })));
const ResumeUploadPage = lazy(() => import('../pages/candidate/ResumeUploadPage').then(module => ({ default: module.ResumeUploadPage })));
const SkillSelectionPage = lazy(() => import('../pages/candidate/SkillSelectionPage').then(module => ({ default: module.SkillSelectionPage })));
const AssessmentPage = lazy(() => import('../pages/candidate/AssessmentPage').then(module => ({ default: module.AssessmentPage })));
const AssessmentResultsPage = lazy(() => import('../pages/candidate/AssessmentResultsPage').then(module => ({ default: module.AssessmentResultsPage })));
const VerifiedProfilePage = lazy(() => import('../pages/candidate/VerifiedProfilePage').then(module => ({ default: module.VerifiedProfilePage })));
const CareerCoachPage = lazy(() => import('../pages/candidate/CareerCoachPage').then(module => ({ default: module.CareerCoachPage })));
const CandidateJobsPage = lazy(() => import('../pages/candidate/JobsPage').then(module => ({ default: module.CandidateJobsPage })));
const ApplicationsPage = lazy(() => import('../pages/candidate/ApplicationsPage').then(module => ({ default: module.ApplicationsPage })));

// Recruiter pages
const RecruiterDashboardPage = lazy(() => import('../pages/recruiter/DashboardPage').then(module => ({ default: module.RecruiterDashboardPage })));
const PostJobPage = lazy(() => import('../pages/recruiter/PostJobPage').then(module => ({ default: module.PostJobPage })));
const RankedCandidatesPage = lazy(() => import('../pages/recruiter/RankedCandidatesPage').then(module => ({ default: module.RankedCandidatesPage })));
const CandidateDetailPage = lazy(() => import('../pages/recruiter/CandidateDetailPage').then(module => ({ default: module.CandidateDetailPage })));
const CompanyPage = lazy(() => import('../pages/recruiter/CompanyPage').then(module => ({ default: module.CompanyPage })));
const AdminPage = lazy(() => import('../pages/admin/AdminPage').then(module => ({ default: module.AdminPage })));

// Shared
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage').then(module => ({ default: module.UnauthorizedPage })));
import { FEATURES } from '../config/features';

function PageLoader() {
  return <div className="py-12 text-center text-sm text-slate-500">Loading page…</div>;
}

function loadPage(page: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{page}</Suspense>;
}

export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────
  { path: '/',         element: <LandingPage /> },
  { path: '/login',    element: loadPage(<LoginPage />) },
  { path: '/register', element: loadPage(<RegisterPage />) },
  { path: '/verify-email', element: loadPage(<VerifyEmailPage />) },
  { path: '/forgot-password', element: loadPage(<ForgotPasswordPage />) },
  { path: '/reset-password', element: loadPage(<ResetPasswordPage />) },
  { path: '/unauthorized', element: loadPage(<UnauthorizedPage />) },

  // ── Protected shell ──────────────────────────────────────
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      // ── Candidate routes ──────────────────────────────────
      {
        path: 'candidate',
        element: <RoleGuard allowedRole="candidate" />,
        children: [
          { index: true,               element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',         element: loadPage(<CandidateDashboardPage />) },
          { path: 'resume-upload',     element: loadPage(<ResumeUploadPage />) },
          { path: 'skills',            element: loadPage(<SkillSelectionPage />) },
          { path: 'assessment',        element: loadPage(<AssessmentPage />) },
          { path: 'assessment/:id/results', element: loadPage(<AssessmentResultsPage />) },
          { path: 'profile',           element: loadPage(<VerifiedProfilePage />) },
          ...(FEATURES.CAREER_COACH
            ? [{ path: 'career-coach', element: loadPage(<CareerCoachPage />) }]
            : []),
          { path: 'jobs',              element: loadPage(<CandidateJobsPage />) },
          { path: 'applications',      element: loadPage(<ApplicationsPage />) },
        ],
      },

      // ── Recruiter routes ──────────────────────────────────
      {
        path: 'recruiter',
        element: <RoleGuard allowedRole="recruiter" />,
        children: [
          { index: true,                        element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',                  element: loadPage(<RecruiterDashboardPage />) },
          { path: 'jobs/new',                   element: loadPage(<PostJobPage />) },
           { path: 'jobs/:jobId/candidates',     element: loadPage(<RankedCandidatesPage />) },
           { path: 'candidates/:candidateId',    element: loadPage(<CandidateDetailPage />) },
           { path: 'company',                     element: loadPage(<CompanyPage />) },
        ],
      },
      {
        path: 'admin',
        element: <RoleGuard allowedRole="admin" />,
        children: [
          { index: true, element: loadPage(<AdminPage />) },
          { path: 'analytics', element: loadPage(<AdminPage />) },
          { path: 'people', element: loadPage(<AdminPage />) },
          { path: 'operations', element: loadPage(<AdminPage />) },
          { path: 'question-bank', element: loadPage(<AdminPage />) },
        ],
      },
    ],
  },

  // ── 404 ──────────────────────────────────────────────────
  { path: '*', element: loadPage(<NotFoundPage />) },
]);
