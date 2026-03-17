import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'

export function RequireAuth() {
  const { token, bootstrapped } = useAuth()
  const loc = useLocation()

  if (!bootstrapped) {
    return (
      <div className="page page-center">
        <div className="container container-tight py-4">
          <div className="text-center text-muted">Loading…</div>
        </div>
      </div>
    )
  }

  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <Outlet />
}

export function RequirePlatformAdmin() {
  const { user, bootstrapped } = useAuth()
  const loc = useLocation()

  if (!bootstrapped) return null
  if (!user?.is_platform_admin) return <Navigate to="/app" replace state={{ from: loc.pathname }} />
  return <Outlet />
}

