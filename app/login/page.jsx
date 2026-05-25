'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, signup, sendPasswordReset, loginWithGithub, loginWithGitlab } = useAuth();
  
  // 'signin' | 'signup' | 'forgot'
  const [mode, setMode] = useState('signin'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'signin') {
        await login(email, password);
        router.push('/dashboard');
      } else if (mode === 'signup') {
        await signup(email, password);
        router.push('/dashboard');
      } else if (mode === 'forgot') {
        await sendPasswordReset(email);
        setSuccess('A password reset link has been sent to your email.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await loginWithGithub();
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'GitHub Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitlabLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await loginWithGitlab();
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'GitLab Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setPassword('');
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '75vh', paddingTop: 40, paddingBottom: 60 }}>
      <div 
        className="card" 
        style={{ width: '450px', maxWidth: '100%', padding: 32 }}
      >
        {/* Segmented Control Selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: 4,
          marginBottom: 24
        }}>
          <button 
            type="button"
            onClick={() => switchMode('signin')}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: mode === 'signin' ? 'rgba(255, 255, 255, 0.05)' : 'none',
              border: 'none',
              borderRadius: 6,
              color: mode === 'signin' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => switchMode('signup')}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: mode === 'signup' ? 'rgba(255, 255, 255, 0.05)' : 'none',
              border: 'none',
              borderRadius: 6,
              color: mode === 'signup' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            Sign Up
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2>
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            {mode === 'signin' && 'Sign in to access your security console'}
            {mode === 'signup' && 'Register your details to start securing pipelines'}
            {mode === 'forgot' && 'Enter your email to receive a recovery link'}
          </p>
        </div>

        {error && (
          <div className="card" style={{ borderColor: 'var(--critical)', color: 'var(--critical)', padding: 12, marginBottom: 16, fontSize: '0.85rem' }}>
            Error: {error}
          </div>
        )}

        {success && (
          <div className="card" style={{ borderColor: 'var(--success)', color: 'var(--success)', padding: 12, marginBottom: 16, fontSize: '0.85rem', background: 'rgba(48, 209, 88, 0.05)' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleEmailAction} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
            <input 
              type="email" 
              placeholder="you@aegisflow.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
                {mode === 'signin' && (
                  <button 
                    type="button" 
                    onClick={() => switchMode('forgot')} 
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  style={{ paddingRight: 56 }}
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    userSelect: 'none'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18 }} />
            ) : (
              <>
                {mode === 'signin' && 'Sign In with Email'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
              </>
            )}
          </button>
        </form>

        {mode === 'forgot' && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button 
              type="button" 
              onClick={() => switchMode('signin')} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
            >
              Back to Sign In
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <button 
            onClick={handleGithubLogin} 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'currentColor' }}>
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            Continue with GitHub
          </button>

          <button 
            onClick={handleGitlabLogin} 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'currentColor' }}>
              <path d="M23.955 13.587l-1.342-4.135a.862.862 0 0 0-.315-.436.86.86 0 0 0-.53-.178h-.008a.86.86 0 0 0-.534.187.87.87 0 0 0-.309.435L19.54 13.6H4.46l-1.38-4.167a.885.885 0 0 0-.31-.433.864.864 0 0 0-.539-.187h-.007a.86.86 0 0 0-.53.181.868.868 0 0 0-.312.439L.044 13.587a.867.867 0 0 0 .093.705.864.864 0 0 0 .52.385l11.342 3.867 11.343-3.867a.868.868 0 0 0 .52-.385.868.868 0 0 0 .093-.705z"/>
            </svg>
            Continue with GitLab
          </button>
        </div>
      </div>
    </div>
  );
}
