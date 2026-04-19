import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  UserSearch,
  UserPlus,
  Upload,
  Mail,
  Phone,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { getCandidateDisplayEmail, getCandidateDisplayName } from '../utils/candidateDisplay.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const SOURCE_OPTIONS = [
  { value: 'direct', label: 'Direct Application' },
  { value: 'referral', label: 'Employee Referral' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'job_board', label: 'Job Board' },
  { value: 'headhunter', label: 'Headhunter / Agency' },
  { value: 'other', label: 'Other' },
]

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  experienceYears: 0,
  skills: '',
  source: 'direct',
  notes: '',
}

function CandidatesPage() {
  const { apiFetch, user } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [selectedFiles, setSelectedFiles] = useState({})
  const [uploadingIds, setUploadingIds] = useState({})
  const [form, setForm] = useState(initialForm)
  const [editingCandidateId, setEditingCandidateId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const canCreate = useMemo(() => {
    const roleKeys = user?.roles?.map((role) => role.key) || []
    return roleKeys.some((role) => ['admin', 'recruiter'].includes(role))
  }, [user])

  const loadCandidates = useCallback(async () => {
    try {
      const data = await apiFetch('/candidates')
      setCandidates(data.candidates)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    loadCandidates()
  }, [loadCandidates])

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const resetForm = () => {
    setForm(initialForm)
    setEditingCandidateId(null)
  }

  const startEdit = (candidate) => {
    setEditingCandidateId(candidate._id)
    setForm({
      firstName: candidate.firstName || '',
      lastName: candidate.lastName || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      experienceYears: candidate.experienceYears ?? 0,
      skills: (candidate.skills || []).join(', '),
      source: candidate.source || 'direct',
      notes: candidate.notes || '',
    })
    setError('')
    setSuccess('')
  }

  const buildPayload = () => ({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    experienceYears: Number(form.experienceYears),
    source: form.source,
    notes: form.notes,
    skills: form.skills
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  })

  const handleCreate = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await apiFetch(editingCandidateId ? `/candidates/${editingCandidateId}` : '/candidates', {
        method: editingCandidateId ? 'PATCH' : 'POST',
        body: JSON.stringify(buildPayload()),
      })
      resetForm()
      setSuccess(
        editingCandidateId
          ? 'Candidate profile updated successfully.'
          : 'Candidate added successfully.',
      )
      await loadCandidates()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (candidate) => {
    const candidateName = getCandidateDisplayName(candidate)
    const shouldDelete = window.confirm(
      `Delete candidate "${candidateName}"? This action cannot be undone.`,
    )
    if (!shouldDelete) {
      return
    }

    setDeletingId(candidate._id)
    setError('')
    setSuccess('')

    try {
      await apiFetch(`/candidates/${candidate._id}`, { method: 'DELETE' })
      if (editingCandidateId === candidate._id) {
        resetForm()
      }
      setSuccess('Candidate removed successfully.')
      await loadCandidates()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpload = async (candidateId) => {
    const file = selectedFiles[candidateId]
    if (!file) {
      setError('Please choose a resume file before uploading.')
      return
    }

    const formData = new FormData()
    formData.append('resume', file)

    setUploadingIds((prev) => ({ ...prev, [candidateId]: true }))
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/candidates/${candidateId}/resume`, {
        method: 'POST',
        body: formData,
      })
      setSelectedFiles((prev) => ({ ...prev, [candidateId]: undefined }))
      setSuccess('Resume uploaded and queued for scoring.')
      await loadCandidates()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setUploadingIds((prev) => ({ ...prev, [candidateId]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Candidates</h1>
        <p className="mt-1 text-slate-500">
          Build candidate profiles and upload resumes for AI scoring.
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

      {/* Create Candidate Form */}
      {canCreate && (
        <Card className="overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-main/10 text-primary-main">
                <UserPlus size={20} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCandidateId ? 'Edit Candidate' : 'Add Candidate'}
                </h3>
                <p className="text-sm text-slate-500">
                  {editingCandidateId
                    ? 'Update profile details and keep candidate records accurate.'
                    : 'Create a candidate profile before uploading their resume.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} noValidate>
              <div className="flex flex-col gap-6">
                {/* Personal Info */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Personal Information</h4>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">First Name</label>
                        <Input
                          value={form.firstName}
                          onChange={setField('firstName')}
                          required
                          placeholder="Rahul"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Last Name</label>
                        <Input
                          value={form.lastName}
                          onChange={setField('lastName')}
                          required
                          placeholder="Sharma"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Mail size={16} />
                          </div>
                          <Input
                            type="email"
                            value={form.email}
                            onChange={setField('email')}
                            required
                            placeholder="rahul.sharma@example.com"
                            className="pl-9"
                          />
                        </div>
                        <p className="text-xs text-slate-500">This email becomes the candidate account identity.</p>
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Phone Number</label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Phone size={16} />
                          </div>
                          <Input
                            value={form.phone}
                            onChange={setField('phone')}
                            placeholder="+91 98765 43210"
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200" />

                {/* Professional */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Professional Background</h4>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Years of Experience</label>
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={form.experienceYears}
                          onChange={setField('experienceYears')}
                        />
                        <p className="text-xs text-slate-500">Total years of relevant work experience</p>
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">How did they hear about us?</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-main"
                          value={form.source}
                          onChange={setField('source')}
                        >
                          {SOURCE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500">Recruitment source tracking</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700">Skills</label>
                      <Input
                        value={form.skills}
                        onChange={setField('skills')}
                        placeholder="Python, React, SQL, AWS"
                      />
                      <p className="text-xs text-slate-500">Comma-separated — matched against job requirements for scoring</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200" />

                {/* Notes */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Internal Notes</h4>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Recruiter Notes</label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-main"
                      value={form.notes}
                      onChange={setField('notes')}
                      placeholder="Add any context about this candidate — referral details, initial impressions, etc."
                    />
                    <p className="text-xs text-slate-500">Only visible to your team, never shown to the candidate</p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <Button type="submit" size="lg" disabled={saving} className="min-w-[180px]">
                    {editingCandidateId ? <Pencil size={18} className="mr-2" /> : <UserPlus size={18} className="mr-2" />}
                    {saving ? (editingCandidateId ? 'Saving…' : 'Adding…') : (editingCandidateId ? 'Save Changes' : 'Add Candidate')}
                  </Button>
                  {editingCandidateId && (
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

      {/* Candidates List */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold text-slate-900">Candidate Profiles</h2>
          {!loading && (
            <Badge variant="outline" className="w-fit self-start sm:self-auto uppercase">
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 w-full animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <UserSearch size={48} className="mb-4 opacity-20" />
              <h3 className="mb-1 text-lg font-bold text-slate-900">No candidates yet</h3>
              <p className="text-sm">
                {canCreate
                  ? 'Add your first candidate using the form above.'
                  : 'No candidate profiles have been created yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {candidates.map((candidate) => (
              <Card key={candidate._id} className="transition-colors hover:border-slate-300 hover:shadow-sm">
                <CardContent className="p-5 md:p-6 text-sm">
                  <div className="flex flex-col gap-6 md:flex-row md:justify-between">
                    {/* Candidate Info */}
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between pr-4">
                        <h3 className="text-lg font-bold text-slate-900">
                          {getCandidateDisplayName(candidate)}
                        </h3>
                        {canCreate && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(candidate)}
                            >
                              <Pencil size={14} className="mr-1.5" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(candidate)}
                              disabled={deletingId === candidate._id}
                            >
                              <Trash2 size={14} className="mr-1.5" />
                              {deletingId === candidate._id ? 'Deleting…' : 'Delete'}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 md:gap-6 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Mail size={14} className="opacity-70" />
                          <span>{getCandidateDisplayEmail(candidate)}</span>
                        </div>
                        {candidate.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone size={14} className="opacity-70" />
                            <span>{candidate.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center font-medium bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-full text-xs">
                          {candidate.experienceYears} yr{candidate.experienceYears !== 1 ? 's' : ''} exp
                        </div>
                      </div>

                      {(candidate.skills?.length > 0) && (
                        <div className="mt-2 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {candidate.skills.map((skill) => (
                              <span key={skill} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resume Upload */}
                    {canCreate && (
                      <div className="flex w-full flex-col gap-2 rounded-lg bg-slate-50 p-4 border border-slate-100 shrink-0 md:max-w-xs md:w-64">
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          {candidate.latestResumeId ? 'Replace Resume' : 'Upload Resume'}
                        </span>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            as="label"
                            variant="outline"
                            className="w-full cursor-pointer justify-start"
                            size="sm"
                          >
                            <Upload size={14} className="mr-2 opacity-70" />
                            <span className="truncate">
                              {selectedFiles[candidate._id]
                                ? selectedFiles[candidate._id].name
                                : 'Choose PDF or Word doc'}
                            </span>
                            <input
                              className="hidden"
                              type="file"
                              accept=".pdf,.doc,.docx,.txt"
                              onChange={(event) => {
                                const file = event.target.files?.[0]
                                if (file) {
                                  setError('')
                                  setSelectedFiles((prev) => ({
                                    ...prev,
                                    [candidate._id]: file,
                                  }))
                                }
                              }}
                            />
                          </Button>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleUpload(candidate._id)}
                            disabled={!selectedFiles[candidate._id] || uploadingIds[candidate._id]}
                          >
                            {uploadingIds[candidate._id] ? 'Uploading…' : 'Upload & Score'}
                          </Button>
                        </div>
                        {candidate.latestResumeId && (
                          <span className="mt-1 flex items-center text-xs font-medium text-emerald-600">
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Resume on file
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CandidatesPage
