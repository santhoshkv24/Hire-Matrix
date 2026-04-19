import { useCallback, useEffect, useState } from 'react'
import {
  Download,
  Filter,
  Info,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'

const STAGE_OPTIONS = [
  { value: '', label: 'All stages' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

const CSV_COLUMNS = [
  'applicationId', 'candidateName', 'candidateEmail',
  'jobTitle', 'currentStage', 'score', 'decisionStatus', 'createdAt',
]

function ExportsPage() {
  const { apiFetch } = useAuth()
  const [jobs, setJobs] = useState([])
  const [jobId, setJobId] = useState('')
  const [currentStage, setCurrentStage] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Load jobs for the dropdown
  const loadJobs = useCallback(async () => {
    try {
      const data = await apiFetch('/jobs')
      setJobs(data.jobs || [])
    } catch {
      // non-critical — user can still export without filtering
    }
  }, [apiFetch])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const download = async () => {
    setError('')
    setMessage('')
    setDownloading(true)

    try {
      const params = new URLSearchParams()
      if (jobId) params.set('jobId', jobId)
      if (currentStage) params.set('currentStage', currentStage)

      const query = params.toString()
      const result = await apiFetch(
        `/exports/applications.csv${query ? `?${query}` : ''}`,
        { headers: { Accept: 'text/csv' } },
      )

      const csv = typeof result === 'string' ? result : ''
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'applications.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage('CSV downloaded successfully — check your downloads folder.')
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setDownloading(false)
    }
  }

  const inputStyles = "flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">CSV Exports</h1>
        <p className="mt-1 text-slate-500">
          Download filtered application datasets for reporting and analysis.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {message}
        </div>
      )}

      {/* Export Card */}
      <Card className="max-w-2xl">
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-main/10 text-primary-main">
              <Filter size={20} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-slate-900">Filter Options</h3>
              <p className="text-sm text-slate-500">
                Both filters are optional — leave blank to export all applications.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Filter by Job</label>
              <select
                value={jobId}
                onChange={(event) => setJobId(event.target.value)}
                className={inputStyles}
              >
                <option value="">All jobs</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.title} — {job.department}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Limit export to one job requisition, or leave blank for all jobs</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Filter by Pipeline Stage</label>
              <select
                value={currentStage}
                onChange={(event) => setCurrentStage(event.target.value)}
                className={inputStyles}
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Only include applications at a specific pipeline stage</p>
            </div>

            <div className="mt-2">
              <Button
                size="lg"
                onClick={download}
                disabled={downloading}
                className="min-w-[240px]"
              >
                <Download size={18} className="mr-2" />
                {downloading ? 'Preparing CSV…' : 'Download Applications CSV'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exported Columns Info */}
      <div className="max-w-2xl rounded-xl border border-primary-main/15 bg-primary-main/5 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <Info className="mt-1 shrink-0 text-primary-main" size={20} />
          <div className="flex flex-col">
            <h4 className="mb-2 font-bold text-primary-main">What gets exported</h4>
            <p className="mb-3 text-sm font-medium text-slate-600">
              Each row contains one application record with the following columns:
            </p>
            <div className="flex flex-wrap gap-2">
              {CSV_COLUMNS.map((col) => (
                <div
                  key={col}
                  className="rounded-md border border-primary-main/10 bg-primary-main/10 px-2.5 py-1 text-xs font-semibold text-primary-main shadow-sm font-mono"
                >
                  {col}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportsPage
