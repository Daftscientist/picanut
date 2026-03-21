import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'

function NavItem({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    >
      <span className="nav-link-title">{children}</span>
    </NavLink>
  )
}

export function CompanyLayout() {
  const { user, logout } = useAuth()
  const isManager = user?.role === 'manager' || user?.is_platform_admin

  return (
    <div className="page">
      <header className="navbar navbar-expand-md navbar-light d-print-none">
        <div className="container-xl">
          <span className="navbar-brand navbar-brand-autodark">LabelFlow</span>
          <div className="navbar-nav flex-row order-md-last">
            {user?.is_platform_admin && (
              <NavLink className="btn btn-sm btn-outline-secondary me-2" to="/admin">
                Platform admin
              </NavLink>
            )}
            <button className="btn btn-sm btn-outline-secondary" onClick={logout}>
              Logout ({user?.username})
            </button>
          </div>
        </div>
      </header>

      {/* Tabler overlap header/nav */}
      <header className="navbar-expand-md">
        <div className="collapse navbar-collapse">
          <div className="navbar navbar-light">
            <div className="container-xl">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <NavItem to="/app" end>Home</NavItem>
                </li>
                <li className="nav-item">
                  <NavItem to="/app/orders">Orders</NavItem>
                </li>
                <li className="nav-item">
                  <NavItem to="/app/print-queue">Print queue</NavItem>
                </li>
                <li className="nav-item">
                  <NavItem to="/app/products">Products</NavItem>
                </li>
                {isManager && (
                  <>
                    <li className="nav-item">
                      <NavItem to="/app/agents">Agents</NavItem>
                    </li>
                    <li className="nav-item">
                      <NavItem to="/app/team">Team</NavItem>
                    </li>
                    <li className="nav-item">
                      <NavItem to="/app/billing">Billing</NavItem>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </header>

      <div className="page-wrapper">
        <Outlet />
      </div>
    </div>
  )
}

