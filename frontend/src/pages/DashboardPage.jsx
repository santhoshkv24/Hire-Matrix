import { useEffect, useState } from 'react'
import {
  Briefcase,
  UserSearch,
  Kanban,
  Award,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'

const METRIC_CARDS = [
  {
    key: 'totalJobs',
    label: 'Total Jobs',
    icon: Briefcase,
    color: '#0f5fd7',
    bg: 'rgba(15,95,215,0.08)',
  },
  {
    key: 'openJobs',
    label: 'Open Roles',
    icon: TrendingUp,
    color: '#148a56',
    bg: 'rgba(20,138,86,0.08)',
  },
  {
    key: 'totalCandidates',
    label: 'Candidates',
    icon: UserSearch,
    color: '#ea7a1f',
    bg: 'rgba(234,122,31,0.08)',
  },
  {
    key: 'totalApplications',
    label: 'Applications',
    icon: FileText,
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
  },
  {
    key: 'hires',
    label: 'Hires',
    icon: Award,
    color: '#148a56',
    bg: 'rgba(20,138,86,0.1)',
  },
  {
    key: 'scheduledInterviews',
    label: 'Scheduled Interviews',
    icon: Kanban,
    color: '#0f5fd7',
    bg: 'rgba(15,95,215,0.08)',
  },
  {
    key: 'offerStageCount',
    label: 'Offers In Progress',
    icon: TrendingUp,
    color: '#ea7a1f',
    bg: 'rgba(234,122,31,0.08)',
  },
]

const STAGE_COLORS = {
  applied: '#4f8df0',
  screening: '#ea7a1f',
  interview: '#7c3aed',
  offer: '#148a56',
  hired: '#0f5fd7',
  rejected: '#cc3f3f',
}

const QUICK_ACTIONS = [
  { label: 'Post a Job', to: '/jobs', icon: Briefcase, color: 'primary' },
  { label: 'Add Candidate', to: '/candidates', icon: UserSearch, color: 'secondary' },
  { label: 'View Pipeline', to: '/pipeline', icon: Kanban, color: 'primary' },
]

function DashboardPage() {
  const { apiFetch } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch('/dashboard/metrics')
        setMetrics(data)
      } catch (err) {
        setError(parseApiError(err))
      }
    }
    load()
  }, [apiFetch])

  const totalInStages = (metrics?.stageCounts || []).reduce(
    (sum, s) => sum + s.count,
    0,
  )

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">
            Pipeline visibility across jobs, applicants, and hiring outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.to}
                asChild
                variant="outline"
                size="sm"
                className="h-9 font-medium"
              >
                <Link to={action.to}>
                  <Icon size={16} className="mr-2 text-slate-500" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {/* Metric Cards (Bento style layouts) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 md:gap-5">
        {METRIC_CARDS.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.key} className="flex">
              <Card className="w-full flex-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: item.bg, color: item.color }}
                  >
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {item.label}
                    </span>
                    <span 
                      className="text-3xl font-extrabold leading-none tracking-tight"
                      style={{ color: item.color }}
                    >
                      {metrics ? (
                        metrics[item.key] ?? 0
                      ) : (
                        <div className="mt-1 h-8 w-12 animate-pulse rounded bg-slate-200" />
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Stage Distribution */}
      <Card className="overflow-hidden border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md max-w-4xl">
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-slate-900">Pipeline Stage Distribution</h2>
              <p className="text-sm text-slate-500">
                Current spread of all applications across the hiring funnel
              </p>
            </div>
            {totalInStages > 0 && (
              <div className="inline-flex items-center rounded-full border border-primary-main/20 bg-primary-main/5 px-3 py-1 text-xs font-semibold text-primary-main">
                {totalInStages} total
              </div>
            )}
          </div>

          {!metrics ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : metrics.stageCounts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Kanban size={48} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">No applications yet. Add candidates and create applications to see stage data.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {metrics.stageCounts
                .sort((a, b) => b.count - a.count)
                .map((item) => {
                  const pct = totalInStages > 0 ? Math.round((item.count / totalInStages) * 100) : 0
                  const color = STAGE_COLORS[item._id] || '#4f6384'
                  return (
                    <div key={item._id} className="group">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2.5 w-2.5 rounded-full" 
                            style={{ backgroundColor: color }} 
                          />
                          <span className="text-sm font-semibold capitalize text-slate-700">
                            {item._id}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-400">{pct}%</span>
                          <span className="text-sm font-bold text-slate-900">{item.count}</span>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 relative">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage
