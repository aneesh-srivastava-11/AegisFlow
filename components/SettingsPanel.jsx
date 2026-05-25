'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPanel() {
  const { token } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [gitlabOwner, setGitlabOwner] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');

  useEffect(() => {
    if (token) {
      fetch('/api/user/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.hasApiKey) {
          setHasApiKey(true);
          setMaskedKey(data.maskedKey);
        }
        if (data.githubOwner) setGithubOwner(data.githubOwner);
        if (data.gitlabOwner) setGitlabOwner(data.gitlabOwner);
      })
      .catch(err => console.error('Failed to fetch settings', err));
    }
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ geminiApiKey: apiKey, githubOwner, gitlabOwner })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save API key');

      setStatus({ type: 'success', message: 'Settings saved successfully. Your keys will be used for automated PR reviews.' });
      if (apiKey) {
        setHasApiKey(true);
        setMaskedKey(`...${apiKey.slice(-4)}`);
        setApiKey('');
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 600, marginTop: 24 }}>
      <h2 style={{ marginBottom: 16 }}>API Settings</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
        Configure your personal Gemini API Key and link your repository owner aliases. This key will be used to run security analyses on your repositories when pull requests are created.
      </p>

      {status.message && (
        <div style={{
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 24,
          background: status.type === 'success' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 69, 58, 0.1)',
          color: status.type === 'success' ? 'var(--success)' : 'var(--critical)',
          border: `1px solid ${status.type === 'success' ? 'var(--success)' : 'var(--critical)'}`
        }}>
          {status.message}
        </div>
      )}

      {hasApiKey && !apiKey && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>✅</span>
          <div>
            <div style={{ fontWeight: 600 }}>API Key Configured</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ending in {maskedKey}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
            Gemini API Key {hasApiKey && '(Enter a new key to update)'}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            required={!hasApiKey}
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontFamily: 'monospace'
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
            GitHub Owner (Username or Organization)
          </label>
          <input
            type="text"
            value={githubOwner}
            onChange={(e) => setGithubOwner(e.target.value)}
            placeholder="e.g. torvalds"
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
            GitLab Owner (Username or Group)
          </label>
          <input
            type="text"
            value={gitlabOwner}
            onChange={(e) => setGitlabOwner(e.target.value)}
            placeholder="e.g. gitlab-org"
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
