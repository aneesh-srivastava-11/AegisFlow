'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function AdminPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [initStatus, setInitStatus] = useState('');
  const [initResult, setInitResult] = useState(null);
  const [error, setError] = useState('');

  // Fetch admin configs if authenticated
  const fetchConfig = async (userToken) => {
    try {
      const res = await fetch('/api/admin/config', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      } else {
        setError('Failed to load system configuration status.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (token) {
        fetchConfig(token);
      }
    }
  }, [user, token, loading, router]);

  const handleInitDatabase = async () => {
    setInitStatus('loading');
    setInitResult(null);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setInitStatus('success');
        setInitResult(data.seeded);
      } else {
        setInitStatus('error');
        setError(data.error || 'Failed to initialize database.');
      }
    } catch (err) {
      setInitStatus('error');
      setError(err.message);
    }
  };

  if (loading || (user && loadingConfig)) {
    return (
      <div className="loading-overlay" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        <span>Verifying Admin Credentials...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 850 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Admin Console</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure system resources and check runtime environment</p>
        </div>
        <div className="badge badge-success" style={{ padding: '8px 14px', borderRadius: 20 }}>
          🛡️ Authenticated as Admin
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24, alignItems: 'start' }}>
        {/* Environment Status */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h3 style={{ marginBottom: 20 }}>System Environment Status</h3>
          {config ? (
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                { name: 'MONGODB_URI', desc: 'Database connection' },
                { name: 'GEMINI_API_KEY', desc: 'Gemini AI services' },
                { name: 'GITHUB_APP_ID', desc: 'GitHub Integration ID' },
                { name: 'GITHUB_APP_PRIVATE_KEY', desc: 'Secure GitHub private certificate' },
                { name: 'WEBHOOK_SECRET', desc: 'Secure Webhook handshake signature' },
                { name: 'NEXT_PUBLIC_APP_URL', desc: 'Base application url' },
                { name: 'NEXT_PUBLIC_FIREBASE_API_KEY', desc: 'Firebase client API key' },
                { name: 'NEXT_PUBLIC_GITHUB_APP_SLUG', desc: 'GitHub App Slug (dynamic install link fallback if missing)' },
              ].map(item => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <code style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{item.name}</code>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</p>
                  </div>
                  <span>
                    {config[item.name] ? (
                      <span className="badge badge-success" style={{ fontWeight: 700 }}>Active</span>
                    ) : (
                      <span className="badge badge-critical" style={{ fontWeight: 700 }}>Missing</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Could not load configuration parameters status.</p>
          )}
        </motion.div>

        {/* Database Initialization & Setup Actions */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h3 style={{ marginBottom: 16 }}>Database & Seed Setup</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
            Initialize MongoDB indexes for search queries and pre-seed the database collections with static famous security breaches and common CVE regex configurations.
          </p>

          {error && (
            <div className="card" style={{ borderColor: 'var(--critical)', color: 'var(--critical)', padding: 12, marginBottom: 20, fontSize: '0.85rem' }}>
              ⚠️ Error: {error}
            </div>
          )}

          {initStatus === 'success' && initResult && (
            <div className="card" style={{ borderColor: 'var(--success)', color: 'var(--success)', padding: 16, marginBottom: 20, fontSize: '0.9rem', background: 'rgba(16, 185, 129, 0.05)' }}>
              <h4>✅ Database Seeding Complete</h4>
              <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: '0.85rem' }}>
                <li>Seeded breaches count: <strong>{initResult.breaches}</strong></li>
                <li>Seeded CVE patterns count: <strong>{initResult.patterns}</strong></li>
                <li>Index optimization applied successfully</li>
              </ul>
            </div>
          )}

          <button 
            onClick={handleInitDatabase} 
            className="btn btn-primary btn-lg" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}
            disabled={initStatus === 'loading'}
          >
            {initStatus === 'loading' ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18 }} />
                Initializing Database...
              </>
            ) : (
              '🗄️ Run Database Setup & Seeding'
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
