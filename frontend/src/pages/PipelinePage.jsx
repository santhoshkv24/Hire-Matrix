import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { getCandidateDisplayName } from '../utils/candidateDisplay.js'
import { GripVertical, Plus, ExternalLink } from 'lucide-react'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const STAGE_ACCENT = {
  applied: '#4f8df0',
  screening: '#ea7a1f',
  interview: '#7c3aed',
  offer: '#148a56',
  hired: '#0f5fd7',
  rejected: '#cc3f3f',
}

function SortableApplicationCard({ application }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application._id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-white p-3 shadow-sm transition-all ${
        isDragging 
          ? 'border-primary-main/30 shadow-md ring-1 ring-primary-main/20' 
          : 'border-slate-200 hover:border-primary-main/20 hover:shadow'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <GripVertical size={16} className="mt-0.5 shrink-0 cursor-grab text-slate-400 active:cursor-grabbing" />
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-slate-900 leading-snug">
              {getCandidateDisplayName(application.candidateId)}
            </h4>
            <span className="block truncate text-xs text-slate-500">
              {application.jobId?.title}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pl-6">
          <Badge 
            variant={application.score?.value != null ? 'default' : 'secondary'} 
            className="text-[10px] uppercase tracking-wider"
          >
            {application.score?.value != null ? `Score: ${application.score.value}` : 'Not scored'}
          </Badge>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <Link to={`/applications/${application._id}`}>
              View <ExternalLink size={12} className="ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function StageColumn({ stage, applications, loading }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage}` })
  const accent = STAGE_ACCENT[stage] || '#4f6384'

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-[452px] flex-col rounded-2xl border transition-colors ${
        isOver ? 'bg-primary-main/5 border-primary-main/25' : 'bg-slate-50/50 border-slate-200'
      }`}
    >
      <div 
        className="h-1.5 w-full rounded-t-2xl" 
        style={{ backgroundColor: accent }} 
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            {stage}
          </h3>
          <span className="flex h-6 items-center justify-center rounded-full bg-slate-200 px-2 text-xs font-semibold text-slate-600">
            {applications.length}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-[88px] w-full animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : (
          <SortableContext
            items={applications.map((app) => app._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2.5">
              {applications.map((application) => (
                <SortableApplicationCard key={application._id} application={application} />
              ))}
              {applications.length === 0 && (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 py-6 text-center">
                  <span className="text-xs font-medium text-slate-400">No candidates</span>
                </div>
              )}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  )
}

function PipelinePage() {
  const { apiFetch, user } = useAuth()
  const [stages, setStages] = useState([])
  const [board, setBoard] = useState({})
  const [jobs, setJobs] = useState([])
  const [candidates, setCandidates] = useState([])
  const [form, setForm] = useState({ jobId: '', candidateId: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const canManagePipeline = useMemo(() => {
    const roleKeys = user?.roles?.map((role) => role.key) || []
    return roleKeys.some((role) => ['admin', 'recruiter'].includes(role))
  }, [user])

  const loadBoard = useCallback(async () => {
    const data = await apiFetch('/applications/board')
    setStages(data.stages)
    setBoard(data.board)
  }, [apiFetch])

  const loadOptions = useCallback(async () => {
    const [jobsData, candidatesData] = await Promise.all([
      apiFetch('/jobs'),
      apiFetch('/candidates'),
    ])
    setJobs(jobsData.jobs)
    setCandidates(candidatesData.candidates)
  }, [apiFetch])

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadBoard(), loadOptions()])
      } catch (err) {
        setError(parseApiError(err))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadBoard, loadOptions])

  const findStageByApplicationId = (applicationId, sourceBoard = board) => {
    return stages.find((stage) =>
      (sourceBoard[stage] || []).some((app) => app._id === applicationId),
    )
  }

  const resolveDestinationStage = (overId, sourceBoard = board) => {
    if (!overId) return null
    const id = String(overId)
    if (id.startsWith('stage-')) return id.replace('stage-', '')
    return findStageByApplicationId(id, sourceBoard)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || !canManagePipeline) return

    const fromStage = findStageByApplicationId(active.id)
    const toStage = resolveDestinationStage(over.id)

    if (!fromStage || !toStage || fromStage === toStage) return

    const movingApp = (board[fromStage] || []).find((app) => app._id === active.id)
    if (!movingApp) return

    const previousBoard = board
    const optimisticBoard = {
      ...board,
      [fromStage]: (board[fromStage] || []).filter((app) => app._id !== active.id),
      [toStage]: [{ ...movingApp, currentStage: toStage }, ...(board[toStage] || [])],
    }

    setBoard(optimisticBoard)

    try {
      await apiFetch(`/applications/${active.id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ toStage }),
      })
      await loadBoard()
    } catch (err) {
      setError(parseApiError(err))
      setBoard(previousBoard)
    }
  }

  const handleCreateApplication = async (event) => {
    event.preventDefault()
    if (!form.jobId || !form.candidateId) {
      setError('Select both a job and a candidate.')
      return
    }

    setCreating(true)
    setError('')
    setSuccess('')

    try {
      await apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setForm({ jobId: '', candidateId: '' })
      setSuccess('Application created — candidate appears in the Applied column.')
      await loadBoard()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 page-enter">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Pipeline Board</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag cards across columns to move candidates through the hiring funnel.
          </p>
        </div>
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

      {/* Create Application Form */}
      {canManagePipeline && (
        <Card className="overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-main/10 text-primary-main">
                <Plus size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add to Pipeline</h3>
                <p className="text-sm text-slate-500">Pair a candidate with a job to start their application journey.</p>
              </div>
            </div>

            <form onSubmit={handleCreateApplication} noValidate>
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Job Requisition</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-main"
                    value={form.jobId}
                    onChange={(e) => setForm((prev) => ({ ...prev, jobId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select Job</option>
                    {jobs.map((job) => (
                      <option key={job._id} value={job._id}>
                        {job.title} {job.department ? ` — ${job.department}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Candidate</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-main"
                    value={form.candidateId}
                    onChange={(e) => setForm((prev) => ({ ...prev, candidateId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select Candidate</option>
                    {candidates.map((candidate) => (
                      <option key={candidate._id} value={candidate._id}>
                        {getCandidateDisplayName(candidate)}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={creating || !form.jobId || !form.candidateId}
                  className="w-full md:w-auto min-w-[160px]"
                >
                  <Plus size={16} className="mr-2" />
                  {creating ? 'Adding…' : 'Add to Pipeline'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex min-w-max items-stretch gap-4 md:gap-5">
            {loading
              ? [1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-[260px] md:w-[280px] shrink-0">
                    <div className="h-[452px] w-full animate-pulse rounded-2xl bg-slate-200" />
                  </div>
                ))
              : stages.map((stage) => (
                  <div key={stage} className="w-[260px] md:w-[280px] shrink-0">
                    <StageColumn
                      stage={stage}
                      applications={board[stage] || []}
                      loading={false}
                    />
                  </div>
                ))}
          </div>
        </div>
      </DndContext>
    </div>
  )
}

export default PipelinePage
