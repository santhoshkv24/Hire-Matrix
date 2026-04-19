import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Menu,
  LayoutDashboard,
  Briefcase,
  Users,
  CalendarClock,
  KanbanSquare,
  MessageSquare,
  Gavel,
  Download,
  ShieldCheck,
  FileText,
  Bell,
  LogOut,
  X
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { cn } from '../lib/utils.js'
import BrandPlaceholder from './BrandPlaceholder.jsx'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'recruiter', 'hiring_manager'] },
  { label: 'Jobs', path: '/jobs', icon: Briefcase, roles: ['admin', 'recruiter', 'hiring_manager'] },
  { label: 'Candidates', path: '/candidates', icon: Users, roles: ['admin', 'recruiter', 'hiring_manager'] },
  { label: 'Applications', path: '/applications', icon: FileText, roles: ['admin', 'recruiter', 'hiring_manager', 'interviewer'] },
  { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['admin', 'recruiter', 'hiring_manager', 'interviewer'] },
  {
    label: 'Interviews',
    path: '/interviews',
    icon: CalendarClock,
    roles: ['admin', 'recruiter', 'hiring_manager', 'interviewer'],
  },
  { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare, roles: ['admin', 'recruiter', 'hiring_manager'] },
  {
    label: 'Interview Feedback',
    path: '/feedback',
    icon: MessageSquare,
    roles: ['admin', 'interviewer', 'hiring_manager'],
  },
  {
    label: 'Hiring Decisions',
    path: '/decisions',
    icon: Gavel,
    roles: ['admin', 'hiring_manager'],
  },
  {
    label: 'CSV Exports',
    path: '/exports',
    icon: Download,
    roles: ['admin', 'recruiter'],
  },
  {
    label: 'Hiring Teams',
    path: '/hiring-teams',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'Admin Users',
    path: '/admin/users',
    icon: ShieldCheck,
    roles: ['admin'],
  },
]

function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, logout, apiFetch } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const userRoleKeys = useMemo(() => user?.roles?.map((role) => role.key) ?? [], [user])
  const canViewAllNotifications = useMemo(() => {
    return userRoleKeys.some((role) => ['admin', 'recruiter', 'hiring_manager'].includes(role))
  }, [userRoleKeys])

  const loadUnreadCount = useCallback(async () => {
    try {
      const query = new URLSearchParams({ limit: '1', unreadOnly: 'true' })
      if (canViewAllNotifications) {
        query.set('scope', 'all')
      }
      const data = await apiFetch(`/notifications?${query.toString()}`)
      setUnreadCount(data.unreadCount || 0)
    } catch {
      setUnreadCount(0)
    }
  }, [apiFetch, canViewAllNotifications])

  useEffect(() => {
    loadUnreadCount()
    const intervalId = window.setInterval(loadUnreadCount, 30000)
    return () => clearInterval(intervalId)
  }, [loadUnreadCount])

  const visibleNav = useMemo(() => {
    return navItems.filter((item) => {
      return userRoleKeys.some((role) => item.roles.includes(role))
    })
  }, [userRoleKeys])

  const SidebarContent = () => (
    <div className="flex h-full flex-col px-4 py-6 text-slate-700">
      <div className="mb-6 flex items-center gap-3">
        <BrandPlaceholder />
        <div>
          <h2 className="text-lg font-bold leading-tight text-slate-900">HireMatrix</h2>
          <p className="text-xs text-slate-500">Talent Operations Hub</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pb-4">
        {visibleNav.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          const isNotif = item.path === '/notifications'
          const Icon = item.icon
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setDrawerOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary-main/10 text-primary-main font-bold" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="relative flex h-5 w-5 items-center justify-center">
                <Icon size={18} className={cn(isActive ? "text-primary-main" : "text-slate-500 group-hover:text-slate-700")} />
                {isNotif && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[260px] transform border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button 
          onClick={() => setDrawerOpen(false)}
          className="absolute right-4 top-6 p-1 text-slate-400 hover:text-slate-600 lg:hidden"
        >
          <X size={20} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex min-h-[64px] shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:min-h-[72px] sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setDrawerOpen(true)}
              className="rounded-md p-2 -ml-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base font-semibold leading-tight text-slate-900 sm:text-lg">Hiring Workspace</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Signed in as {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => navigate('/notifications')}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white border-2 border-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 md:flex">
              {user?.roles?.map((role) => role.name).join(', ') || 'User'}
            </div>
            
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-main text-sm font-semibold text-white shadow-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="ml-1 hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors sm:flex"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell
