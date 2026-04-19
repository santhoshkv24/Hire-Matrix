const DASHBOARD_ROLES = ['admin', 'recruiter', 'hiring_manager']

export const getInternalDefaultPath = (roleKeys = []) => {
  const canViewDashboard = roleKeys.some((role) => DASHBOARD_ROLES.includes(role))
  if (canViewDashboard) {
    return '/dashboard'
  }

  if (roleKeys.includes('interviewer')) {
    return '/applications'
  }

  return '/dashboard'
}

export const getDefaultPathForRoles = (roleKeys = []) => {
  if (roleKeys.includes('applicant')) {
    return '/applicant/dashboard'
  }

  return getInternalDefaultPath(roleKeys)
}
