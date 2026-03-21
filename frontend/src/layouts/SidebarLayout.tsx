import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Printer,
  ShoppingBag,
  Package,
  Network,
  Users,
  LogOut,
  LayoutDashboard,
  Settings,
  ChevronRight,
  Menu,
  X,
  PenTool
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

export default function SidebarLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: Home },
    { name: 'Products', path: '/app/products', icon: Package },
    { name: 'Print Label', path: '/app/print', icon: Printer },
    { name: 'Label Designer', path: '/app/designer', icon: PenTool },
    { name: 'Print Queue', path: '/app/print-queue', icon: LayoutDashboard },
    { name: 'Orders', path: '/app/orders', icon: ShoppingBag },
  ];

  if (user?.role === 'manager' || user?.is_platform_admin) {
    navItems.push(
      { name: 'Agents', path: '/app/agents', icon: Network },
      { name: 'Team', path: '/app/team', icon: Users }
    );
  }

  const adminItems = [
    { name: 'Plans', path: '/admin/plans', icon: Settings },
    { name: 'Organizations', path: '/admin/orgs', icon: Settings },
  ];

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="page">
      {/* Sidebar for Desktop & Mobile */}
      <aside className={clsx(
        "navbar navbar-vertical navbar-expand-lg navbar-dark bg-dark shadow-lg transition-transform",
        isMobileMenuOpen ? "translate-x-0" : "sidebar-hidden lg-translate-x-0"
      )} style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 1050, width: '250px' }}>
        <div className="container-fluid flex-column h-100 p-0">
          <div className="navbar-brand-container w-100 px-4 py-4 d-flex align-items-center justify-content-between">
            <Link to="/app" className="d-flex align-items-center gap-2 text-decoration-none">
              <div className="bg-primary p-2 rounded text-white shadow-sm d-flex">
                <Printer size={20} />
              </div>
              <span className="fw-bold tracking-tight text-white h3 mb-0">LabelFlow</span>
            </Link>
            <button className="btn btn-icon btn-ghost-light d-lg-none" onClick={toggleMobileMenu}>
              <X size={24} />
            </button>
          </div>

          <div className="navbar-collapse w-100 flex-grow-1 overflow-auto custom-scrollbar">
            <ul className="navbar-nav pt-2">
              <li className="nav-item-header text-muted text-uppercase small fw-bold px-4 mb-2 opacity-50">Main Menu</li>
              {navItems.map((item) => (
                <li key={item.path} className={clsx('nav-item mx-2 mb-1', location.pathname === item.path && 'active bg-primary bg-opacity-10 rounded')}>
                  <Link
                    to={item.path}
                    className={clsx(
                      "nav-link py-2 px-3 d-flex align-items-center rounded transition-all",
                      location.pathname === item.path ? "text-primary fw-bold" : "text-light opacity-75 hover-opacity-100"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="nav-link-icon me-3">
                      <item.icon size={18} />
                    </span>
                    <span className="nav-link-title">{item.name}</span>
                    {location.pathname === item.path && <ChevronRight size={14} className="ms-auto" />}
                  </Link>
                </li>
              ))}

              {user?.is_platform_admin && (
                <>
                  <li className="nav-item-header text-muted text-uppercase small fw-bold px-4 mt-4 mb-2 opacity-50">Platform Admin</li>
                  {adminItems.map((item) => (
                    <li key={item.path} className={clsx('nav-item mx-2 mb-1', location.pathname === item.path && 'active bg-primary bg-opacity-10 rounded')}>
                      <Link
                        to={item.path}
                        className={clsx(
                          "nav-link py-2 px-3 d-flex align-items-center rounded transition-all",
                          location.pathname === item.path ? "text-primary fw-bold" : "text-light opacity-75 hover-opacity-100"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="nav-link-icon me-3">
                          <item.icon size={18} />
                        </span>
                        <span className="nav-link-title">{item.name}</span>
                        {location.pathname === item.path && <ChevronRight size={14} className="ms-auto" />}
                      </Link>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>

          <div className="navbar-footer w-100 p-3 mt-auto border-top border-white border-opacity-10">
             <div className="d-flex align-items-center p-2 mb-2 bg-white bg-opacity-5 rounded">
                <span className="avatar avatar-sm rounded bg-primary-lt me-3 shadow-sm">{user?.username?.[0].toUpperCase()}</span>
                <div className="overflow-hidden">
                  <div className="text-white text-truncate fw-bold small">{user?.username}</div>
                  <div className="text-muted text-capitalize" style={{ fontSize: '10px' }}>{user?.role}</div>
                </div>
             </div>
             <button onClick={logout} className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center border-0 bg-danger bg-opacity-10 py-2">
                <LogOut size={14} className="me-2" /> Logout
             </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed-inset bg-dark bg-opacity-50 lg-none"
          style={{ position: 'fixed', inset: 0, zIndex: 1040 }}
          onClick={toggleMobileMenu}
        />
      )}

      {/* Main Content Area */}
      <div className="page-wrapper bg-light min-vh-100 transition-all" style={{ marginLeft: '0', paddingLeft: '0' }}>
        <div className="main-content-container">
          {/* Top Navbar for Mobile & Desktop Actions */}
          <header className="navbar navbar-expand-md navbar-light bg-white border-bottom py-3 sticky-top shadow-sm d-print-none">
            <div className="container-xl">
              <button className="btn btn-icon btn-ghost-secondary d-lg-none me-3" onClick={toggleMobileMenu}>
                <Menu size={24} />
              </button>

              <div className="d-flex align-items-center d-lg-none gap-2 flex-grow-1">
                <Printer size={20} className="text-primary" />
                <span className="fw-bold h4 mb-0">LabelFlow</span>
              </div>

              <div className="navbar-nav ms-auto d-none d-md-flex align-items-center">
                <div className="nav-item me-3">
                  <span className="badge bg-green-lt px-2 py-1 d-flex align-items-center gap-1">
                    <span className="status-dot status-dot-animated bg-green"></span>
                    System Online
                  </span>
                </div>
                <div className="nav-item border-start ps-3 small text-muted">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
          </header>

          <main className="page-body m-0 py-4 py-lg-5">
            <div className="container-xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .hover-opacity-100:hover { opacity: 1 !important; }
        .fixed-inset { position: fixed; inset: 0; }

        .translate-x-0 { transform: translateX(0); }
        .sidebar-hidden { transform: translateX(-100%); }

        @media (min-width: 992px) {
          .lg-translate-x-0 { transform: translateX(0) !important; }
          .main-content-container { padding-left: 250px; }
          .lg-none { display: none !important; }
        }
        .transition-transform { transition: transform 0.3s ease; }
        .transition-all { transition: all 0.3s ease; }
      `}</style>
    </div>
  );
}
