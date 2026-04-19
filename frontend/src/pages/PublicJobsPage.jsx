import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, MapPin, Calendar, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { formatDate } from '../utils/date.js'
import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Input } from '../components/ui/Input.jsx'

function PublicJobsPage() {
  const { apiFetch, user } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [applyingId, setApplyingId] = useState(null)

  const isApplicant = useMemo(() => {
    const roles = user?.roles?.map((role) => role.key) || []
    return roles.includes('applicant')
  }, [user])

  const loadJobs = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiFetch('/jobs/public')
      setJobs(data.jobs || [])
    } catch (err) {
      setError(parseApiError(err))
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return jobs

    return jobs.filter((job) => {
      const haystack = [job.title, job.department, job.location, job.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [jobs, search])

  const handleApply = async (jobId) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/applicant/jobs' } } })
      return
    }

    if (!isApplicant) {
      setError('Only applicant accounts can apply to jobs from this page.')
      return
    }

    setError('')
    setSuccess('')
    setApplyingId(jobId)

    try {
      await apiFetch('/applicant/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      })
      setSuccess('Application submitted successfully.')
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Open Roles</h1>
        <p className="mt-1 text-slate-500">
          Browse active job openings and apply directly from your applicant account.
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
        <CardContent className="p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search open positions
          </label>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, department, or location"
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Briefcase size={40} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No open jobs match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredJobs.map((job) => (
            <Card key={job._id} className="h-full border-slate-200">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">{job.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="inline-flex items-center gap-1">
                      <Building2 size={12} />
                      {job.department}
                    </Badge>
                    {job.location && (
                      <Badge variant="outline" className="inline-flex items-center gap-1">
                        <MapPin size={12} />
                        {job.location}
                      </Badge>
                    )}
                    {job.employmentType && (
                      <Badge variant="secondary" className="capitalize">
                        {job.employmentType.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>

                {job.description && (
                  <p className="line-clamp-4 text-sm text-slate-600">{job.description}</p>
                )}

                {job.requiredSkills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {job.requiredSkills.slice(0, 6).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Calendar size={12} />
                    Posted {formatDate(job.createdAt)}
                  </span>
                  <Button size="sm" onClick={() => handleApply(job._id)} disabled={applyingId === job._id}>
                    {applyingId === job._id ? 'Applying…' : 'Apply'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default PublicJobsPage
