'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, signup, sendPasswordReset } = useAuth();
  
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


      </div>
    </div>
  );
}
