import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Printer, ShoppingBag, Package, LogOut, LayoutDashboard, Menu, X, PenTool } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

export default function OverlapLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: Home },
    { name: 'Print Label', path: '/app/print', icon: Printer },
    { name: 'Label Designer', path: '/app/designer', icon: PenTool },
    { name: 'Queue', path: '/app/print-queue', icon: LayoutDashboard },
    { name: 'Orders', path: '/app/orders', icon: ShoppingBag },
    { name: 'Products', path: '/app/products', icon: Package },
  ];

  return (
    <div className="page min-vh-100 bg-light">
      <header className="navbar navbar-expand-md navbar-dark d-print-none bg-dark py-3 py-lg-4 sticky-top">
        <div className="container-xl">
          <button className="navbar-toggler border-0 shadow-none p-2" type="button" onClick={() => setIsNavOpen(!isNavOpen)}>
            {isNavOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
          </button>

          <h1 className="navbar-brand pe-0 pe-md-4 me-0">
            <Link to="/app" className="d-flex align-items-center gap-2 text-white text-decoration-none">
              <div className="bg-primary p-2 rounded text-white shadow-sm d-flex">
                <Printer size={20} />
              </div>
              <span className="fw-bold tracking-tight h3 mb-0">LabelFlow</span>
            </Link>
          </h1>

          <div className="navbar-nav flex-row order-md-last align-items-center ms-auto">
             <div className="nav-item d-none d-lg-flex me-4 align-items-center bg-white bg-opacity-10 px-3 py-1 rounded-pill">
                <span className="status-dot status-dot-animated bg-green me-2"></span>
                <span className="text-white opacity-75 small fw-medium">Operational</span>
             </div>

             <div className="nav-item dropdown">
               <div className="d-flex lh-1 text-reset p-0 align-items-center" style={{ cursor: 'pointer' }}>
                  <span className="avatar avatar-sm rounded-circle bg-primary-lt shadow-sm me-2 border border-white border-opacity-10">
                    {user?.username?.[0].toUpperCase()}
                  </span>
                  <div className="d-none d-md-block ps-2">
                    <div className="text-white fw-bold small">{user?.username}</div>
                    <div className="text-muted text-capitalize" style={{ fontSize: '10px' }}>{user?.role}</div>
                  </div>
               </div>
             </div>

             <div className="nav-item ms-3 border-start border-white border-opacity-10 ps-3">
               <button onClick={logout} className="btn btn-ghost-danger btn-icon btn-sm rounded-circle border-0" title="Logout">
                 <LogOut size={18} />
               </button>
             </div>
          </div>

          <div className={clsx("collapse navbar-collapse", isNavOpen && "show")} id="navbar-menu">
            <div className="d-flex flex-column flex-md-row flex-fill align-items-stretch align-items-md-center pt-3 pt-md-0">
              <ul className="navbar-nav gap-lg-1">
                {navItems.map((item) => (
                  <li key={item.path} className={clsx(
                    'nav-item rounded px-1 transition-all',
                    location.pathname === item.path ? 'bg-primary bg-opacity-20 active' : 'hover-bg-white opacity-10'
                  )}>
                    <Link to={item.path} className="nav-link d-flex align-items-center py-2 px-3" onClick={() => setIsNavOpen(false)}>
                      <span className={clsx(
                        "nav-link-icon me-2",
                        location.pathname === item.path ? "text-primary" : "text-light opacity-50"
                      )}>
                        <item.icon size={18} />
                      </span>
                      <span className={clsx(
                        "nav-link-title fw-medium",
                        location.pathname === item.path ? "text-white fw-bold" : "text-light"
                      )}>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </header>

      <div className="page-wrapper min-vh-100 d-flex flex-column">
        {/* Decorative Background for Overlap Effect */}
        <div className="bg-dark pb-6 pb-lg-8 d-print-none shadow-sm" style={{ marginTop: '-1px' }}>
          <div className="container-xl pt-4 pt-lg-5">
             <div className="row align-items-center text-white mb-4">
                <div className="col">
                   <h2 className="page-title fw-bold text-white mb-1">
                     {navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
                   </h2>
                   <p className="opacity-75 small">Efficient label management for your day-to-day operations.</p>
                </div>
             </div>
          </div>
        </div>

        {/* Overlapping Content Container */}
        <main className="container-xl" style={{ marginTop: '-4.5rem' }}>
          <div className="card shadow-lg border-0 mb-5 overflow-hidden rounded-3">
            <div className={clsx(
                "card-body bg-white",
                location.pathname === '/app/designer' ? "p-0" : "p-3 p-md-5"
            )}>
              <Outlet />
            </div>
          </div>
        </main>

        <footer className="footer footer-transparent d-print-none py-4 mt-auto border-top bg-white bg-opacity-50">
          <div className="container-xl d-flex flex-column flex-md-row align-items-center justify-content-between text-muted small">
            <div>&copy; {new Date().getFullYear()} LabelFlow. All rights reserved.</div>
            <div className="mt-2 mt-md-0">Version 1.2.0-stable</div>
          </div>
        </footer>
      </div>

      <style>{`
        .hover-bg-white:hover { background: rgba(255,255,255,0.05); }
        .transition-all { transition: all 0.2s ease; }
        .page-title { letter-spacing: -0.015em; font-size: 1.75rem; }
        @media (max-width: 991px) {
           .navbar-collapse.show {
              background: #1d273b;
              margin: 1rem -1rem -1rem -1rem;
              padding: 1rem;
              border-radius: 0 0 1rem 1rem;
              box-shadow: 0 1rem 2rem rgba(0,0,0,0.2);
           }
        }
      `}</style>
    </div>
  );
}
