import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  Plus,
  Building2,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS = {
  open: 'default',
  draft: 'secondary',
  closed: 'destructive',
  cancelled: 'secondary',
}

const initialForm = {
  title: '',
  department: '',
  location: 'Remote',
  employmentType: 'full_time',
  requiredSkills: '',
  description: '',
  status: 'open',
  targetStartDate: '',
}

function JobsPage() {
  const { apiFetch, user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingJobId, setEditingJobId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const canCreate = useMemo(() => {
    const roleKeys = user?.roles?.map((role) => role.key) || []
    return roleKeys.some((role) => ['admin', 'recruiter'].includes(role))
  }, [user])

  const loadJobs = useCallback(async () => {
    try {
      const data = await apiFetch('/jobs')
      setJobs(data.jobs)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const resetForm = () => {
    setForm(initialForm)
    setEditingJobId(null)
  }

  const startEdit = (job) => {
    setEditingJobId(job._id)
    setForm({
      title: job.title || '',
      department: job.department || '',
      location: job.location || 'Remote',
      employmentType: job.employmentType || 'full_time',
      requiredSkills: (job.requiredSkills || []).join(', '),
      description: job.description || '',
      status: job.status || 'open',
      targetStartDate: job.targetStartDate
        ? new Date(job.targetStartDate).toISOString().slice(0, 10)
        : '',
    })
    setError('')
    setSuccess('')
  }

  const buildPayload = () => {
    return {
      title: form.title,
      department: form.department,
      location: form.location,
      employmentType: form.employmentType,
      description: form.description,
      status: form.status,
      requiredSkills: form.requiredSkills
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      targetStartDate: form.targetStartDate
        ? new Date(form.targetStartDate).toISOString()
        : undefined,
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await apiFetch(editingJobId ? `/jobs/${editingJobId}` : '/jobs', {
        method: editingJobId ? 'PATCH' : 'POST',
        body: JSON.stringify(buildPayload()),
      })
      resetForm()
      setSuccess(
        editingJobId
          ? 'Job requisition updated successfully.'
          : 'Job requisition created successfully.',
      )
      await loadJobs()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (job) => {
    const shouldDelete = window.confirm(
      `Delete job requisition "${job.title}"? This action cannot be undone.`,
    )
    if (!shouldDelete) {
      return
    }

    setDeletingId(job._id)
    setError('')
    setSuccess('')

    try {
      await apiFetch(`/jobs/${job._id}`, { method: 'DELETE' })
      if (editingJobId === job._id) {
        resetForm()
      }
      setSuccess('Job requisition deleted successfully.')
      await loadJobs()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Job Requisitions</h1>
        <p className="mt-1 text-slate-500">
          Create and track active openings with role-based access control.
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

      {/* Create Job Form */}
      {canCreate && (
        <Card className="overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-main/10 text-primary-main">
                <Plus size={20} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingJobId ? 'Edit Job Requisition' : 'Create Job Requisition'}
                </h3>
                <p className="text-sm text-slate-500">
                  {editingJobId
                    ? 'Update requisition details to keep hiring aligned.'
                    : 'Fill in the details below to post a new opening.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-6">
                {/* Basic Info */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Position Details</h4>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700">Job Title</label>
                      <Input
                        value={form.title}
                        onChange={setField('title')}
                        required
                        placeholder="e.g. Senior Backend Engineer"
                      />
                      <p className="text-xs text-slate-500">The official title for this requisition</p>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Department</label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Building2 size={16} />
                          </div>
                          <Input
                            value={form.department}
                            onChange={setField('department')}
                            required
                            placeholder="e.g. Engineering"
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Location</label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <MapPin size={16} />
                          </div>
                          <Input
                            value={form.location}
                            onChange={setField('location')}
                            placeholder="e.g. Remote, Bengaluru"
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Employment Type</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-main"
                          value={form.employmentType}
                          onChange={setField('employmentType')}
                          required
                        >
                          {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500">Contract arrangement for this role</p>
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Status</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-main"
                          value={form.status}
                          onChange={setField('status')}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500">Controls visibility and recruiting status</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200" />

                {/* Description & Skills */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Role Description</h4>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700">Job Description</label>
                      <textarea
                        className="flex min-h-[120px] w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-main md:min-h-[160px]"
                        value={form.description}
                        onChange={setField('description')}
                        placeholder="Describe the role, responsibilities, and team context…"
                      />
                      <p className="text-xs text-slate-500">Shown to candidates on the pipeline board</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700">Required Skills</label>
                      <Input
                        value={form.requiredSkills}
                        onChange={setField('requiredSkills')}
                        placeholder="JavaScript, Node.js, MongoDB"
                      />
                      <p className="text-xs text-slate-500">Comma-separated list — used for AI resume scoring</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200" />

                {/* Settings */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Timeline</h4>
                  <div className="flex flex-col gap-1.5 w-full md:max-w-[320px]">
                    <label className="text-sm font-medium text-slate-700">Target Start Date</label>
                    <Input
                      type="date"
                      value={form.targetStartDate}
                      onChange={setField('targetStartDate')}
                    />
                    <p className="text-xs text-slate-500">Optional — choose using the date picker</p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <Button type="submit" size="lg" disabled={saving} className="min-w-[180px]">
                    {editingJobId ? <Pencil size={18} className="mr-2" /> : <Briefcase size={18} className="mr-2" />}
                    {saving ? (editingJobId ? 'Saving…' : 'Creating…') : (editingJobId ? 'Save Changes' : 'Create Job')}
                  </Button>
                  {editingJobId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold text-slate-900">Active Requisitions</h2>
          {!loading && (
            <Badge variant="outline" className="w-fit self-start sm:self-auto uppercase">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 w-full animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Briefcase size={48} className="mb-4 opacity-20" />
              <h3 className="mb-1 text-lg font-bold text-slate-900">No job requisitions yet</h3>
              <p className="text-sm">
                {canCreate
                  ? 'Create your first job requisition using the form above.'
                  : 'No open positions have been posted yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {jobs.map((job) => (
              <Card key={job._id} className="transition-colors hover:border-slate-300 hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                        <Badge 
                          variant={STATUS_COLORS[job.status] || 'secondary'} 
                          className="capitalize text-[10px]"
                        >
                          {job.status}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 md:gap-5 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={14} className="opacity-70" />
                          <span>{job.department}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="opacity-70" />
                          <span>{job.location}</span>
                        </div>
                        {job.employmentType && (
                          <div className="flex items-center">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === job.employmentType)?.label || job.employmentType}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                      {job.createdBy && (
                        <span className="text-xs text-slate-400">
                          Posted by <span className="font-medium text-slate-500">{job.createdBy.name}</span>
                        </span>
                      )}
                      {canCreate && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(job)}
                          >
                            <Pencil size={14} className="mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(job)}
                            disabled={deletingId === job._id}
                          >
                            <Trash2 size={14} className="mr-1.5" />
                            {deletingId === job._id ? 'Deleting…' : 'Delete'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {job.description && (
                    <div className="mt-4">
                      <p className="line-clamp-3 text-sm text-slate-600 leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                  )}

                  {(job.requiredSkills?.length > 0) && (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mr-1">Skills:</span>
                        {job.requiredSkills.map((skill) => (
                          <span key={skill} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default JobsPage
