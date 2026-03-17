import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="page-body">
      <div className="container-xl">
        <div className="row align-items-center">
          <div className="col-12 col-lg-7">
            <div className="mb-3">
              <span className="badge bg-primary">Label printing for teams</span>
            </div>
            <h2 className="mb-3">Print product labels fast, reliably, and securely.</h2>
            <p className="text-muted">
              LabelFlow helps your staff print the right label, at the right time, with role-aware controls and
              a queue designed for day-to-day operations.
            </p>
            <div className="d-flex gap-2">
              <Link to="/signup" className="btn btn-primary">Create account</Link>
              <Link to="/pricing" className="btn btn-outline-secondary">View pricing</Link>
            </div>
          </div>
          <div className="col-12 col-lg-5 mt-4 mt-lg-0">
            <div className="card">
              <div className="card-body">
                <div className="text-muted mb-2">What you get</div>
                <ul className="list-unstyled mb-0">
                  <li className="mb-2">- Pending WooCommerce orders queue</li>
                  <li className="mb-2">- Render + dispatch prints (agent-aware)</li>
                  <li className="mb-2">- Product + variant management</li>
                  <li className="mb-2">- Platform admin controls (plans + orgs)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

