import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileUp, CalendarClock, Briefcase, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { getCandidateDisplayEmail, getCandidateDisplayName } from '../utils/candidateDisplay.js'
import { formatDateTime, formatTime } from '../utils/date.js'
import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const stageVariant = (stage) => {
  if (stage === 'hired') return 'success'
  if (stage === 'rejected') return 'destructive'
  if (stage === 'offer') return 'default'
  return 'secondary'
}

function ApplicantDashboardPage() {
  const { apiFetch } = useAuth()
  const resumeInputRef = useRef(null)
  const [candidate, setCandidate] = useState(null)
  const [resumes, setResumes] = useState([])
  const [applications, setApplications] = useState([])
  const [interviews, setInterviews] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleResumeSelection = (event) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)

    if (file) {
      setError('')
      setSuccess('')
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [profileData, applicationData] = await Promise.all([
        apiFetch('/applicant/profile'),
        apiFetch('/applicant/applications'),
      ])

      setCandidate(profileData.candidate || null)
      setResumes(profileData.resumes || [])
      setApplications(applicationData.applications || [])
      setInterviews(applicationData.interviews || [])
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    load()
  }, [load])

  const upcomingInterviews = useMemo(() => {
    const now = Date.now()
    return interviews
      .filter((item) => new Date(item.scheduledStartAt).getTime() >= now)
      .slice(0, 5)
  }, [interviews])

  const handleUploadResume = async () => {
    if (!selectedFile) {
      setError('Please choose a resume file before uploading.')
      return
    }

    setError('')
    setSuccess('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('resume', selectedFile)
      await apiFetch('/applicant/resume', {
        method: 'POST',
        body: formData,
      })
      setSelectedFile(null)
      if (resumeInputRef.current) {
        resumeInputRef.current.value = ''
      }
      setSuccess('Resume uploaded successfully. Any active applications are queued for re-scoring.')
      await load()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">My Applications</h1>
        <p className="mt-1 text-slate-500">Track your current stage and interview schedule in one place.</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserRound size={18} className="text-primary-main" />
              <h2 className="text-base font-bold text-slate-900">Profile</h2>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                {getCandidateDisplayName(candidate, 'Applicant')}
              </p>
              <p>{getCandidateDisplayEmail(candidate, '-')}</p>
              {candidate?.phone && <p>{candidate.phone}</p>}
              <p>Experience: {candidate?.experienceYears || 0} years</p>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Upload latest resume
              </label>
              <div className="mb-3 flex flex-col gap-2">
                <Button as="label" variant="outline" size="sm" className="w-fit cursor-pointer">
                  Choose Resume
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleResumeSelection}
                    className="hidden"
                  />
                </Button>
                <p className="text-xs text-slate-500">
                  {selectedFile ? `Selected: ${selectedFile.name}` : 'No file selected'}
                </p>
              </div>
              <Button size="sm" onClick={handleUploadResume} disabled={uploading}>
                <FileUp size={14} className="mr-1.5" />
                {uploading ? 'Uploading…' : 'Upload Resume'}
              </Button>
              {resumes.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Last uploaded: {formatDateTime(resumes[0].createdAt)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock size={18} className="text-primary-main" />
              <h2 className="text-base font-bold text-slate-900">Upcoming Interviews</h2>
            </div>

            {upcomingInterviews.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming interviews yet.</p>
            ) : (
              <div className="space-y-3">
                {upcomingInterviews.map((interview) => (
                  <div key={interview._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">
                      {interview.applicationId?.jobId?.title || 'Interview'}
                    </p>
                    <p className="text-slate-600">
                      {formatDateTime(interview.scheduledStartAt)} -{' '}
                      {formatTime(interview.scheduledEndAt)}
                    </p>
                    {interview.meetingLink && (
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-primary-main hover:underline"
                      >
                        Join meeting
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Briefcase size={18} className="text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">Submitted Applications</h2>
          </div>

          {applications.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No applications submitted yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Last Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {applications.map((application) => (
                    <tr key={application._id}>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {application.jobId?.title || 'Unknown role'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{application.jobId?.department || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={stageVariant(application.currentStage)} className="capitalize">
                          {application.currentStage}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(application.stageChangedAt || application.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ApplicantDashboardPage
