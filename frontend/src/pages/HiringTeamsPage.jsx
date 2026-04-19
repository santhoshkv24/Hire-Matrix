import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'

function HiringTeamsPage() {
  const { apiFetch } = useAuth()
  const [jobs, setJobs] = useState([])
  const [members, setMembers] = useState([])
  const [draftAssignments, setDraftAssignments] = useState({})
  const [savingByJob, setSavingByJob] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const recruiters = useMemo(() => {
    return members.filter((member) =>
      member.roles?.some((role) => ['recruiter', 'admin'].includes(role.key)),
    )
  }, [members])

  const hiringManagers = useMemo(() => {
    return members.filter((member) =>
      member.roles?.some((role) => ['hiring_manager', 'admin'].includes(role.key)),
    )
  }, [members])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [jobsData, membersData] = await Promise.all([
        apiFetch('/jobs'),
        apiFetch('/admin/team-members'),
      ])

      const nextJobs = jobsData.jobs || []
      const nextMembers = membersData.members || []
      setJobs(nextJobs)
      setMembers(nextMembers)

      const nextDraft = {}
      nextJobs.forEach((job) => {
        nextDraft[job._id] = {
          assignedRecruiter: job.assignedRecruiter?._id || '',
          assignedHiringManager: job.assignedHiringManager?._id || '',
        }
      })
      setDraftAssignments(nextDraft)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    load()
  }, [load])

  const setDraftField = (jobId, field) => (event) => {
    const value = event.target.value
    setDraftAssignments((prev) => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        [field]: value,
      },
    }))
  }

  const saveJobTeam = async (jobId) => {
    const draft = draftAssignments[jobId] || {}
    setSavingByJob((prev) => ({ ...prev, [jobId]: true }))
    setError('')
    setSuccess('')

    try {
      await apiFetch(`/jobs/${jobId}/team`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedRecruiter: draft.assignedRecruiter || null,
          assignedHiringManager: draft.assignedHiringManager || null,
        }),
      })
      setSuccess('Hiring team assignments updated successfully.')
      await load()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSavingByJob((prev) => ({ ...prev, [jobId]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Hiring Team Coordination</h1>
        <p className="mt-1 text-slate-500">
          Assign recruiters and hiring managers to each requisition for clear ownership.
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

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Users size={18} className="text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">Job Team Assignments</h2>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No jobs found.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {jobs.map((job) => {
                const draft = draftAssignments[job._id] || {
                  assignedRecruiter: '',
                  assignedHiringManager: '',
                }

                return (
                  <div key={job._id} className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[1.6fr,1fr,1fr,auto] lg:items-end">
                    <div>
                      <p className="font-semibold text-slate-900">{job.title}</p>
                      <p className="text-sm text-slate-500">{job.department}</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Recruiter
                      </label>
                      <select
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                        value={draft.assignedRecruiter}
                        onChange={setDraftField(job._id, 'assignedRecruiter')}
                      >
                        <option value="">Unassigned</option>
                        {recruiters.map((member) => (
                          <option key={member._id} value={member._id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Hiring Manager
                      </label>
                      <select
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                        value={draft.assignedHiringManager}
                        onChange={setDraftField(job._id, 'assignedHiringManager')}
                      >
                        <option value="">Unassigned</option>
                        {hiringManagers.map((member) => (
                          <option key={member._id} value={member._id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Button
                        size="sm"
                        onClick={() => saveJobTeam(job._id)}
                        disabled={Boolean(savingByJob[job._id])}
                      >
                        <Save size={14} className="mr-1" />
                        {savingByJob[job._id] ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default HiringTeamsPage
