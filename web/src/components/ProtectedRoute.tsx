import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'

interface Props {
  allowedRoles: UserRole[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />
  return <Outlet />
}
