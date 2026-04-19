import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getInternalDefaultPath } from '../utils/routing.js'

function RoleGuard({ roles, children }) {
  const { user } = useAuth()

  const hasRole = user?.roles?.some((role) => roles.includes(role.key))

  if (!hasRole) {
    const userRoleKeys = user?.roles?.map((role) => role.key) || []

    if (userRoleKeys.includes('applicant') && !roles.includes('applicant')) {
      return <Navigate to="/applicant/dashboard" replace />
    }

    if (userRoleKeys.length > 0) {
      return <Navigate to={getInternalDefaultPath(userRoleKeys)} replace />
    }

    return (
      <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm font-medium text-yellow-800">
        You do not have permission to access this section.
      </div>
    )
  }

  return children
}

export default RoleGuard
