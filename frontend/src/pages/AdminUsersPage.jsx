import { useCallback, useEffect, useState } from 'react'
import {
  UserPlus,
  Lock,
  Mail,
  User,
  Shield,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const initialForm = {
  name: '',
  email: '',
  password: '',
  roleKeys: [],
}

const initialFieldErrors = {
  name: '',
  email: '',
  password: '',
  roleKeys: '',
}

function validateForm(form) {
  const errors = { ...initialFieldErrors }
  let valid = true

  if (!form.name || form.name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.'
    valid = false
  }
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address.'
    valid = false
  }
  if (!form.password || form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
    valid = false
  }
  if (form.roleKeys.length === 0) {
    errors.roleKeys = 'Select at least one role.'
    valid = false
  }

  return { errors, valid }
}

function PasswordStrength({ password }) {
  if (!password) return null
  const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : 1
  const labels = ['', 'Weak', 'Good', 'Strong']
  const colors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500']
  const textColors = ['', 'text-red-600', 'text-amber-600', 'text-emerald-600']
  const widths = ['', 'w-1/3', 'w-2/3', 'w-full']

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${widths[strength]} ${colors[strength]} transition-all duration-300 ease-out`}
        />
      </div>
      <span className={`text-[11px] font-semibold uppercase tracking-wider ${textColors[strength]}`}>
        {labels[strength]}
      </span>
    </div>
  )
}

function AdminUsersPage() {
  const { apiFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [usersData, rolesData] = await Promise.all([
      apiFetch('/admin/users'),
      apiFetch('/admin/roles'),
    ])
    setUsers(usersData.users)
    setRoles(rolesData.roles)
  }, [apiFetch])

  useEffect(() => {
    const init = async () => {
      try {
        await load()
      } catch (err) {
        setError(parseApiError(err))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [load])

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const { errors, valid } = validateForm(form)
    setFieldErrors(errors)
    if (!valid) return

    try {
      setSaving(true)
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setForm(initialForm)
      setFieldErrors(initialFieldErrors)
      setSuccess('User created successfully.')
      await load()
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const toggleRole = (roleKey) => {
    setForm((prev) => {
      const keys = prev.roleKeys.includes(roleKey)
        ? prev.roleKeys.filter((k) => k !== roleKey)
        : [...prev.roleKeys, roleKey]
      
      if (fieldErrors.roleKeys) {
        setFieldErrors((e) => ({ ...e, roleKeys: '' }))
      }
      return { ...prev, roleKeys: keys }
    })
  }

  const toggleActive = async (user) => {
    try {
      await apiFetch(`/admin/users/${user._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      await load()
    } catch (err) {
      setError(parseApiError(err))
    }
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Admin Users</h1>
        <p className="mt-1 text-slate-500">
          Provision team members and manage their role assignments.
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

      {/* Create User Form */}
      <Card className="overflow-hidden">
        <CardContent className="p-5 md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-main/10 text-primary-main">
              <UserPlus size={20} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-slate-900">Create New User</h3>
              <p className="text-sm text-slate-500">
                New users can log in immediately after creation.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} noValidate>
            <div className="flex flex-col gap-6">
              {/* Identity Section */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Identity</h4>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User size={16} />
                      </div>
                      <Input
                        value={form.name}
                        onChange={handleFieldChange('name')}
                        required
                        className={`pl-9 ${fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                    </div>
                    {(fieldErrors.name || true) && (
                      <p className={`text-xs ${fieldErrors.name ? 'text-red-500' : 'text-slate-500'}`}>
                        {fieldErrors.name || 'First and last name'}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Mail size={16} />
                      </div>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={handleFieldChange('email')}
                        required
                        className={`pl-9 ${fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                    </div>
                    {(fieldErrors.email || true) && (
                      <p className={`text-xs ${fieldErrors.email ? 'text-red-500' : 'text-slate-500'}`}>
                        {fieldErrors.email || 'Used to sign in to HireMatrix'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              {/* Credentials Section */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Credentials</h4>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock size={16} />
                    </div>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={handleFieldChange('password')}
                      required
                      className={`pl-9 ${fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                  </div>
                  {(fieldErrors.password || true) && (
                    <p className={`text-xs ${fieldErrors.password ? 'text-red-500' : 'text-slate-500'}`}>
                      {fieldErrors.password || 'Minimum 8 characters required'}
                    </p>
                  )}
                  <PasswordStrength password={form.password} />
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              {/* Role Selection */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Role Assignment</h4>
                <div>
                  <p className="mb-3 text-sm text-slate-500">
                    Select one or more roles. Roles control what pages and actions this user can access.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => {
                      const isSelected = form.roleKeys.includes(role.key)
                      return (
                        <button
                          key={role._id}
                          type="button"
                          onClick={() => toggleRole(role.key)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                            isSelected
                              ? 'border-primary-main bg-primary-main/10 text-primary-main'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Shield size={16} className={isSelected ? 'text-primary-main' : 'text-slate-400'} />
                          {role.name}
                        </button>
                      )
                    })}
                  </div>
                  {fieldErrors.roleKeys && (
                    <p className="mt-2 text-xs text-red-500">{fieldErrors.roleKeys}</p>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <Button type="submit" size="lg" disabled={saving} className="min-w-[160px]">
                  <UserPlus size={18} className="mr-2" />
                  {saving ? 'Creating…' : 'Create User'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 md:p-6">
            <h3 className="text-lg font-bold text-slate-900">Team Members</h3>
            {!loading && (
              <Badge variant="outline" className="uppercase">
                {users.length} user{users.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="p-5 md:p-6">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-slate-200" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
                <User size={40} className="mb-3 opacity-30" />
                <p>No users yet. Create the first one above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <th className="pb-3 pr-4 font-bold">Name</th>
                      <th className="pb-3 pr-4 font-bold">Email</th>
                      <th className="pb-3 pr-4 font-bold">Roles</th>
                      <th className="pb-3 text-right font-bold">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((entry) => (
                      <tr key={entry._id} className="transition-colors hover:bg-slate-50">
                        <td className="py-3 pr-4 font-medium text-slate-900">{entry.name}</td>
                        <td className="py-3 pr-4 text-slate-500">{entry.email}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1.5">
                            {entry.roles.map((role) => (
                              <Badge key={role._id} variant="outline" className="border-primary-main/20 text-primary-main bg-primary-main/5 text-[10px]">
                                {role.name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <label className="relative inline-flex cursor-pointer items-center justify-end">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={entry.isActive}
                              onChange={() => toggleActive(entry)}
                            />
                            <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-white after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300"></div>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminUsersPage
