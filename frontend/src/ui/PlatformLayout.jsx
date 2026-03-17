import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'

function SideLink({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    >
      {children}
    </NavLink>
  )
}

export function PlatformLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="page">
      <header className="navbar navbar-light d-print-none">
        <div className="container-xl">
          <span className="navbar-brand navbar-brand-autodark">Platform admin</span>
          <div className="navbar-nav flex-row order-md-last">
            <NavLink className="btn btn-sm btn-outline-secondary me-2" to="/app">
              Company dashboard
            </NavLink>
            <button className="btn btn-sm btn-outline-secondary" onClick={logout}>
              Logout ({user?.username})
            </button>
          </div>
        </div>
      </header>

      <div className="page-wrapper">
        <div className="container-xl">
          <div className="row g-4">
            <div className="col-12 col-md-3 col-lg-2">
              <div className="card">
                <div className="card-body p-2">
                  <div className="nav flex-column nav-pills">
                    <SideLink to="/admin" end>Plans</SideLink>
                    <SideLink to="/admin/organizations">Organizations</SideLink>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-9 col-lg-10">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

