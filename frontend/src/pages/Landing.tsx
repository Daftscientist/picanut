import { Link } from 'react-router-dom';
import {
  Printer,
  Zap,
  Layout,
  Shield,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  BarChart3,
  PenTool
} from 'lucide-react';
import { clsx } from 'clsx';

export default function Landing() {
  return (
    <div className="page bg-white">
      {/* Header */}
      <header className="navbar navbar-expand-md navbar-light bg-white border-bottom sticky-top py-3">
        <div className="container-xl">
          <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
            <div className="bg-primary p-2 rounded text-white shadow-sm d-flex">
              <Printer size={20} />
            </div>
            <span className="fw-bold tracking-tight h3 mb-0">LabelFlow</span>
          </Link>
          <div className="navbar-nav flex-row order-md-last ms-auto align-items-center">
            <div className="nav-item d-none d-sm-block">
              <Link to="/login" className="nav-link fw-medium px-3">Log in</Link>
            </div>
            <div className="nav-item">
              <Link to="/signup" className="btn btn-primary rounded-pill px-4 shadow-sm fw-bold">
                Get Started <ArrowRight size={16} className="ms-2" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-6 py-lg-8 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
        <div className="container-xl">
          <div className="row align-items-center g-5">
            <div className="col-lg-6 text-center text-lg-start">
              <div className="badge bg-primary-lt px-3 py-2 rounded-pill mb-3 fw-bold animate-pulse">
                NEW: Label Designer 2.0 is here!
              </div>
              <h1 className="display-3 fw-black tracking-tight mb-4 text-dark">
                Modern Printing for <span className="text-primary">Modern Commerce.</span>
              </h1>
              <p className="lead text-muted mb-5 pe-lg-5">
                The fastest, most reliable way to manage products, variants, and WooCommerce orders with direct-to-printer thermal label support. Built for scale.
              </p>
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
                <Link to="/signup" className="btn btn-primary btn-lg rounded-pill px-5 py-3 shadow-lg fw-bold">
                  Start Free Trial
                </Link>
                <Link to="/pricing" className="btn btn-outline-dark btn-lg rounded-pill px-5 py-3 fw-bold">
                  View Pricing
                </Link>
              </div>
              <div className="mt-5 d-flex align-items-center justify-content-center justify-content-lg-start gap-4 text-muted small fw-medium">
                <div className="d-flex align-items-center gap-1"><CheckCircle2 size={16} className="text-green" /> No credit card required</div>
                <div className="d-flex align-items-center gap-1"><CheckCircle2 size={16} className="text-green" /> Cancel anytime</div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="position-relative">
                <div className="bg-primary opacity-10 position-absolute rounded-circle blur-3xl" style={{ width: '400px', height: '400px', top: '-50px', right: '-50px', zIndex: -1 }}></div>
                <div className="card shadow-2xl border-0 rounded-4 overflow-hidden transform hover-scale-105 transition-all">
                  <img
                    src="/assets/hero.png"
                    alt="Dashboard Preview"
                    className="img-fluid"
                    style={{ minHeight: '300px', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000';
                    }}
                  />
                  <div className="card-img-overlay d-flex align-items-end p-4 bg-gradient-to-t from-dark to-transparent">
                     <div className="text-white">
                        <div className="fw-bold mb-1">Intuitive Dashboard</div>
                        <div className="small opacity-75">Manage your entire warehouse from a single view.</div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-8 bg-light">
        <div className="container-xl">
          <div className="text-center mb-8">
            <h2 className="display-5 fw-bold mb-3">Everything you need to <span className="text-primary">scale.</span></h2>
            <p className="text-muted lead mx-auto" style={{ maxWidth: '600px' }}>
              We've built the most comprehensive toolset for high-volume printing operations.
            </p>
          </div>

          <div className="row g-4">
            {[
              {
                icon: Zap,
                title: 'Lightning Fast',
                color: 'text-yellow',
                desc: 'Render and print labels in milliseconds. Zero wait time between orders even at high volume.'
              },
              {
                icon: Layout,
                title: 'WooCommerce Sync',
                color: 'text-blue',
                desc: 'Orders flow in automatically. Print entire batches with a single click or automate the entire flow.'
              },
              {
                icon: Shield,
                title: 'Enterprise RBAC',
                color: 'text-green',
                desc: 'Granular permissions for Managers and Sub-users. Keep your operations secure and audited.'
              },
              {
                icon: PenTool,
                title: 'Label Designer',
                color: 'text-red',
                desc: 'Create custom labels in minutes with our intuitive drag-and-drop editor. No coding required.'
              },
              {
                icon: Smartphone,
                title: 'Mobile First',
                color: 'text-purple',
                desc: 'Manage your print queue and orders from any device. Perfect for warehouse floor staff.'
              },
              {
                icon: BarChart3,
                title: 'Usage Insights',
                color: 'text-azure',
                desc: 'Track your printing volume and efficiency with real-time analytics and reporting.'
              }
            ].map((f, i) => (
              <div key={i} className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm rounded-4 hover-shadow-lg transition-all p-2">
                  <div className="card-body">
                    <div className={clsx("mb-4 bg-opacity-10 p-3 rounded-4 d-inline-flex", f.color.replace('text', 'bg'))}>
                      <f.icon className={f.color} size={32} />
                    </div>
                    <h4 className="fw-bold mb-3">{f.title}</h4>
                    <p className="text-muted mb-0">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-primary text-white overflow-hidden position-relative">
        <div className="container-xl position-relative" style={{ zIndex: 1 }}>
          <div className="row text-center g-4">
            <div className="col-6 col-md-3">
              <div className="display-5 fw-black mb-1">50M+</div>
              <div className="text-white opacity-75 small text-uppercase fw-bold ls-wider">Labels Printed</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="display-5 fw-black mb-1">10k+</div>
              <div className="text-white opacity-75 small text-uppercase fw-bold ls-wider">Active Users</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="display-5 fw-black mb-1">99.9%</div>
              <div className="text-white opacity-75 small text-uppercase fw-bold ls-wider">Uptime</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="display-5 fw-black mb-1">24/7</div>
              <div className="text-white opacity-75 small text-uppercase fw-bold ls-wider">Expert Support</div>
            </div>
          </div>
        </div>
        <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 50%, white, transparent 25%), radial-gradient(circle at 80% 80%, white, transparent 25%)' }}></div>
      </section>

      {/* CTA Section */}
      <section className="py-8">
        <div className="container-xl">
          <div className="card bg-dark text-white rounded-5 border-0 shadow-2xl overflow-hidden p-4 p-lg-6">
            <div className="row align-items-center">
              <div className="col-lg-7 text-center text-lg-start mb-4 mb-lg-0">
                <h2 className="display-4 fw-bold mb-3">Ready to transform your <span className="text-primary">workflow?</span></h2>
                <p className="lead opacity-75 mb-0">Join thousands of businesses already scaling with LabelFlow.</p>
              </div>
              <div className="col-lg-5 text-center text-lg-end">
                <Link to="/signup" className="btn btn-primary btn-lg rounded-pill px-5 py-3 fw-bold shadow-lg transform hover-scale-105 transition-all">
                  Create Your Account Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-top bg-light">
        <div className="container-xl">
          <div className="row g-4">
            <div className="col-lg-4">
              <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none mb-4">
                <Printer size={24} className="text-primary" />
                <span className="fw-bold tracking-tight h3 mb-0 text-dark">LabelFlow</span>
              </Link>
              <p className="text-muted small pr-lg-5">
                The premier label printing solution for businesses of all sizes. Built with love in London.
              </p>
            </div>
            <div className="col-6 col-lg-2 ms-lg-auto">
              <h5 className="fw-bold mb-3">Product</h5>
              <ul className="list-unstyled space-y-2 small">
                <li><Link to="/pricing" className="text-muted text-decoration-none">Pricing</Link></li>
                <li><Link to="/app" className="text-muted text-decoration-none">Dashboard</Link></li>
              </ul>
            </div>
            <div className="col-6 col-lg-2">
              <h5 className="fw-bold mb-3">Company</h5>
              <ul className="list-unstyled space-y-2 small">
                <li><a href="#" className="text-muted text-decoration-none">About Us</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Careers</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-5 pt-5 border-top d-flex flex-column flex-md-row align-items-center justify-content-between text-muted small">
            <div>&copy; {new Date().getFullYear()} LabelFlow Inc. All rights reserved.</div>
            <div className="d-flex gap-4 mt-3 mt-md-0">
               <a href="#" className="text-muted text-decoration-none">Privacy Policy</a>
               <a href="#" className="text-muted text-decoration-none">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .fw-black { font-weight: 900; }
        .tracking-tight { letter-spacing: -0.025em; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .rounded-4 { border-radius: 1.5rem !important; }
        .rounded-5 { border-radius: 2.5rem !important; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .hover-scale-105:hover { transform: scale(1.05); }
        .ls-wider { letter-spacing: 0.1em; }
        .bg-gradient-to-b { background: linear-gradient(to bottom, var(--tw-gradient-stops)); }
        .from-blue-50 { --tw-gradient-from: #eff6ff; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(239, 246, 255, 0)); }
        .to-white { --tw-gradient-to: #fff; }
        .blur-3xl { filter: blur(64px); }
        .space-y-2 > * + * { margin-top: 0.5rem; }
      `}</style>
    </div>
  );
}
