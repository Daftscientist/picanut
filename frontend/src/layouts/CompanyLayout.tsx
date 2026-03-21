import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Printer, ShoppingBag, Package, Network, Users, LogOut, LayoutDashboard } from 'lucide-react';
import { clsx } from 'clsx';

export default function CompanyLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/app', icon: Home },
    { name: 'Print', path: '/app/print', icon: Printer },
    { name: 'Queue', path: '/app/print-queue', icon: LayoutDashboard },
    { name: 'Orders', path: '/app/orders', icon: ShoppingBag },
    { name: 'Products', path: '/app/products', icon: Package },
  ];

  if (user?.role === 'manager' || user?.is_platform_admin) {
    navItems.push(
      { name: 'Agents', path: '/app/agents', icon: Network },
      { name: 'Team', path: '/app/team', icon: Users }
    );
  }

  return (
    <div className="page">
      <header className="navbar navbar-expand-md navbar-dark d-print-none bg-dark-blue">
        <div className="container-xl">
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu">
            <span className="navbar-toggler-icon"></span>
          </button>
          <h1 className="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
            <Link to="/app" className="d-flex align-items-center gap-2 text-white">
              <span className="fw-bold">LabelFlow</span>
            </Link>
          </h1>
          <div className="navbar-nav flex-row order-md-last">
            <div className="nav-item dropdown">
              <div className="d-flex lh-1 text-reset p-0 cursor-pointer align-items-center">
                <span className="avatar avatar-sm bg-blue-lt">{user?.username?.[0].toUpperCase()}</span>
                <div className="d-none d-xl-block ps-2">
                  <div className="text-white">{user?.username}</div>
                  <div className="mt-1 small text-muted">{user?.role}</div>
                </div>
              </div>
            </div>
            {user?.is_platform_admin && (
              <div className="nav-item ms-3">
                <Link to="/admin" className="btn btn-ghost-light btn-sm">
                  <LayoutDashboard size={14} className="me-2" />
                  Admin
                </Link>
              </div>
            )}
            <div className="nav-item ms-3">
              <button onClick={logout} className="btn btn-ghost-danger btn-sm">
                <LogOut size={14} className="me-2" />
                Logout
              </button>
            </div>
          </div>
          <div className="collapse navbar-collapse" id="navbar-menu">
            <div className="d-flex flex-column flex-md-row flex-fill align-items-stretch align-items-md-center">
              <ul className="navbar-nav">
                {navItems.map((item) => (
                  <li key={item.path} className={clsx('nav-item', location.pathname === item.path && 'active bg-blue-700 rounded')}>
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
          </div>
        </div>
      </header>
      <div className="page-wrapper">
        <div className="bg-dark-blue pb-6 d-print-none" style={{ marginTop: '-1px' }}>
          <div className="container-xl" style={{ height: '80px' }}></div>
        </div>
        <div className="container-xl" style={{ marginTop: '-100px' }}>
            <Outlet />
        </div>
      </div>
    </div>
  );
}
