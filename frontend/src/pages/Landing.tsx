import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Compass, Mail, Lock, User, KeyRound } from 'lucide-react';

export const Landing: React.FC = () => {
  const { login, register, error, clearError } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleTabChange = (loginTab: boolean) => {
    setIsLoginTab(loginTab);
    clearError();
    setSuccessMsg('');
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    setSuccessMsg('');

    try {
      if (isLoginTab) {
        await login({ email, password });
      } else {
        await register({ name, email, password });
        setSuccessMsg('Registration successful! Please login to continue.');
        setIsLoginTab(true);
        setPassword('');
      }
    } catch (err: any) {
      // Error handled by useAuth state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Compass size={18} strokeWidth={2.5} />
            </div>
            <span>CareerPath</span>
          </div>
          <p className="auth-subtitle">AI-Driven Career Guidance & Skill Mapping System</p>
        </div>

        <div className="auth-tabs">
          <div 
            className={`auth-tab ${isLoginTab ? 'active' : ''}`}
            onClick={() => handleTabChange(true)}
          >
            Sign In
          </div>
          <div 
            className={`auth-tab ${!isLoginTab ? 'active' : ''}`}
            onClick={() => handleTabChange(false)}
          >
            Create Account
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            {error.message || 'Authentication failed. Please try again.'}
          </div>
        )}

        {successMsg && (
          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLoginTab && (
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  id="reg-name"
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '45px', width: '100%' }}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input
                id="auth-email"
                type="email"
                className="form-control"
                style={{ paddingLeft: '45px', width: '100%' }}
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input
                id="auth-password"
                type="password"
                className="form-control"
                style={{ paddingLeft: '45px', width: '100%' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : isLoginTab ? 'Sign In' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <KeyRound size={12} />
            <span>Secure Authentication Interceptors</span>
          </div>
        </div>
      </div>
    </div>
  );
};
