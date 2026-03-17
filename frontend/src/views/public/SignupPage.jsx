import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider.jsx'

export function SignupPage() {
  const { signup } = useAuth()
  const nav = useNavigate()

  const [companyName, setCompanyName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await signup({
        username: username.trim(),
        email: email.trim(),
        password,
        company_name: companyName.trim(),
      })
      nav('/app', { replace: true })
    } catch (e2) {
      setErr(e2?.message || 'Signup failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <h2>Create account</h2>
        </div>
        <form className="card card-md" onSubmit={onSubmit}>
          <div className="card-body">
            {err && <div className="alert alert-danger">{err}</div>}
            <div className="mb-3">
              <label className="form-label">Company name</label>
              <input className="form-control" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </div>
            <div className="mb-3">
              <label className="form-label">Email (optional)</label>
              <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <div className="form-hint">Minimum 8 characters.</div>
            </div>
            <div className="form-footer">
              <button className="btn btn-primary w-100" disabled={busy}>
                {busy ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </div>
        </form>
        <div className="text-center text-muted mt-3">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  )
}

