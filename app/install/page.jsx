'use client';
import { useState, useEffect } from 'react';
import InstallButton from '@/components/InstallButton';

export default function InstallPage() {
  const [success, setSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState('github');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) setSuccess(true);
  }, []);

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 800 }}>
      {success && (
        <div className="card fade-in" style={{ borderColor: 'var(--success)', marginBottom: 24, textAlign: 'center', padding: 32 }}>
          <span style={{ fontSize: '3rem' }}>🎉</span>
          <h2 style={{ marginTop: 12, color: 'var(--success)' }}>Installation Successful!</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Your repositories are now protected. Open a PR/MR to see it in action.</p>
          <a href="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }}>Go to Dashboard →</a>
        </div>
      )}

      <div className="section-title">
        <h1 style={{ fontSize: '2.5rem' }}>Install <span className="gradient">Code Review AI</span></h1>
        <p>Protect your repositories with AI-powered security reviews.</p>
      </div>

      {/* Provider Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button 
          className={`tab ${activeTab === 'github' ? 'active' : ''}`} 
          onClick={() => setActiveTab('github')}
        >
          GitHub (App Integration)
        </button>
        <button 
          className={`tab ${activeTab === 'gitlab' ? 'active' : ''}`} 
          onClick={() => setActiveTab('gitlab')}
        >
          GitLab (Webhook Integration)
        </button>
      </div>

      {activeTab === 'github' ? (
        <>
          {/* Step 1 */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>01</span>
              <div style={{ flex: 1 }}>
                <h3>Install the GitHub App</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0 16px', fontSize: '0.9rem' }}>
                  Click the button below to install on your GitHub account or organization.
                  Select which repositories you want to protect.
                </p>
                <InstallButton />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>02</span>
              <div style={{ flex: 1 }}>
                <h3>Open a Pull Request</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0', fontSize: '0.9rem' }}>
                  That&apos;s it! Open a PR on any protected repository and the AI will automatically review it.
                  Results appear as PR review comments within 10 seconds.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* GitLab Step 1 */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>01</span>
              <div style={{ flex: 1 }}>
                <h3>Configure Webhook in GitLab</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0', fontSize: '0.9rem' }}>
                  Navigate to your project in GitLab: <strong>Settings ➔ Webhooks</strong> and add a new webhook:
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: '0.85rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', width: '30%' }}>URL</td>
                      <td style={{ padding: '8px 0', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/gitlab/webhook` : 'https://your-app-url.vercel.app/api/gitlab/webhook'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Secret Token</td>
                      <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Your configured <code style={{ color: 'var(--accent-primary)' }}>GITLAB_WEBHOOK_SECRET</code></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Trigger Events</td>
                      <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Check <strong>Merge request events</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* GitLab Step 2 */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>02</span>
              <div style={{ flex: 1 }}>
                <h3>Configure GitLab API Token</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0', fontSize: '0.9rem' }}>
                  Ensure you set the <code style={{ color: 'var(--accent-primary)' }}>GITLAB_TOKEN</code> env variable on Vercel to a Personal Access Token with <code style={{ color: 'var(--accent-primary)' }}>api</code> scope so the AI can post comments on your Merge Requests.
                </p>
              </div>
            </div>
          </div>

          {/* GitLab Step 3 */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>03</span>
              <div style={{ flex: 1 }}>
                <h3>Open a Merge Request</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0', fontSize: '0.9rem' }}>
                  Open or update a Merge Request on GitLab. The AI agent will immediately catch the webhook, scan the changes, and post recommendations automatically.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
