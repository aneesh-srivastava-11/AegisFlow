'use client';
import { useState } from 'react';
import CodeDiffViewer from './CodeDiffViewer';

export default function BreachShowcase({ breaches }) {
  const [active, setActive] = useState(0);
  if (!breaches || breaches.length === 0) return null;
  const b = breaches[active];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Tabs */}
      <div className="tabs">
        {breaches.map((br, i) => (
          <button key={br.slug} className={`tab ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>
            {br.name.length > 25 ? br.name.slice(0, 22) + '...' : br.name}
          </button>
        ))}
      </div>

      {/* Active Breach */}
      <div className="card fade-in" key={b.slug}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3>{b.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{b.category} • {b.year}</p>
          </div>
          <span className={`badge badge-${b.severity === 'CRITICAL' ? 'critical' : 'high'}`}>{b.severity}</span>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{b.description}</p>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <span className="stat-label">Users Affected</span>
            <span className="stat-value" style={{ fontSize: '1.5rem' }}>{b.affected_users}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Financial Impact</span>
            <span className="stat-value" style={{ fontSize: '1.5rem' }}>{b.financial_impact}</span>
          </div>
        </div>

        <h4 style={{ marginBottom: 8 }}>Vulnerable Code</h4>
        <CodeDiffViewer code={b.vulnerable_code} language={b.language} />

        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 8, color: 'var(--success)' }}>What AegisFlow detects</h4>
          <div style={{ display: 'grid', gap: 6 }}>
            {b.detection_points.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--critical)' }}>•</span> {point}
              </div>
            ))}
          </div>
        </div>
        {b.cve && b.cve !== 'N/A - Supply chain attack' && b.cve !== 'N/A - Misconfiguration pattern' && (
          <p style={{ marginTop: 12, fontSize: '0.85rem' }}>
            <strong>CVE:</strong>{' '}
            <a href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${b.cve}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>{b.cve}</a>
          </p>
        )}
      </div>
    </div>
  );
}
