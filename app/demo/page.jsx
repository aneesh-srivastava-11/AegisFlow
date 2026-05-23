'use client';
import { useState } from 'react';
import AnalysisResults from '@/components/AnalysisResults';

export default function DemoPage() {
  const [prUrl, setPrUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const analyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 800 }}>
      <div className="section-title">
        <h1 style={{ fontSize: '2.5rem' }}>Live Demo</h1>
        <p>Paste a GitHub Pull Request URL or GitLab Merge Request URL to trigger a security and code review scan.</p>
      </div>

      <div className="card">
        <form onSubmit={analyze} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Pull Request or Merge Request URL
            </label>
            <input 
              placeholder="e.g. https://github.com/owner/repo/pull/123 or https://gitlab.com/owner/repo/-/merge_requests/1" 
              value={prUrl} 
              onChange={e => setPrUrl(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ justifySelf: 'start' }}>
            {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Analyzing...</> : 'Analyze Pull / Merge Request'}
          </button>

          {error && <div className="card" style={{ borderColor: 'var(--critical)', color: 'var(--critical)', marginTop: 8 }}>Error: {error}</div>}
        </form>
      </div>

      {results && (
        <div style={{ marginTop: 32 }}>
          <AnalysisResults analysis={results.analysis} risk={results.risk} />
        </div>
      )}
    </div>
  );
}
