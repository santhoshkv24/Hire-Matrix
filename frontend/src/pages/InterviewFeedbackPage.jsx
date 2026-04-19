import { useEffect, useState } from 'react'
import {
  MessageSquareQuote,
  Star,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { getCandidateDisplayName } from '../utils/candidateDisplay.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const RECOMMENDATION_OPTIONS = [
  { value: 'strong_yes', label: 'Strong Yes', color: 'success' },
  { value: 'yes', label: 'Yes', color: 'primary' },
  { value: 'neutral', label: 'Neutral', color: 'default' },
  { value: 'no', label: 'No', color: 'error' },
]

const initialForm = {
  applicationId: '',
  rating: 3,
  recommendation: 'yes',
  comments: '',
}

function InterviewFeedbackPage() {
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
      await apiFetch(`/applications/${form.applicationId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: Number(form.rating),
          recommendation: form.recommendation,
          comments: form.comments,
        }),
      })
      setMessage('Feedback submitted successfully.')
      setForm(initialForm)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedApp = applications.find((a) => a._id === form.applicationId)

  const inputStyles = "flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Interview Feedback</h1>
        <p className="mt-1 text-slate-500">
          Capture interviewer assessments and recommendations for each application.
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

      {/* Feedback Form */}
      <Card className="max-w-3xl">
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-main/10 text-primary-main">
              <MessageSquareQuote size={20} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-slate-900">Submit Interview Feedback</h3>
              <p className="text-sm text-slate-500">
                Your assessment helps the hiring manager make an informed decision.
              </p>
            </div>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="flex flex-col gap-6">
              {/* Select Application */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Select Application</h4>
                <div>
                  {loading ? (
                    <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={form.applicationId}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, applicationId: event.target.value }))
                        }
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
                        {applications.length === 0
                            ? 'No applications available yet.'
                            : 'Select the candidate and role you interviewed'}
                      </p>
                    </div>
                  )}

                  {/* Selected app context */}
                  {selectedApp && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary-main/15 bg-primary-main/5 p-3">
                      <Badge variant="outline" className="border-primary-main/20 text-primary-main capitalize">
                        Stage: {selectedApp.currentStage}
                      </Badge>
                      {selectedApp.score?.value != null && (
                        <Badge variant="outline" className="border-slate-200 text-slate-600">
                          AI Score: {selectedApp.score.value}/100
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px w-full bg-slate-200" />

              {/* Assessment */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Assessment</h4>
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2 relative z-0">
                    <label className="text-sm font-semibold text-slate-900">Overall Rating</label>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, rating: star }))}
                            className={`p-1 transition-colors hover:text-amber-400 focus:outline-none ${form.rating >= star ? 'text-amber-400' : 'text-slate-200'}`}
                          >
                            <Star size={28} className={form.rating >= star ? "fill-amber-400" : ""} strokeWidth={form.rating >= star ? 0 : 2} />
                          </button>
                        ))}
                      </div>
                      <span className="text-sm font-medium text-slate-500">{form.rating}/5 stars</span>
                    </div>
                    <p className="text-xs text-slate-500">Rate the candidate's overall performance in the interview</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-900">Hiring Recommendation</label>
                    <select
                      value={form.recommendation}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, recommendation: event.target.value }))
                      }
                      required
                      className={inputStyles}
                    >
                      {RECOMMENDATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">Your overall recommendation for moving this candidate forward</p>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-slate-200" />

              {/* Comments */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Comments</h4>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-900">Interview Notes</label>
                  <textarea
                    rows={4}
                    value={form.comments}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, comments: event.target.value }))
                    }
                    placeholder="Share specific observations about the candidate's technical skills, communication, culture fit, or any concerns…"
                    className={`${inputStyles} resize-y min-h-[100px]`}
                  />
                  <p className="text-xs text-slate-500">These notes will be visible to the hiring manager</p>
                </div>
              </div>

              <div className="mt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || !form.applicationId}
                  className="min-w-[180px]"
                >
                  <MessageSquareQuote size={18} className="mr-2" />
                  {submitting ? 'Submitting…' : 'Submit Feedback'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default InterviewFeedbackPage
