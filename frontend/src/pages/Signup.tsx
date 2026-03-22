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
    <div className="boreal-app">
      <div className="boreal-sidebar"> {/* Adapting the brand panel to a sidebar look */}
        <div className="boreal-sidebar__inner">
          <Link to="/" className="boreal-brand">
            <span className="boreal-brand__mark">
              <Printer size={18} />
            </span>
            <strong>Canopy<small>grow inside the canopy</small></strong>
          </Link>

          <div className="boreal-sidebar__copy" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
            <p className="boreal-label">Create workspace</p>
            <h1>Grow your ideas in our digital arboretum.</h1>
            <p>
              Set up your organization, invite your team, and start running product, order, and print operations from a
              single system.
            </p>
          </div>

          <div className="boreal-meta-list" style={{ marginTop: '2rem' }}> {/* Adapting auth-benefits */}
            <div>
              <strong>Role-aware operations</strong>
            </div>
            <div>
              <strong>Connected print agents</strong>
            </div>
            <div>
              <strong>Misty, focused dashboards</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="boreal-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="boreal-card" style={{ width: 'min(460px, 100%)' }}>
          <div className="boreal-card__header">
            <p className="boreal-label">Create account</p>
            <h2>Open a new canopy workspace</h2>
            <p>Set up your manager account and organization details to get started.</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="boreal-form">
            <label className="boreal-form-group">
              <span>Username</span>
              <div className="boreal-input-wrap">
                <UserRound size={16} className="boreal-material" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
            </label>

            <label className="boreal-form-group">
              <span>Email address</span>
              <div className="boreal-input-wrap">
                <Mail size={16} className="boreal-material" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </label>

            <label className="boreal-form-group">
              <span>Password</span>
              <div className="boreal-input-wrap">
                <LockKeyhole size={16} className="boreal-material" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </label>

            <label className="boreal-form-group">
              <span>Company name</span>
              <div className="boreal-input-wrap">
                <Building2 size={16} className="boreal-material" />
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
            </label>

            <button type="submit" className="boreal-button boreal-button--primary boreal-button--large boreal-form__submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="boreal-card__footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
  );
}
