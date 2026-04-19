export function getCandidateDisplayName(candidate, fallback = 'Unknown candidate') {
  if (!candidate) {
    return fallback
  }

  const nameFromUser = candidate.userId?.name?.trim()
  if (nameFromUser) {
    return nameFromUser
  }

  const fullName = String(candidate.fullName || '').trim()
  if (fullName && fullName.toLowerCase() !== 'applicant') {
    return fullName
  }

  const legacyName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()
  if (legacyName && legacyName.toLowerCase() !== 'applicant') {
    return legacyName
  }

  const email = String(candidate.userId?.email || candidate.email || '').trim()
  if (email) {
    return email
  }

  return fallback
}

export function getCandidateDisplayEmail(candidate, fallback = 'No email') {
  const email = String(candidate?.userId?.email || candidate?.email || '').trim()
  return email || fallback
}
