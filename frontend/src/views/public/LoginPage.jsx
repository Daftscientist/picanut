import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider.jsx'

export function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await login(username.trim(), password)
      const dest = res?.is_platform_admin ? '/admin' : (loc.state?.from || '/app')
      nav(dest, { replace: true })
    } catch (e2) {
      setErr(e2?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <h2>Login</h2>
        </div>
        <form className="card card-md" onSubmit={onSubmit}>
          <div className="card-body">
            {err && <div className="alert alert-danger">{err}</div>}
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="form-footer">
              <button className="btn btn-primary w-100" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </div>
        </form>
        <div className="text-center text-muted mt-3">
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  )
}

