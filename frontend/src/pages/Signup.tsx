import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, LockKeyhole, Mail, Printer, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);

    try {
      const data = await apiClient.post<{ token: string }>('/auth/signup', {
        username,
        email,
        password,
        company_name: companyName,
      });
      await login(data.token);
      toast.success('Account created successfully');
      navigate('/app', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell auth-shell--signup">
      <div className="auth-shell__panel auth-shell__panel--brand">
        <Link to="/" className="brand-mark brand-mark--light">
          <span className="brand-mark__icon">
            <Printer size={18} />
          </span>
          <span>
            <strong>Canopy</strong>
            <small>grow inside the canopy</small>
          </span>
        </Link>

        <div className="auth-shell__copy">
          <p className="canopy-label canopy-label--inverse">Create workspace</p>
          <h1>Grow your ideas in our digital arboretum.</h1>
          <p>
            Set up your organization, invite your team, and start running product, order, and print operations from a
            single system.
          </p>
        </div>

        <div className="auth-benefits">
          {['Role-aware operations', 'Connected print agents', 'Misty, focused dashboards'].map((item) => (
            <div key={item} className="canopy-glass canopy-glass--dark auth-benefits__item">
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-shell__panel auth-shell__panel--form">
        <div className="auth-card canopy-panel">
          <div className="auth-card__header">
            <p className="canopy-label">Create account</p>
            <h2>Open a new canopy workspace</h2>
            <p>Set up your manager account and organization details to get started.</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="auth-form">
            <label className="canopy-field">
              <span>Username</span>
              <div className="canopy-input-wrap">
                <UserRound size={16} />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
            </label>

            <label className="canopy-field">
              <span>Email address</span>
              <div className="canopy-input-wrap">
                <Mail size={16} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </label>

            <label className="canopy-field">
              <span>Password</span>
              <div className="canopy-input-wrap">
                <LockKeyhole size={16} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </label>

            <label className="canopy-field">
              <span>Company name</span>
              <div className="canopy-input-wrap">
                <Building2 size={16} />
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
            </label>

            <button type="submit" className="canopy-button canopy-button--primary canopy-button--large auth-form__submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="auth-card__footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
