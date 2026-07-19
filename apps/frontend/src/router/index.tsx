import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '../layouts/AppShell';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleGuard } from '../components/RoleGuard';

// Auth pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';

// Candidate pages
import { CandidateDashboardPage } from '../pages/candidate/DashboardPage';
import { ResumeUploadPage } from '../pages/candidate/ResumeUploadPage';
import { SkillSelectionPage } from '../pages/candidate/SkillSelectionPage';
import { AssessmentPage } from '../pages/candidate/AssessmentPage';
import { AssessmentResultsPage } from '../pages/candidate/AssessmentResultsPage';
import { VerifiedProfilePage } from '../pages/candidate/VerifiedProfilePage';
import { CareerCoachPage } from '../pages/candidate/CareerCoachPage';
import { CandidateJobsPage } from '../pages/candidate/JobsPage';
import { ApplicationsPage } from '../pages/candidate/ApplicationsPage';

// Recruiter pages
import { RecruiterDashboardPage } from '../pages/recruiter/DashboardPage';
import { PostJobPage } from '../pages/recruiter/PostJobPage';
import { RankedCandidatesPage } from '../pages/recruiter/RankedCandidatesPage';
import { CandidateDetailPage } from '../pages/recruiter/CandidateDetailPage';
import { CompanyPage } from '../pages/recruiter/CompanyPage';
import { AdminPage } from '../pages/admin/AdminPage';

// Shared
import { NotFoundPage } from '../pages/NotFoundPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { useAuth } from '../auth/AuthContext';
import { FEATURES } from '../config/features';

function RoleHomeRedirect() {
  const { user } = useAuth();
  const role = user?.role;
  const destination = role === 'recruiter'
    ? '/recruiter/dashboard'
    : role === 'admin'
      ? '/admin'
      : '/candidate/dashboard';
  return <Navigate to={destination} replace />;
}

export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  // ── Protected shell ──────────────────────────────────────
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      // Root → redirect based on role (handled in AppShell)
      { index: true, element: <RoleHomeRedirect /> },

      // ── Candidate routes ──────────────────────────────────
      {
        path: 'candidate',
        element: <RoleGuard allowedRole="candidate" />,
        children: [
          { index: true,               element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',         element: <CandidateDashboardPage /> },
          { path: 'resume-upload',     element: <ResumeUploadPage /> },
          { path: 'skills',            element: <SkillSelectionPage /> },
          { path: 'assessment',        element: <AssessmentPage /> },
          { path: 'assessment/:id/results', element: <AssessmentResultsPage /> },
          { path: 'profile',           element: <VerifiedProfilePage /> },
          ...(FEATURES.CAREER_COACH
            ? [{ path: 'career-coach', element: <CareerCoachPage /> }]
            : []),
          { path: 'jobs',              element: <CandidateJobsPage /> },
          { path: 'applications',      element: <ApplicationsPage /> },
        ],
      },

      // ── Recruiter routes ──────────────────────────────────
      {
        path: 'recruiter',
        element: <RoleGuard allowedRole="recruiter" />,
        children: [
          { index: true,                        element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',                  element: <RecruiterDashboardPage /> },
          { path: 'jobs/new',                   element: <PostJobPage /> },
           { path: 'jobs/:jobId/candidates',     element: <RankedCandidatesPage /> },
           { path: 'candidates/:candidateId',    element: <CandidateDetailPage /> },
           { path: 'company',                     element: <CompanyPage /> },
        ],
      },
      {
        path: 'admin',
        element: <RoleGuard allowedRole="admin" />,
        children: [
          { index: true, element: <AdminPage /> },
        ],
      },
    ],
  },

  // ── 404 ──────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
]);
