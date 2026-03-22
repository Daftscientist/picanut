import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Printer, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiClient.post<{ token: string }>('/auth/login', { username, password });
      await login(data.token);
      toast.success('Login successful');
      const from = location.state?.from?.pathname || '/app';
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-shell__panel auth-shell__panel--brand">
        <Link to="/" className="brand-mark brand-mark--light">
          <span className="brand-mark__icon">
            <Printer size={18} />
          </span>
          <span>
            <strong>Canopy</strong>
            <small>digital arboretum</small>
          </span>
        </Link>

        <div className="auth-shell__copy">
          <p className="canopy-label canopy-label--inverse">Welcome back</p>
          <h1>Return to the operational canopy.</h1>
          <p>
            Sign in to manage products, monitor queues, and keep label fulfillment moving with the same calm, layered
            workspace.
          </p>
        </div>

        <div className="auth-shell__summary canopy-glass canopy-glass--dark">
          <div>
            <span>Orders, products, print flow</span>
            <strong>One focused workspace</strong>
          </div>
          <ArrowRight size={16} />
        </div>
      </div>

      <div className="auth-shell__panel auth-shell__panel--form">
        <div className="auth-card canopy-panel">
          <div className="auth-card__header">
            <p className="canopy-label">Sign in</p>
            <h2>Access your workspace</h2>
            <p>Use your existing account credentials to continue into the app.</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="auth-form">
            <label className="canopy-field">
              <span>Username</span>
              <div className="canopy-input-wrap">
                <UserRound size={16} />
                <input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </label>

            <label className="canopy-field">
              <span>Password</span>
              <div className="canopy-input-wrap">
                <LockKeyhole size={16} />
                <input
                  type="password"
                  placeholder="admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <button type="submit" className="canopy-button canopy-button--primary canopy-button--large auth-form__submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="auth-card__footer">
            Need an account? <Link to="/signup">Create one here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
