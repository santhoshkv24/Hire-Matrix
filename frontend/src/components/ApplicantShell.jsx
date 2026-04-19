import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Briefcase, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { cn } from '../lib/utils.js'
import BrandPlaceholder from './BrandPlaceholder.jsx'

const navItems = [
  { label: 'Dashboard', path: '/applicant/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', path: '/applicant/jobs', icon: Briefcase },
  { label: 'Notifications', path: '/applicant/notifications', icon: Bell },
]

function ApplicantShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandPlaceholder className="h-9 w-9 rounded-lg text-[8px]" />
            <div>
              <h1 className="text-base font-bold text-slate-900">HireMatrix Applicant Portal</h1>
              <p className="text-xs text-slate-500">Track your applications and interviews</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px,1fr] lg:py-8">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-main/10 text-primary-main'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ApplicantShell
