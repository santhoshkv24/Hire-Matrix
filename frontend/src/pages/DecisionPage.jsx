import { useEffect, useState } from 'react'
import {
  Gavel,
  CheckCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { getCandidateDisplayName } from '../utils/candidateDisplay.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const DECISION_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'default' },
  { value: 'selected', label: 'Selected', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
]

const initialForm = {
  applicationId: '',
  status: 'pending',
  notes: '',
}

function DecisionPage() {
  const { apiFetch } = useAuth()
  const [applications, setApplications] = useState([])
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch('/applications')
        setApplications(data.applications)
      } catch (err) {
        setError(parseApiError(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [apiFetch])

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!form.applicationId) {
      setError('Please select an application.')
      return
    }
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      await apiFetch(`/applications/${form.applicationId}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: form.status,
          notes: form.notes,
        }),
      })
      setMessage('Decision updated and candidate notified.')
      setForm(initialForm)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedApp = applications.find((a) => a._id === form.applicationId)
  const currentDecision = DECISION_STATUS_OPTIONS.find((o) => o.value === form.status)
  const existingDecision = DECISION_STATUS_OPTIONS.find(
    (option) => option.value === selectedApp?.finalDecision?.status
  )

  const inputStyles = "flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Hiring Decisions</h1>
        <p className="mt-1 text-slate-500">
          Finalize candidate outcomes with a clear and simple decision flow.
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

      <Card className="max-w-3xl">
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-main/10 text-primary-main">
              <Gavel size={20} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-slate-900">Record Decision</h3>
              <p className="text-sm text-slate-500">
                Decisions are logged and the candidate receives an email notification.
              </p>
            </div>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="flex flex-col gap-6">
              {/* Application Select */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Select Application</h4>
                <div>
                  {loading ? (
                    <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={form.applicationId}
                        onChange={setField('applicationId')}
                        required
                        className={inputStyles}
                      >
                        <option value="" disabled>Select an application</option>
                        {applications.map((application) => (
                          <option key={application._id} value={application._id}>
                            {getCandidateDisplayName(application.candidateId)} — {application.jobId?.title}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        Choose the candidate and role you are deciding on
                      </p>
                    </div>
                  )}

                  {/* Existing decision callout */}
                  {existingDecision && existingDecision.value !== 'pending' && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <p className="text-sm text-slate-600">
                          Current decision:{' '}
                          <strong className="font-semibold text-slate-900 uppercase tracking-wider text-xs">
                            {existingDecision.label}
                          </strong>
                        </p>
                      </div>
                    )}
                </div>
              </div>

              <div className="h-px w-full bg-slate-200" />

              {/* Decision */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Decision Outcome</h4>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Decision Status</label>
                    <select
                      value={form.status}
                      onChange={setField('status')}
                      required
                      className={inputStyles}
                    >
                      {DECISION_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">The official hiring decision for this candidate</p>
                  </div>

                  {currentDecision && (
                    <div>
                      <Badge 
                        variant={
                          currentDecision.color === 'success' ? 'success' :
                          currentDecision.color === 'error' ? 'danger' :
                          currentDecision.color === 'primary' ? 'primary' :
                          currentDecision.color === 'warning' ? 'warning' : 'outline'
                        }
                        className="uppercase"
                      >
                        Decision: {currentDecision.label}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px w-full bg-slate-200" />

              {/* Notes */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Decision Notes</h4>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Internal Notes</label>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={setField('notes')}
                    placeholder="Document the rationale for this decision, any conditions, or next steps…"
                    className={`${inputStyles} resize-y min-h-[100px]`}
                  />
                  <p className="text-xs text-slate-500">
                    Shared with the hiring team — not sent to the candidate
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || !form.applicationId}
                  className="min-w-[180px]"
                >
                  <Gavel size={18} className="mr-2" />
                  {submitting ? 'Saving…' : 'Save Decision'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default DecisionPage
