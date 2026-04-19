import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MailCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/api.js'
import { formatDateTime } from '../utils/date.js'

import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const PAGE_SIZE = 20

const STATUS_COLOR_MAP = {
  queued: 'default',
  sent: 'success',
  failed: 'danger',
  skipped: 'warning',
  delivered: 'default',
  read: 'outline',
}

function NotificationsPage() {
  const { apiFetch, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canViewAllNotifications = useMemo(() => {
    const roleKeys = user?.roles?.map((role) => role.key) || []
    return roleKeys.some((role) => ['admin', 'recruiter', 'hiring_manager'].includes(role))
  }, [user])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      })

      if (unreadOnly) query.set('unreadOnly', 'true')
      if (canViewAllNotifications) query.set('scope', 'all')

      const data = await apiFetch(`/notifications?${query.toString()}`)
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
      setPages(Math.max(1, data.pagination?.pages || 1))
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [apiFetch, canViewAllNotifications, page, unreadOnly])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const markAsRead = async (notificationId) => {
    try {
      await apiFetch(`/notifications/${notificationId}/read`, { method: 'PATCH' })
      await loadNotifications()
    } catch (err) {
      setError(parseApiError(err))
    }
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 page-enter">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Notifications</h1>
        <p className="mt-1 text-slate-500">
          View email delivery history and mark updates as read.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Badge 
                variant={unreadCount > 0 ? "danger" : "outline"}
                className={unreadCount > 0 ? "" : "bg-slate-100 text-slate-600 border-slate-200"}
              >
                {unreadCount} unread
              </Badge>
              <Badge variant="outline" className="border-slate-300 text-slate-600">
                {canViewAllNotifications ? 'All notifications' : 'My notifications'}
              </Badge>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={unreadOnly}
                  onChange={(event) => {
                    setPage(1)
                    setUnreadOnly(event.target.checked)
                  }}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-main/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-main"></div>
              </div>
              <span className="text-sm font-medium text-slate-700 select-none">Unread only</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Notification List */}
      <div className="flex flex-col gap-3 md:gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-[100px] w-full animate-pulse rounded-xl bg-slate-200" />)
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <Bell size={44} strokeWidth={1} className="mb-4 opacity-40" />
              <h3 className="mb-1 text-lg font-bold text-slate-700">No notifications found</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {unreadOnly
                  ? 'You\'ve read everything — toggle off "Unread only" to see all.'
                  : 'No notifications have been sent yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification._id}
              className={`transition-opacity duration-200 ${
                notification.readAt ? 'opacity-70' : 'border-l-[3px] border-l-primary-main border-y-primary-main/20 border-r-primary-main/20 shadow-md shadow-primary-main/5'
              }`}
            >
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={STATUS_COLOR_MAP[notification.status] || 'default'}
                        className="capitalize"
                      >
                        {notification.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs border-slate-300 text-slate-600"
                      >
                        {notification.templateKey}
                      </Badge>
                      {!notification.readAt && (
                        <Badge variant="warning" className="uppercase tracking-wider text-[10px]">
                          Unread
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-400 whitespace-nowrap hidden sm:block">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 font-medium">
                    To: <strong className="text-slate-900">{notification.recipientEmail}</strong>
                  </p>

                  {notification.lastError && (
                    <p className="font-mono text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                      Error: {notification.lastError}
                    </p>
                  )}

                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-semibold text-slate-400 whitespace-nowrap sm:hidden">
                      {formatDateTime(notification.createdAt)}
                    </span>
                    <Button
                      size="sm"
                      variant={notification.readAt ? 'outline' : 'primary'}
                      disabled={Boolean(notification.readAt)}
                      onClick={() => markAsRead(notification._id)}
                      className={notification.readAt ? "text-slate-500 hover:text-slate-500 cursor-default" : ""}
                    >
                      {notification.readAt ? (
                        'Already read'
                      ) : (
                        <>
                          <MailCheck size={16} className="mr-1.5" />
                          Mark as read
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="flex items-center px-4 font-semibold text-sm text-slate-700">
              Page {page} of {pages}
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
