import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { getDefaultPathForRoles } from '../utils/routing.js'
import { Mail, Lock } from 'lucide-react'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'

function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const userRoleKeys = user?.roles?.map((role) => role.key) || []

  if (user) {
    return <Navigate to={getDefaultPathForRoles(userRoleKeys)} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const loggedInUser = await login({ email, password })
      const roleKeys = loggedInUser?.roles?.map((role) => role.key) || []
      const defaultDestination = getDefaultPathForRoles(roleKeys)
      const requestedPath = location.state?.from?.pathname
      const isDashboardRestricted =
        requestedPath === '/dashboard' && defaultDestination === '/applications'
      const destination = isDashboardRestricted
        ? defaultDestination
        : requestedPath || defaultDestination
      navigate(destination, { replace: true })
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 px-4">
      {/* Animated Mesh Gradient Background (Aceternity style) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-[20%] right-[0%] w-[40%] h-[60%] rounded-full bg-indigo-400/20 blur-[120px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        {/* Subtle grid pattern over the background */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA0MCAwIEwgMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLCAwLCAwLCAwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col gap-8">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3">
          <img
            src="/logo.png"
            alt="HireMatrix"
            className="h-12 w-12 rounded-2xl object-contain shadow-lg shadow-slate-300/40"
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold leading-tight text-slate-900 tracking-tight">
              HireMatrix
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Talent Operations Hub
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-200/50">
          <CardContent className="p-8">
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">
                  Welcome back
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Sign in to manage your hiring pipeline.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Email Address</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Mail size={18} />
                    </div>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      className="pl-10"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock size={18} />
                    </div>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete="current-password"
                      className="pl-10"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <Button
                  size="lg"
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-full text-base font-semibold"
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm font-medium text-slate-500">
          Contact your administrator if you need access.
        </p>
        <p className="text-center text-sm text-slate-500">
          Applying for a role?{' '}
          <Link to="/register" className="font-semibold text-primary-main hover:underline">
            Create applicant account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
