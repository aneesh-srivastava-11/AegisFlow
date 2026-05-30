'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPanel() {
  const { token } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  
  // Feature 2: Enterprise Policy Engine State variables
  const [policySeverityThreshold, setPolicySeverityThreshold] = useState('CRITICAL');
  const [policyAutoApprove, setPolicyAutoApprove] = useState(true);
  const [policyIgnoredDirs, setPolicyIgnoredDirs] = useState('');

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
        
        // Load policy fields
        if (data.policySeverityThreshold) setPolicySeverityThreshold(data.policySeverityThreshold);
        if (data.policyAutoApprove !== undefined) setPolicyAutoApprove(data.policyAutoApprove);
        if (data.policyIgnoredDirs) setPolicyIgnoredDirs(data.policyIgnoredDirs);
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
        body: JSON.stringify({ 
          geminiApiKey: apiKey, 
          githubOwner,
          policySeverityThreshold,
          policyAutoApprove,
          policyIgnoredDirs
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      setStatus({ type: 'success', message: 'Settings saved successfully. Your keys and policy rules will be used for automated reviews.' });
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
    <div className="card" style={{ maxWidth: 650, marginTop: 24 }}>
      <h2 style={{ marginBottom: 16 }}>AegisFlow Settings</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
        Configure your personal Gemini API Key, GitHub owner details, and enterprise quality gate policies.
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
        {/* Gemini API Key */}
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

        {/* GitHub Owner */}
        <div style={{ marginBottom: 24 }}>
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

        {/* Enterprise Policy Section */}
        <h3 style={{ marginBottom: 16, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>🛡️ Quality Gate Policies</h3>

        {/* Severity Threshold */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
            Block Merge Severity Threshold
          </label>
          <select
            value={policySeverityThreshold}
            onChange={(e) => setPolicySeverityThreshold(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="CRITICAL">🔴 Block on Critical issues only</option>
            <option value="HIGH">🟠 Block on High or Critical issues</option>
            <option value="MEDIUM">🟡 Block on Medium, High, or Critical issues</option>
            <option value="LOW">🔵 Block on any detected issue</option>
          </select>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>
            Determines when a PR status check fails (request changes) based on issue severity.
          </p>
        </div>

        {/* Auto Approve Toggle */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="checkbox"
            id="autoApprove"
            checked={policyAutoApprove}
            onChange={(e) => setPolicyAutoApprove(e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer' }}
          />
          <label htmlFor="autoApprove" style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
            Auto-Approve Clean Pull Requests
          </label>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: -8, marginBottom: 16, paddingLeft: 32 }}>
          If enabled, the review status on GitHub is submitted as "APPROVE" when no issues above your threshold are detected.
        </p>

        {/* Ignored Directories */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
            Exclude Paths / Directories
          </label>
          <input
            type="text"
            value={policyIgnoredDirs}
            onChange={(e) => setPolicyIgnoredDirs(e.target.value)}
            placeholder="e.g. test/,mock/,scripts/"
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>
            Comma-separated list of paths to ignore when analyzing code differences.
          </p>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          style={{ width: '100%', marginTop: 8 }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
