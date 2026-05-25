'use client';
import { useState, useEffect } from 'react';
import InstallButton from '@/components/InstallButton';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function InstallPage() {
  const { user, loading } = useAuth();
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('github');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) setSuccess(true);
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80, maxWidth: 500, textAlign: 'center' }}>
        <div className="card" style={{ padding: 40 }}>
          <h2 style={{ marginBottom: 16 }}>Authentication Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
            You must be logged in to configure code integrations and install AegisFlow on your repositories.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href="/login?redirect=/install" className="btn btn-primary btn-lg">
              Sign In to Continue
            </Link>
            <Link href="/" className="btn btn-secondary">
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 800 }}>
      {success && (
        <div className="card" style={{ borderColor: 'var(--success)', marginBottom: 24, padding: 24 }}>
          <h2 style={{ color: 'var(--success)' }}>Installation Successful</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Your repositories are now protected. Open a pull request or merge request to trigger a scan.</p>
          <a href="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }}>Go to Dashboard</a>
        </div>
      )}

      <div className="section-title">
        <h1 style={{ fontSize: '2.5rem' }}>Install AegisFlow</h1>
        <p>Integrate automated code reviews into your GitHub and GitLab repositories.</p>
      </div>

      {/* Provider Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button 
          className={`tab ${activeTab === 'github' ? 'active' : ''}`} 
          onClick={() => setActiveTab('github')}
        >
          GitHub App
        </button>
        <button 
          className={`tab ${activeTab === 'gitlab' ? 'active' : ''}`} 
          onClick={() => setActiveTab('gitlab')}
        >
          GitLab Webhook
        </button>
      </div>

      {activeTab === 'github' ? (
        <>
          {/* Step 1 */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)', minWidth: 24 }}>01</span>
              <div style={{ flex: 1 }}>
                <h3>Authorize the GitHub App</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0 16px', fontSize: '0.9rem' }}>
                  Click below to install AegisFlow on your personal GitHub account or organization and select target repositories.
                </p>
                <InstallButton />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)', minWidth: 24 }}>02</span>
              <div style={{ flex: 1 }}>
                <h3>Open a Pull Request</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0', fontSize: '0.9rem' }}>
                  AegisFlow will automatically trigger reviews when pull requests are created or updated. Detections will appear as inline comments.
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
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)', minWidth: 24 }}>01</span>
              <div style={{ flex: 1 }}>
                <h3>Configure Webhook in GitLab</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0', fontSize: '0.9rem' }}>
                  In your GitLab repository, navigate to <strong>Settings ➔ Webhooks</strong> and add a new webhook:
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: '0.85rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', width: '30%' }}>URL</td>
                      <td style={{ padding: '8px 0', color: 'var(--accent-primary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/gitlab/webhook` : 'https://your-app-url.vercel.app/api/gitlab/webhook'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Secret Token</td>
                      <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Your configured <code>GITLAB_WEBHOOK_SECRET</code></td>
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
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)', minWidth: 24 }}>02</span>
              <div style={{ flex: 1 }}>
                <h3>Configure GitLab API Token</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0', fontSize: '0.9rem' }}>
                  Provide the <code>GITLAB_TOKEN</code> environment variable containing a Personal Access Token with <code>api</code> write scopes to allow reviews to post.
                </p>
              </div>
            </div>
          </div>

          {/* GitLab Step 3 */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)', minWidth: 24 }}>03</span>
              <div style={{ flex: 1 }}>
                <h3>Create a Merge Request</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0', fontSize: '0.9rem' }}>
                  AegisFlow will capture the merge request payload, scan the diff, and write inline findings onto the MR thread.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* How it works in your workflow */}
      <div style={{ marginTop: 48, paddingTop: 40, borderTop: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: 12 }}>Workflow integration</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
          Setting up AegisFlow takes less than a minute and requires no ongoing configuration.
        </p>
        <div className="grid-3">
          <div className="card">
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-primary)', display: 'block', marginBottom: 12 }}>01</span>
            <h3>Install App</h3>
            <p style={{ marginTop: 8, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Link your GitHub organization or configure your GitLab webhook token to receive merge events.
            </p>
          </div>
          <div className="card">
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-primary)', display: 'block', marginBottom: 12 }}>02</span>
            <h3>Open Pull Request</h3>
            <p style={{ marginTop: 8, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Open a branch and commit changes. AegisFlow triggers scans automatically in response to webhook payloads.
            </p>
          </div>
          <div className="card">
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-primary)', display: 'block', marginBottom: 12 }}>03</span>
            <h3>Review Comments</h3>
            <p style={{ marginTop: 8, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Get inline feedback on specific lines of code. View recommended fixes directly on the pull request interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
