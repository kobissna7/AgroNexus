import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { dashboardByRole } from '../lib/redirects'
import type { UserRole } from '../types'

interface Props {
  allowedRoles: UserRole[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, token } = useAuth()
  const location = useLocation()

  // Unauthenticated → login, preserving where they were headed
  if (!token || !user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  // Authenticated but wrong role → their own home (not /login, which would loop)
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={dashboardByRole[user.role] ?? '/'} replace />
  }
  return <Outlet />
}
