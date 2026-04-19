import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import ApplicantShell from './components/ApplicantShell.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RoleGuard from './components/RoleGuard.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ApplicantRegisterPage from './pages/ApplicantRegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import PublicJobsPage from './pages/PublicJobsPage.jsx'
import CandidatesPage from './pages/CandidatesPage.jsx'
import ApplicationsPage from './pages/ApplicationsPage.jsx'
import PipelinePage from './pages/PipelinePage.jsx'
import InterviewsPage from './pages/InterviewsPage.jsx'
import ApplicationDetailPage from './pages/ApplicationDetailPage.jsx'
import AdminUsersPage from './pages/AdminUsersPage.jsx'
import InterviewFeedbackPage from './pages/InterviewFeedbackPage.jsx'
import DecisionPage from './pages/DecisionPage.jsx'
import ExportsPage from './pages/ExportsPage.jsx'
import HiringTeamsPage from './pages/HiringTeamsPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import ApplicantDashboardPage from './pages/ApplicantDashboardPage.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { getInternalDefaultPath } from './utils/routing.js'

const INTERNAL_ROLES = ['admin', 'recruiter', 'hiring_manager', 'interviewer']
const DASHBOARD_ROLES = ['admin', 'recruiter', 'hiring_manager']
const JOBS_ROLES = ['admin', 'recruiter', 'hiring_manager']
const CANDIDATE_ROLES = ['admin', 'recruiter', 'hiring_manager']
const APPLICATION_ROLES = ['admin', 'recruiter', 'hiring_manager', 'interviewer']
const PIPELINE_ROLES = ['admin', 'recruiter', 'hiring_manager']
const FEEDBACK_ROLES = ['admin', 'interviewer', 'hiring_manager']
const DECISION_ROLES = ['admin', 'hiring_manager']
const EXPORT_ROLES = ['admin', 'recruiter']

function DefaultInternalLanding() {
  const { user } = useAuth()
  const roleKeys = user?.roles?.map((role) => role.key) || []

  return <Navigate to={getInternalDefaultPath(roleKeys)} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<ApplicantRegisterPage />} />
      <Route path="/jobs/public" element={<PublicJobsPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleGuard roles={INTERNAL_ROLES}>
              <AppShell />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultInternalLanding />} />
        <Route
          path="dashboard"
          element={
            <RoleGuard roles={DASHBOARD_ROLES}>
              <DashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="jobs"
          element={
            <RoleGuard roles={JOBS_ROLES}>
              <JobsPage />
            </RoleGuard>
          }
        />
        <Route
          path="candidates"
          element={
            <RoleGuard roles={CANDIDATE_ROLES}>
              <CandidatesPage />
            </RoleGuard>
          }
        />
        <Route
          path="applications"
          element={
            <RoleGuard roles={APPLICATION_ROLES}>
              <ApplicationsPage />
            </RoleGuard>
          }
        />
        <Route
          path="notifications"
          element={
            <RoleGuard roles={INTERNAL_ROLES}>
              <NotificationsPage />
            </RoleGuard>
          }
        />
        <Route
          path="pipeline"
          element={
            <RoleGuard roles={PIPELINE_ROLES}>
              <PipelinePage />
            </RoleGuard>
          }
        />
        <Route
          path="interviews"
          element={
            <RoleGuard roles={APPLICATION_ROLES}>
              <InterviewsPage />
            </RoleGuard>
          }
        />
        <Route
          path="applications/:applicationId"
          element={
            <RoleGuard roles={APPLICATION_ROLES}>
              <ApplicationDetailPage />
            </RoleGuard>
          }
        />
        <Route
          path="feedback"
          element={
            <RoleGuard roles={FEEDBACK_ROLES}>
              <InterviewFeedbackPage />
            </RoleGuard>
          }
        />
        <Route
          path="decisions"
          element={
            <RoleGuard roles={DECISION_ROLES}>
              <DecisionPage />
            </RoleGuard>
          }
        />
        <Route
          path="exports"
          element={
            <RoleGuard roles={EXPORT_ROLES}>
              <ExportsPage />
            </RoleGuard>
          }
        />
        <Route
          path="hiring-teams"
          element={
            <RoleGuard roles={['admin']}>
              <HiringTeamsPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/users"
          element={
            <RoleGuard roles={['admin']}>
              <AdminUsersPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route
        path="/applicant"
        element={
          <ProtectedRoute>
            <RoleGuard roles={['applicant']}>
              <ApplicantShell />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/applicant/dashboard" replace />} />
        <Route path="dashboard" element={<ApplicantDashboardPage />} />
        <Route path="jobs" element={<PublicJobsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
