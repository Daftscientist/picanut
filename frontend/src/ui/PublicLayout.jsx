import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'

export function PublicLayout() {
  const { token, user, logout } = useAuth()

  return (
    <div className="page">
      <header className="navbar navbar-expand-md navbar-light d-print-none">
        <div className="container-xl">
          <h1 className="navbar-brand navbar-brand-autodark pe-0 pe-md-3">
            <Link to="/">LabelFlow</Link>
          </h1>

          <div className="navbar-nav flex-row order-md-last">
            {token ? (
              <div className="nav-item dropdown">
                <button className="btn btn-sm btn-outline-secondary" onClick={logout}>
                  Logout ({user?.username})
                </button>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link className="btn btn-sm btn-outline-secondary" to="/login">Login</Link>
                <Link className="btn btn-sm btn-primary" to="/signup">Sign up</Link>
              </div>
            )}
          </div>

          <div className="collapse navbar-collapse">
            <div className="navbar-nav">
              <NavLink className="nav-link" to="/pricing">Pricing</NavLink>
              {token && <NavLink className="nav-link" to="/app">Dashboard</NavLink>}
              {token && user?.is_platform_admin && <NavLink className="nav-link" to="/admin">Platform</NavLink>}
            </div>
          </div>
        </div>
      </header>

      <div className="page-wrapper">
        <Outlet />
        <footer className="footer footer-transparent d-print-none">
          <div className="container-xl">
            <div className="text-center text-muted">LabelFlow</div>
          </div>
        </footer>
      </div>
    </div>
  )
}

