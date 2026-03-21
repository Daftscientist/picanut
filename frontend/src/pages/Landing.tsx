import { Link } from 'react-router-dom';
import { Printer, Zap, Layout, Shield } from 'lucide-react';

export default function Landing() {
  return (
    <div className="page">
      <div className="page-wrapper">
        <header className="navbar navbar-expand-md navbar-light d-print-none">
          <div className="container-xl">
            <h1 className="navbar-brand navbar-brand-autodark d-none-hob">
              <Link to="/">
                <span className="ms-2">LabelFlow</span>
              </Link>
            </h1>
            <div className="navbar-nav flex-row order-md-last">
              <div className="nav-item">
                <Link to="/login" className="nav-link">Login</Link>
              </div>
              <div className="nav-item ms-2">
                <Link to="/signup" className="btn btn-primary">Sign up</Link>
              </div>
            </div>
          </div>
        </header>
        <div className="page-body">
          <div className="container-xl d-flex flex-column justify-content-center">
            <div className="empty">
              <div className="empty-img">
                <Printer size={128} className="text-primary" strokeWidth={1} />
              </div>
              <p className="empty-title">Modern Label Printing for Professionals</p>
              <p className="empty-subtitle text-muted">
                The fastest way to manage products, variants, and WooCommerce orders with direct-to-printer thermal label support.
              </p>
              <div className="empty-action">
                <Link to="/signup" className="btn btn-primary btn-lg">
                  Get Started
                </Link>
              </div>
            </div>

            <div className="row row-cards mt-4">
              <div className="col-md-4">
                <div className="card">
                  <div className="card-body text-center">
                    <div className="mb-3">
                      <Zap className="text-yellow" size={48} />
                    </div>
                    <h4>Lightning Fast</h4>
                    <p className="text-muted">Render and print labels in milliseconds. Zero wait time between orders.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card">
                  <div className="card-body text-center">
                    <div className="mb-3">
                      <Layout className="text-blue" size={48} />
                    </div>
                    <h4>WooCommerce Integrated</h4>
                    <p className="text-muted">Orders flow in automatically. Print entire batches with a single click.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card">
                  <div className="card-body text-center">
                    <div className="mb-3">
                      <Shield className="text-green" size={48} />
                    </div>
                    <h4>Reliable & Secure</h4>
                    <p className="text-muted">Built for the warehouse floor. RBAC and audit logs keep your team on track.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
