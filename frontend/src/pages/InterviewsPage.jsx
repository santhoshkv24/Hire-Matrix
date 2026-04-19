import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus2, CalendarClock, RefreshCw, Ban } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { getCandidateDisplayName } from '../utils/candidateDisplay.js'
import { formatDateTime, formatTime } from '../utils/date.js'
import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const initialForm = {
  applicationId: '',
  interviewerId: '',
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  notes: '',
}

const parseDateValue = (isoString) => {
  if (!isoString) return { date: '', time: '' }
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return { date: '', time: '' }

  // Keep input value in ISO date format for native date picker controls.
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  }
}

function InterviewsPage() {
  const { apiFetch, user } = useAuth()
  const [applications, setApplications] = useState([])
  const [members, setMembers] = useState([])
  const [interviews, setInterviews] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingInterviewId, setEditingInterviewId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const interviewers = useMemo(() => {
    return members.filter((member) =>
      member.roles?.some((role) => ['interviewer', 'hiring_manager'].includes(role.key)),
    )
  }, [members])

  const canManage = useMemo(() => {
    const roleKeys = user?.roles?.map((role) => role.key) || []
    return roleKeys.some((role) => ['admin', 'recruiter', 'hiring_manager'].includes(role))
  }, [user])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [applicationData, memberData, interviewData] = await Promise.all([
        apiFetch('/applications?limit=100'),
        apiFetch('/admin/team-members'),
        apiFetch('/interviews'),
      ])

      setApplications(applicationData.applications || [])
      setMembers(memberData.members || [])
      setInterviews(interviewData.interviews || [])
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    load()
  }, [load])

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const resetForm = () => {
    setForm(initialForm)
    setEditingInterviewId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
        throw new Error('Please select both start and end date/time.')
      }

      const buildIso = (dateStr, timeStr) => {
        const d = new Date(`${dateStr}T${timeStr}`)
        if (isNaN(d.getTime())) return null
        return d.toISOString()
      }

      const scheduledStartAt = buildIso(form.startDate, form.startTime)
      const scheduledEndAt = buildIso(form.endDate, form.endTime)

      if (!scheduledStartAt || !scheduledEndAt) {
        throw new Error('Invalid date or time selected.')
      }

      const payload = {
        applicationId: form.applicationId,
        interviewerId: form.interviewerId,
        scheduledStartAt,
        scheduledEndAt,
        timezone: form.timezone,
        notes: form.notes,
      }

      if (editingInterviewId) {
        await apiFetch(`/interviews/${editingInterviewId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setSuccess('Interview updated successfully.')
      } else {
        await apiFetch('/interviews', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setSuccess('Interview scheduled successfully.')
      }

      resetForm()
      await load()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (interview) => {
    const startObj = parseDateValue(interview.scheduledStartAt)
    const endObj = parseDateValue(interview.scheduledEndAt)

    setEditingInterviewId(interview._id)
    setForm({
      applicationId: interview.applicationId?._id || '',
      interviewerId: interview.interviewerId?._id || '',
      startDate: startObj.date,
      startTime: startObj.time,
      endDate: endObj.date,
      endTime: endObj.time,
      timezone: interview.timezone || initialForm.timezone,
      notes: interview.notes || '',
    })
  }

  const cancelInterview = async (interview) => {
    const reason = window.prompt('Reason for cancellation:')
    if (!reason) return

    setError('')
    setSuccess('')

    try {
      await apiFetch(`/interviews/${interview._id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      })
      setSuccess('Interview cancelled.')
      await load()
    } catch (err) {
      setError(parseApiError(err))
    }
  }

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Interview Scheduling</h1>
        <p className="mt-1 text-slate-500">
          Schedule, reschedule, and cancel interviews with automatic candidate and interviewer notifications.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {success}
        </div>
      )}

      {canManage && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarPlus2 size={18} className="text-primary-main" />
              <h2 className="text-base font-bold text-slate-900">
                {editingInterviewId ? 'Reschedule Interview' : 'Schedule Interview'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-2" noValidate>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Application
              </label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={form.applicationId}
                onChange={setField('applicationId')}
                required
              >
                <option value="">Select application</option>
                {applications.map((application) => (
                  <option key={application._id} value={application._id}>
                    {getCandidateDisplayName(application.candidateId)} - {application.jobId?.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Interviewer
              </label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={form.interviewerId}
                onChange={setField('interviewerId')}
                required
              >
                <option value="">Select interviewer</option>
                {interviewers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start time
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm"
                  value={form.startDate}
                  onChange={setField('startDate')}
                  required
                />
                <input
                  type="time"
                  className="h-10 w-32 rounded-md border border-slate-300 px-3 text-sm"
                  value={form.startTime}
                  onChange={setField('startTime')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                End time
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm"
                  value={form.endDate}
                  onChange={setField('endDate')}
                  required
                />
                <input
                  type="time"
                  className="h-10 w-32 rounded-md border border-slate-300 px-3 text-sm"
                  value={form.endTime}
                  onChange={setField('endTime')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Timezone
              </label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={form.timezone}
                onChange={setField('timezone')}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notes
              </label>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.notes}
                onChange={setField('notes')}
                placeholder="Interview context, focus areas, and preparation notes"
              />
            </div>

            <div className="lg:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingInterviewId ? 'Save Changes' : 'Schedule Interview'}
              </Button>
              {editingInterviewId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel edit
                </Button>
              )}
            </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <CalendarClock size={18} className="text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">Interview Calendar</h2>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200" />
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No interviews scheduled yet.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {interviews.map((interview) => (
                <div key={interview._id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-slate-900">
                      {getCandidateDisplayName(interview.applicationId?.candidateId)} - {interview.applicationId?.jobId?.title}
                    </p>
                    <p className="text-slate-600">
                      {formatDateTime(interview.scheduledStartAt)} - {formatTime(interview.scheduledEndAt)}
                    </p>
                    <p className="text-slate-500">Interviewer: {interview.interviewerId?.name || 'N/A'}</p>
                    {interview.meetingLink && (
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-primary-main hover:underline"
                      >
                        Open meeting link
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={interview.status === 'cancelled' ? 'destructive' : 'outline'} className="capitalize">
                      {interview.status}
                    </Badge>
                    {canManage && interview.status !== 'cancelled' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(interview)}>
                          <RefreshCw size={14} className="mr-1" />
                          Reschedule
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => cancelInterview(interview)}>
                          <Ban size={14} className="mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default InterviewsPage
