'use client';
import VulnerabilityCard from './VulnerabilityCard';

export default function AnalysisResults({ analysis, risk }) {
  if (!analysis) return null;
  const severities = ['critical', 'high', 'medium', 'low'];
  const total = severities.reduce((s, k) => s + (analysis[k]?.length || 0), 0);

  return (
    <div className="fade-in" style={{ display: 'grid', gap: 20 }}>
      {/* Summary Bar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>{analysis.summary || 'Analysis Complete'}</h3>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Language: {analysis.language_detected}</span>
            <span>Scan: {analysis.scan_time_ms}ms</span>
            {analysis.files_analyzed > 0 && <span>Files: {analysis.files_analyzed}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`badge badge-${analysis.recommendation === 'BLOCK' ? 'critical' : analysis.recommendation === 'REQUEST_CHANGES' ? 'high' : 'success'}`} style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
            {analysis.recommendation === 'BLOCK' ? '⛔ BLOCK' : analysis.recommendation === 'REQUEST_CHANGES' ? '⚠️ REQUEST CHANGES' : '✅ APPROVE'}
          </span>
        </div>
      </div>

      {/* Risk Score */}
      {risk && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <svg viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border-color)" strokeWidth="4" />
              <circle cx="32" cy="32" r="28" fill="none"
                stroke={risk.score >= 50 ? 'var(--critical)' : risk.score >= 25 ? 'var(--high)' : risk.score >= 10 ? 'var(--medium)' : 'var(--success)'}
                strokeWidth="4" strokeDasharray={`${risk.score * 1.76} 176`} strokeLinecap="round" />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>{risk.score}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>Risk Score: {risk.level}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {risk.breakdown.critical} critical • {risk.breakdown.high} high • {risk.breakdown.medium} medium • {risk.breakdown.low} low
            </div>
          </div>
        </div>
      )}

      {/* Vulnerabilities */}
      {total === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <span style={{ fontSize: '3rem' }}>🛡️</span>
          <h3 style={{ marginTop: 12, color: 'var(--success)' }}>No vulnerabilities detected</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>This code looks clean and secure!</p>
        </div>
      ) : (
        severities.map(sev =>
          (analysis[sev] || []).map((issue, i) => (
            <VulnerabilityCard key={`${sev}-${i}`} issue={issue} severity={sev.toUpperCase()} />
          ))
        )
      )}
    </div>
  );
}
