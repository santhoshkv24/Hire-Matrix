const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const TIME_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const toValidDate = (value) => {
  if (!value) return null
  const next = new Date(value)
  return Number.isNaN(next.getTime()) ? null : next
}

export const formatDate = (value, fallback = '--') => {
  const date = toValidDate(value)
  return date ? DATE_FORMATTER.format(date) : fallback
}

export const formatDateTime = (value, fallback = '--') => {
  const date = toValidDate(value)
  return date ? DATE_TIME_FORMATTER.format(date) : fallback
}

export const formatTime = (value, fallback = '--') => {
  const date = toValidDate(value)
  return date ? TIME_FORMATTER.format(date) : fallback
}

export const isoToDisplayDate = (value) => {
  if (!value) return ''

  const trimmed = String(value).trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed
  }

  const date = toValidDate(trimmed)
  return date ? DATE_FORMATTER.format(date) : ''
}

export const displayDateToIso = (value) => {
  const match = String(value || '')
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (!match) {
    return null
  }

  const [, dd, mm, yyyy] = match
  const iso = `${yyyy}-${mm}-${dd}`
  const date = new Date(`${iso}T00:00:00`)

  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== Number(dd) ||
    date.getMonth() + 1 !== Number(mm) ||
    date.getFullYear() !== Number(yyyy)
  ) {
    return null
  }

  return iso
}
