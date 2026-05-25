'use client';

import { useState } from 'react';
import InstallButton from '@/components/InstallButton';
import BreachShowcase from '@/components/BreachShowcase';
import breachData from '@/data/famous-breaches.json';

const prExamples = [
  {
    id: 'secret',
    tabName: 'Hardcoded Secret',
    file: 'app/services/auth.js',
    lineStart: 12,
    code: [
      { line: 11, type: 'normal', text: 'export async function authenticate(credentials) {' },
      { line: 12, type: 'removed', text: '  const token = "ghp_2L3uB9t7xJ9qK5pL2o0w91m2xS9v98r";' },
      { line: 12, type: 'added', text: '  const token = process.env.GITHUB_TOKEN;' },
      { line: 13, type: 'normal', text: '  return fetchUser(token, credentials);' },
      { line: 14, type: 'normal', text: '}' }
    ],
    explanation: 'Hardcoded credential detected. Storing static secrets in code makes them accessible to anyone with repository read access. Move this credential to your environment configuration.'
  },
  {
    id: 'sql',
    tabName: 'SQL Injection',
    file: 'lib/db.js',
    lineStart: 42,
    code: [
      { line: 41, type: 'normal', text: 'async function getUser(email) {' },
      { line: 42, type: 'removed', text: '  const query = "SELECT * FROM users WHERE email = \'" + email + "\'";' },
      { line: 42, type: 'added', text: '  const query = "SELECT * FROM users WHERE email = ?";' },
      { line: 43, type: 'normal', text: '  return db.execute(query, [email]);' },
      { line: 44, type: 'normal', text: '}' }
    ],
    explanation: 'Unsanitized user input is concatenated directly into a SQL query. This allows raw SQL commands to be executed against your database. Use parameterized queries or placeholders instead.'
  },
  {
    id: 'exec',
    tabName: 'Command Injection',
    file: 'server.js',
    lineStart: 78,
    code: [
      { line: 77, type: 'normal', text: 'app.get("/ping", (req, res) => {' },
      { line: 78, type: 'removed', text: '  exec("ping -c 1 " + req.query.host);' },
      { line: 78, type: 'added', text: '  execFile("/bin/ping", ["-c", "1", req.query.host]);' },
      { line: 79, type: 'normal', text: '  res.send("Pinging...");' },
      { line: 80, type: 'normal', text: '});' }
    ],
    explanation: 'Executing a shell command using string concatenation allows shell injection attacks. Attackers can append command delimiters to execute arbitrary system binaries. Use execFile with isolated argument arrays.'
  }
];

export default function HomePage() {
  const [activeExample, setActiveExample] = useState('secret');
  const selected = prExamples.find(ex => ex.id === activeExample) || prExamples[0];

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: '9999px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            <span style={{ fontSize: '0.775rem', fontWeight: 650, color: 'var(--text-secondary)' }}>Automated Pull Request Security Reviews</span>
          </div>

          <h1>Real-time security analysis for pull requests</h1>
          <p>
            AegisFlow integrates directly into your GitHub and GitLab pipelines. It scans every commit for logic flaws, static secrets, and vulnerabilities, and posts review comments inline.
          </p>

          <div className="hero-actions">
            <InstallButton />
          </div>

          {/* Interactive IDE / PR Mockup */}
          <div className="pr-mockup-container">
            
            {/* Sidebar File Explorer */}
            <div className="pr-mockup-sidebar">
              <div className="pr-mockup-sidebar-title">
                Files Changed
              </div>
              {prExamples.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setActiveExample(ex.id)}
                  style={{
                    background: activeExample === ex.id ? 'rgba(255, 255, 255, 0.04)' : 'none',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: activeExample === ex.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: activeExample === ex.id ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '0.825rem',
                    transition: 'var(--transition)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '10px', color: activeExample === ex.id ? 'var(--accent-primary)' : 'var(--text-muted)' }}>◆</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ex.file.split('/').pop()}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Code Editor Panel */}
            <div className="pr-mockup-content">
              
              {/* Window Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
                  <span style={{ marginLeft: 10, fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {selected.file}
                  </span>
                </div>
                <div className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                  Risk Detected
                </div>
              </div>

              {/* IDE Lines Diff */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflowX: 'auto',
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.8rem'
              }}>
                {selected.code.map((line, idx) => (
                  <div 
                    key={idx} 
                    className={line.type === 'added' ? 'code-line-added' : line.type === 'removed' ? 'code-line-removed' : ''}
                    style={{
                      display: 'flex',
                      padding: '6px 16px',
                      alignItems: 'center',
                      width: 'max-content',
                      minWidth: '100%'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', minWidth: 28, userSelect: 'none', fontSize: '0.75rem' }}>
                      {line.line}
                    </span>
                    <span style={{ 
                      color: line.type === 'added' ? '#30d158' : line.type === 'removed' ? '#ff453a' : 'var(--text-secondary)',
                      marginLeft: 12,
                      whiteSpace: 'pre'
                    }}>
                      {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                      {line.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* AegisFlow Feedback Card */}
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-card)',
                boxShadow: 'var(--shadow)',
                overflow: 'hidden'
              }}>
                {/* Comment Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '6px',
                    background: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    color: '#ffffff'
                  }}>
                    A
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>AegisFlow Bot</span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>analyzed line {selected.lineStart}</span>
                  </div>
                </div>

                {/* Comment Body */}
                <div style={{ padding: 16, fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-primary)', textAlign: 'left' }}>
                  {selected.explanation}
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Security Checks */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>Scope of security checks</h2>
            <p>
              AegisFlow scans code changes statically to verify safety patterns and warn developers before code reaches production.
            </p>
          </div>
          <div className="grid-2">
            <div className="card">
              <h3>Secret Detection</h3>
              <p style={{ marginTop: 8 }}>
                Identifies database tokens, private keys, API certificates, and client tokens exposed in configuration files or code files.
              </p>
            </div>
            <div className="card">
              <h3>Input Vulnerabilities</h3>
              <p style={{ marginTop: 8 }}>
                Flags patterns matching SQL injection, cross-site scripting, command execution, and local file inclusions.
              </p>
            </div>
            <div className="card">
              <h3>Dependency Auditing</h3>
              <p style={{ marginTop: 8 }}>
                Evaluates package lockfiles against vulnerability catalogs to identify packages with known vulnerabilities.
              </p>
            </div>
            <div className="card">
              <h3>Logic Flaws</h3>
              <p style={{ marginTop: 8 }}>
                Warns about execution bottlenecks, infinite loops, bypassed validation gates, and unhandled logic exceptions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why You Need Us (Historical Incidents) */}
      <section className="section" style={{ background: 'var(--bg-tertiary)', borderBottom: 'none' }}>
        <div className="container">
          <div className="section-title">
            <h2>Lessons from historical incidents</h2>
            <p>
              Review how major code security failures happened, and where automated review checks would have alerted developers.
            </p>
          </div>
          <BreachShowcase breaches={breachData} />
        </div>
      </section>
    </>
  );
}
