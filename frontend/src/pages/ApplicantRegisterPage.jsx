import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { Card, CardContent } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Button } from '../components/ui/Button.jsx'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  experienceYears: 0,
  skills: '',
}

function ApplicantRegisterPage() {
  const { user, registerApplicant } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/applicant/dashboard" replace />
  }

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await registerApplicant({
        ...form,
        experienceYears: Number(form.experienceYears || 0),
        skills: form.skills
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      })
      navigate('/applicant/dashboard', { replace: true })
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-xl border-slate-200 bg-white">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-main/10 text-primary-main">
              <UserPlus size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Create Applicant Account</h1>
              <p className="text-sm text-slate-500">Apply to open roles and track your progress.</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  First Name
                </label>
                <Input
                  value={form.firstName}
                  onChange={setField('firstName')}
                  placeholder="Aisha"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last Name
                </label>
                <Input
                  value={form.lastName}
                  onChange={setField('lastName')}
                  placeholder="Verma"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={setField('email')}
                placeholder="aisha.verma@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Password
              </label>
              <Input
                type="password"
                minLength={8}
                value={form.password}
                onChange={setField('password')}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </label>
                <Input
                  value={form.phone}
                  onChange={setField('phone')}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Experience (years)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.experienceYears}
                  onChange={setField('experienceYears')}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Skills
              </label>
              <Input
                value={form.skills}
                onChange={setField('skills')}
                placeholder="React, Node.js, SQL"
              />
            </div>

            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-main hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ApplicantRegisterPage
