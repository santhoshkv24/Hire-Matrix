/**
 * Parses a backend error message (including raw Zod JSON arrays)
 * into a user-readable string.
 */
export function parseApiError(error) {
  if (!error) return ''
  const msg = typeof error === 'string' ? error : error?.message || 'An error occurred'

  // Detect raw Zod error JSON arrays like: [ { "origin": "string", "code": "too_small", ... } ]
  const trimmed = msg.trim()
  if (trimmed.startsWith('[')) {
    try {
      const issues = JSON.parse(trimmed)
      if (Array.isArray(issues)) {
        return issues
          .map((issue) => {
            const field = Array.isArray(issue.path) && issue.path.length > 0
              ? issue.path.join('.') + ': '
              : ''
            return field + (issue.message || 'Invalid value')
          })
          .join(' • ')
      }
    } catch {
      /* not JSON, fall through */
    }
  }

  return msg
}
