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
    <div className="boreal-app">
      <div className="boreal-sidebar"> {/* Adapting the brand panel to a sidebar look */}
        <div className="boreal-sidebar__inner">
          <Link to="/" className="boreal-brand">
            <span className="boreal-brand__mark">
              <Printer size={18} />
            </span>
            <strong>Canopy<small>digital arboretum</small></strong>
          </Link>

          <div className="boreal-sidebar__copy" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
            <p className="boreal-label">Welcome back</p>
            <h1>Return to the operational canopy.</h1>
            <p>Sign in to manage products, monitor queues, and keep label fulfillment moving with the same calm, layered workspace.</p>
          </div>

          <div className="boreal-card boreal-card--soft"> {/* Adapting summary to boreal-card */}
            <div className="boreal-card__content">
              <span>Orders, products, print flow</span>
              <strong>One focused workspace</strong>
            </div>
            <ArrowRight size={16} />
          </div>
        </div>
      </div>

      <div className="boreal-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="boreal-card" style={{ width: 'min(460px, 100%)' }}>
          <div className="boreal-card__header">
            <p className="boreal-label">Sign in</p>
            <h2>Access your workspace</h2>
            <p>Use your existing account credentials to continue into the app.</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="boreal-form">
            <label className="boreal-form-group">
              <span>Username</span>
              <div className="boreal-input-wrap">
                <UserRound size={16} className="boreal-material" />
                <input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </label>

            <label className="boreal-form-group">
              <span>Password</span>
              <div className="boreal-input-wrap">
                <LockKeyhole size={16} className="boreal-material" />
                <input
                  type="password"
                  placeholder="admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <button type="submit" className="boreal-button boreal-button--primary boreal-button--large boreal-form__submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="boreal-card__footer">
            Need an account? <Link to="/signup">Create one here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
  );
}
