import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { getCandidateDisplayEmail, getCandidateDisplayName } from '../utils/candidateDisplay.js'
import { formatDateTime } from '../utils/date.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const STAGE_OPTIONS = [
  { value: '', label: 'All stages' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created time' },
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'stageChangedAt', label: 'Stage changed' },
]

const initialFilters = {
  search: '',
  currentStage: '',
  jobId: '',
  sortBy: 'updatedAt',
  sortDir: 'desc',
}

const stageVariant = (stage) => {
  if (stage === 'hired') return 'success'
  if (stage === 'rejected') return 'destructive'
  if (stage === 'offer') return 'default'
  return 'secondary'
}

function ApplicationsPage() {
  const { apiFetch, user } = useAuth()
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [jobs, setJobs] = useState([])
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const roleKeys = useMemo(() => user?.roles?.map((role) => role.key) || [], [user])
  const canDelete = useMemo(
    () => roleKeys.some((role) => ['admin', 'recruiter'].includes(role)),
    [roleKeys],
  )

  const loadJobs = useCallback(async () => {
    try {
      const data = await apiFetch('/jobs')
      setJobs(data.jobs || [])
    } catch {
      setJobs([])
    }
  }, [apiFetch])

  const loadApplications = useCallback(
    async (page) => {
      setLoading(true)
      setError('')

      try {
        const query = new URLSearchParams()
        query.set('page', String(page))
        query.set('limit', String(pagination.limit || 20))
        query.set('sortBy', appliedFilters.sortBy)
        query.set('sortDir', appliedFilters.sortDir)

        if (appliedFilters.search) query.set('search', appliedFilters.search.trim())
        if (appliedFilters.currentStage) query.set('currentStage', appliedFilters.currentStage)
        if (appliedFilters.jobId) query.set('jobId', appliedFilters.jobId)

        const data = await apiFetch(`/applications?${query.toString()}`)
        setApplications(data.applications || [])
        setPagination((prev) => {
          const next = data.pagination || {
            page,
            limit: prev.limit,
            total: data.applications?.length || 0,
            pages: 1,
          }
          return {
            page: next.page,
            limit: next.limit,
            total: next.total,
            pages: next.pages,
          }
        })
      } catch (err) {
        setError(parseApiError(err))
        setApplications([])
      } finally {
        setLoading(false)
      }
    },
    [apiFetch, appliedFilters, pagination.limit],
  )

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  useEffect(() => {
    loadApplications(1)
  }, [appliedFilters, loadApplications])

  const applyFilters = (event) => {
    event.preventDefault()
    setSuccess('')
    setAppliedFilters({ ...draftFilters })
  }

  const resetFilters = () => {
    setDraftFilters(initialFilters)
    setAppliedFilters(initialFilters)
    setSuccess('')
    setError('')
  }

  const handleDelete = async (application) => {
    const candidateName = getCandidateDisplayName(application.candidateId)
    const jobTitle = application.jobId?.title || 'the selected job'
    const shouldDelete = window.confirm(
      `Delete application for ${candidateName || 'candidate'} (${jobTitle})? This removes stage history, interview feedback, decisions, and scoring jobs for this application.`,
    )

    if (!shouldDelete) {
      return
    }

    setDeletingId(application._id)
    setError('')
    setSuccess('')

    try {
      await apiFetch(`/applications/${application._id}`, { method: 'DELETE' })
      setSuccess('Application removed successfully.')

      const hasSingleItemOnPage = applications.length === 1
      const hasPreviousPage = pagination.page > 1
      const nextPage = hasSingleItemOnPage && hasPreviousPage ? pagination.page - 1 : pagination.page

      await loadApplications(nextPage)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setDeletingId(null)
    }
  }

  const goToPrevPage = () => {
    if (pagination.page <= 1) return
    loadApplications(pagination.page - 1)
  }

  const goToNextPage = () => {
    if (pagination.pages === 0 || pagination.page >= pagination.pages) return
    loadApplications(pagination.page + 1)
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Applications</h1>
        <p className="mt-1 text-slate-500">
          Manage active applications, filter pipeline records, and safely remove invalid entries.
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
        <CardContent className="p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-main/10 text-primary-main">
              <Filter size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Filter Applications</h3>
              <p className="text-sm text-slate-500">Search by candidate/job and narrow by stage or requisition.</p>
            </div>
          </div>

          <form onSubmit={applyFilters} noValidate className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Search
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search size={15} />
                  </div>
                  <Input
                    value={draftFilters.search}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
                    }
                    placeholder="Candidate name, email, or job title"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Stage
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-main"
                  value={draftFilters.currentStage}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, currentStage: event.target.value }))
                  }
                >
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option.value || 'all-stage'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Job
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-main"
                  value={draftFilters.jobId}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, jobId: event.target.value }))
                  }
                >
                  <option value="">All jobs</option>
                  {jobs.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Sort
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-main"
                    value={draftFilters.sortBy}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({ ...prev, sortBy: event.target.value }))
                    }
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="flex h-10 w-[120px] rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-main"
                    value={draftFilters.sortDir}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({ ...prev, sortDir: event.target.value }))
                    }
                  >
                    <option value="desc">Newest</option>
                    <option value="asc">Oldest</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm">
                <Filter size={14} className="mr-1.5" />
                Apply Filters
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcw size={14} className="mr-1.5" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-slate-500" />
              <h2 className="text-base font-bold text-slate-900 md:text-lg">Application Records</h2>
            </div>
            <Badge variant="outline" className="uppercase">
              {pagination.total} total
            </Badge>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 p-5 md:p-6">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-20 w-full animate-pulse rounded-lg bg-slate-200" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center text-slate-500">
              <FileText size={42} className="mb-3 opacity-25" />
              <p className="text-sm font-medium">No applications match the selected filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Candidate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Job</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Team</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {applications.map((application) => {
                      const candidateName = getCandidateDisplayName(application.candidateId)
                      return (
                        <tr key={application._id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-slate-900">{candidateName || 'Unknown candidate'}</div>
                            <div className="text-xs text-slate-500">{getCandidateDisplayEmail(application.candidateId)}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-slate-800">{application.jobId?.title || 'Unknown job'}</div>
                            {application.jobId?.department && (
                              <div className="text-xs text-slate-500">{application.jobId.department}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Badge variant={stageVariant(application.currentStage)} className="capitalize">
                              {application.currentStage}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="font-semibold text-slate-800">
                              {application.score?.value != null ? `${application.score.value}/100` : 'N/A'}
                            </span>
                            <div className="text-xs text-slate-500 capitalize">{application.score?.status || 'not_started'}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="text-xs text-slate-600">
                              <span className="font-semibold text-slate-700">Recruiter:</span>{' '}
                              {application.assignedRecruiter?.name || application.jobId?.assignedRecruiter?.name || 'Unassigned'}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              <span className="font-semibold text-slate-700">Manager:</span>{' '}
                              {application.assignedHiringManager?.name || application.jobId?.assignedHiringManager?.name || 'Unassigned'}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-slate-500">
                            {formatDateTime(application.createdAt)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/applications/${application._id}`)}
                              >
                                <Eye size={14} className="mr-1.5" />
                                View
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(application)}
                                  disabled={deletingId === application._id}
                                >
                                  <Trash2 size={14} className="mr-1.5" />
                                  {deletingId === application._id ? 'Deleting…' : 'Delete'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 md:px-6">
                <p className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.pages || 1}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={pagination.page <= 1 || loading}
                  >
                    <ChevronLeft size={14} className="mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={pagination.pages === 0 || pagination.page >= pagination.pages || loading}
                  >
                    Next
                    <ChevronRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ApplicationsPage
