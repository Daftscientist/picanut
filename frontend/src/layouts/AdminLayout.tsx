import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, Building2, LogOut, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Plans', path: '/admin/plans', icon: CreditCard },
    { name: 'Organizations', path: '/admin/orgs', icon: Building2 },
  ];

  return (
    <div className="page">
      <aside className="navbar navbar-vertical navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#sidebar-menu">
            <span className="navbar-toggler-icon"></span>
          </button>
          <h1 className="navbar-brand navbar-brand-autodark">
            <Link to="/admin">
              <span className="fw-bold">Platform Admin</span>
            </Link>
          </h1>
          <div className="collapse navbar-collapse" id="sidebar-menu">
            <ul className="navbar-nav pt-lg-3">
              <li className="nav-item mb-4">
                <Link to="/app" className="nav-link text-blue">
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <ArrowLeft size={18} />
                  </span>
                  <span className="nav-link-title">Back to App</span>
                </Link>
              </li>
              {navItems.map((item) => (
                <li key={item.path} className={clsx('nav-item', location.pathname === item.path && 'active')}>
                  <Link to={item.path} className="nav-link">
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <item.icon size={18} />
                    </span>
                    <span className="nav-link-title">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="navbar-nav flex-row d-lg-none">
             <div className="nav-item">
                <button onClick={logout} className="nav-link"><LogOut size={18} /></button>
             </div>
          </div>
        </div>
      </aside>
      <div className="page-wrapper">
        <div className="page-header d-print-none">
            <div className="container-xl">
                <div className="row g-2 align-items-center">
                    <div className="col">
                        <div className="text-muted small">Admin Dashboard</div>
                    </div>
                    <div className="col-auto ms-auto d-none d-lg-flex">
                        <div className="d-flex align-items-center gap-3">
                            <span className="text-muted small">Logged in as {user?.username}</span>
                            <button onClick={logout} className="btn btn-ghost-danger btn-sm">
                                <LogOut size={14} className="me-2" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="page-body mt-0">
          <div className="container-xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
