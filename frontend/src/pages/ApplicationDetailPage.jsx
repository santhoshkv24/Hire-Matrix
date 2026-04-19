import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Sparkles,
  History,
  MessageSquare,
  CalendarClock,
  NotebookPen,
  Gavel,
  TrendingUp,
  Check,
  X,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { getCandidateDisplayName } from '../utils/candidateDisplay.js'
import { formatDateTime, formatTime } from '../utils/date.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const RECOMMENDATION_COLORS = {
  strong_yes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  yes: 'bg-primary-main/10 text-primary-main border-primary-main/20',
  neutral: 'bg-slate-100 text-slate-800 border-slate-200',
  no: 'bg-red-100 text-red-800 border-red-200',
}

const STAGE_SEQUENCE = ['applied', 'screening', 'interview', 'offer', 'hired']

const DECISION_STATUS_LABELS = {
  pending: 'Pending',
  selected: 'Selected',
  rejected: 'Rejected',
}

function ScoreGauge({ value }) {
  const pct = Math.min(100, Math.max(0, value))
  const color =
    pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  const textColor =
    pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-slate-500">AI Match Score</span>
        <div className="flex items-baseline gap-0.5">
          <span className={`text-2xl font-extrabold ${textColor}`}>{value}</span>
          <span className="text-sm font-medium text-slate-500">/100</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const INSIGHT_STYLES = {
  success: {
    icon: <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />,
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-100',
  },
  error: {
    icon: <X size={14} className="text-red-600 shrink-0 mt-0.5" />,
    bg: 'bg-red-50/50',
    border: 'border-red-100',
  },
}

function ScoreInsightList({ items, tone, emptyText }) {
  const style = INSIGHT_STYLES[tone] || INSIGHT_STYLES.success

  if (!items?.length) {
    return (
      <p className="text-sm text-slate-400">
        {emptyText}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={`${tone}-${index}-${item}`}
          className={`flex items-start gap-2 rounded-lg border p-2.5 ${style.bg} ${style.border}`}
        >
          {style.icon}
          <span className="text-sm font-medium leading-relaxed text-slate-700">
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ApplicationDetailPage() {
  const { applicationId } = useParams()
  const { apiFetch } = useAuth()
  const [state, setState] = useState({
    application: null,
    stageEvents: [],
    feedback: [],
    decision: null,
    notes: [],
    interviews: [],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [rescoring, setRescoring] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/applications/${applicationId}`)
      setState(data)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [apiFetch, applicationId])

  useEffect(() => {
    load()
  }, [load])

  const triggerRescore = async () => {
    setRescoring(true)
    try {
      await apiFetch(`/applications/${applicationId}/score`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setRescoring(false)
    }
  }

  const addNote = async () => {
    if (!noteText.trim()) {
      return
    }

    setAddingNote(true)
    try {
      await apiFetch(`/applications/${applicationId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: noteText.trim() }),
      })
      setNoteText('')
      await load()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setAddingNote(false)
    }
  }

  const { application } = state

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-16 w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="h-48 w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-slate-200" />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/pipeline" className="self-start">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back to Pipeline
          </Button>
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error || 'Application not found.'}
        </div>
      </div>
    )
  }

  const stageIndex = STAGE_SEQUENCE.indexOf(application.currentStage)
  const decisionData = state.decision
  const simplifiedDecisionStatus =
    decisionData?.status && DECISION_STATUS_LABELS[decisionData.status]
      ? decisionData.status
      : 'pending'

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      {/* Breadcrumb & Header */}
      <div>
        <Link to="/pipeline" className="mb-3 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={16} className="mr-1" />
          Pipeline
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              {getCandidateDisplayName(application.candidateId)}
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-medium text-slate-500">{application.jobId?.title}</span>
              <Badge variant="primary" className="uppercase tracking-wider">
                {application.currentStage}
              </Badge>
            </div>
          </div>

          {/* Stage progress mini-bar */}
          {stageIndex >= 0 && (
            <div className="flex items-center gap-1.5">
              {STAGE_SEQUENCE.map((s, i) => (
                <div
                  key={s}
                  title={s}
                  className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                    i <= stageIndex ? 'bg-primary-main' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {/* AI Scoring */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-main/10 text-primary-main">
                <Sparkles size={18} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Scoring</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerRescore}
              disabled={rescoring}
            >
              <TrendingUp size={16} className="mr-2" />
              {rescoring ? 'Scoring…' : 'Re-score'}
            </Button>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={application.score?.status === 'completed' ? 'success' : 'secondary'}
                className="uppercase"
              >
                Status: {application.score?.status || 'not started'}
              </Badge>
              <Badge variant="outline">
                Model: {application.score?.model || 'n/a'}
              </Badge>
            </div>

            {application.score?.value != null && (
              <ScoreGauge value={application.score.value} />
            )}

            {(application.score?.strengths?.length > 0 ||
              application.score?.gaps?.length > 0) && (
              <>
                <div className="h-px w-full bg-slate-200" />
                <div className="flex flex-col gap-6 md:flex-row md:gap-8">
                  <div className="flex-1">
                    <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-emerald-600">
                      Strengths
                    </span>
                    <ScoreInsightList
                      items={application.score.strengths || []}
                      tone="success"
                      emptyText="No strengths identified"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-red-600">
                      Gaps
                    </span>
                    <ScoreInsightList
                      items={application.score.gaps || []}
                      tone="error"
                      emptyText="No gaps identified"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stage Timeline */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-main/10 text-primary-main">
              <History size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Stage Timeline</h3>
          </div>
          
          <div className="flex flex-col gap-3">
            {state.stageEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-500">
                <p>No stage events yet.</p>
              </div>
            ) : (
              state.stageEvents.map((event) => (
                <div
                  key={event._id}
                  className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-primary-main/30 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase">
                      <span className="text-slate-400">{event.fromStage || 'none'}</span>
                      <span className="text-slate-300">→</span>
                      <span className="text-primary-main">{event.toStage}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    by <span className="font-medium text-slate-700">{event.actorId?.name || 'system'}</span>
                  </span>
                  {event.reason && (
                    <p className="mt-1 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {event.reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interview Feedback */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-main/10 text-primary-main">
                <MessageSquare size={18} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Interview Feedback</h3>
            </div>
            {state.feedback.length > 0 && (
              <Badge variant="outline" className="uppercase">
                {state.feedback.length} submission{state.feedback.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-col gap-3">
            {state.feedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-500">
                <MessageSquare size={36} className="mb-3 opacity-30" />
                <p className="mb-4">No interview feedback submitted yet.</p>
                <Link to="/feedback">
                  <Button variant="outline" size="sm">Submit Feedback</Button>
                </Link>
              </div>
            ) : (
              state.feedback.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${RECOMMENDATION_COLORS[item.recommendation] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                        {item.recommendation?.replace('_', ' ')}
                      </div>
                      <span className="text-sm font-semibold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                        {'⭐'.repeat(item.rating)} {item.rating}/5
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 mt-1">
                    {item.interviewerId?.name || 'Interviewer'}
                  </span>
                  {item.comments && (
                    <p className="mt-1 text-sm text-slate-600 italic border-l-2 border-slate-200 pl-3">
                      "{item.comments}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Interviews */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-main/10 text-primary-main">
              <CalendarClock size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Interview Schedule</h3>
          </div>

          {state.interviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
              No interviews scheduled yet. Use the interview scheduling page to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {state.interviews.map((interview) => (
                <div key={interview._id} className="rounded-xl border border-slate-200 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 capitalize">{interview.status}</p>
                    <Badge variant={interview.status === 'cancelled' ? 'danger' : 'outline'} className="capitalize">
                      {interview.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-slate-600">
                    {formatDateTime(interview.scheduledStartAt)} -{' '}
                    {formatTime(interview.scheduledEndAt)}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collaboration Notes */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-main/10 text-primary-main">
              <NotebookPen size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Team Notes</h3>
          </div>

          <div className="mb-4">
            <textarea
              rows={3}
              className="min-h-[84px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Add internal context for the hiring team"
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
            />
            <div className="mt-2">
              <Button size="sm" onClick={addNote} disabled={addingNote || !noteText.trim()}>
                {addingNote ? 'Saving…' : 'Add Note'}
              </Button>
            </div>
          </div>

          {state.notes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
              No collaboration notes yet.
            </div>
          ) : (
            <div className="space-y-3">
              {state.notes.map((note) => (
                <div key={note._id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">{note.authorId?.name || 'Team member'}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(note.createdAt)}</p>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-700">{note.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hiring Decision */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-main/10 text-primary-main">
              <Gavel size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Hiring Decision</h3>
          </div>

          {!decisionData ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-500">
              <Gavel size={36} className="mb-3 opacity-30" />
              <p className="mb-4">No decision recorded yet.</p>
              <Link to="/decisions">
                <Button variant="outline" size="sm">Record Decision</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge 
                  variant={
                    simplifiedDecisionStatus === 'selected'
                      ? 'success'
                      : simplifiedDecisionStatus === 'rejected'
                      ? 'danger'
                      : 'primary'
                  }
                  className="uppercase"
                >
                  Decision: {DECISION_STATUS_LABELS[simplifiedDecisionStatus]}
                </Badge>
                {decisionData.decidedBy && (
                  <span className="text-sm text-slate-500 ml-1">
                    by <span className="font-medium text-slate-700">{decisionData.decidedBy.name}</span>
                  </span>
                )}
              </div>
              {decisionData.notes && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                  <p className="text-sm text-slate-700">
                    {decisionData.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ApplicationDetailPage
