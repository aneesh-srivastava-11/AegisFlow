'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const STATUS_COLORS = {
  completed: 'var(--success)',
  failed: 'var(--critical)',
  skipped: 'var(--medium)',
};

const SOURCE_ICONS = {
  github: '⬡',
  gitlab: '◈',
};

export default function WebhookLogsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [fetching, setFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');

  const fetchLogs = async (page = 1, source = filterSource, status = filterStatus, tok = token) => {
    if (!tok) return;
    setFetching(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (source) params.set('source', source);
      if (status) params.set('status', status);
      const res = await fetch(`/api/webhook-logs?${params}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) throw new Error('Failed to fetch webhook logs');
      setLogs(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/login');
      else if (token) fetchLogs(1, '', '', token);
    }
  }, [user, token, loading]);

  const handleFilter = () => {
    setCurrentPage(1);
    fetchLogs(1);
  };

  const handlePageChange = (p) => {
    setCurrentPage(p);
    fetchLogs(p);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Webhook Diagnostic Logs</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Real-time processing history for every GitHub PR and GitLab MR webhook event
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => fetchLogs(currentPage)}>
          ↻ Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Source</label>
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: '0.875rem' }}
          >
            <option value="">All Sources</option>
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
          </select>
        </div>
        <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: '0.875rem' }}
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleFilter} style={{ alignSelf: 'flex-end' }}>
          Apply Filters
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--critical)', color: 'var(--critical)', marginBottom: 20 }}>
          Error: {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            {logs.pagination.total} total events
          </h3>
          {fetching && <span className="spinner" style={{ width: 16, height: 16 }} />}
        </div>

        {logs.items.length === 0 && !fetching ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem' }}>📡</span>
            <p style={{ marginTop: 12 }}>No webhook events found. Install AegisFlow on a repository and open a pull request to start seeing events here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Source', 'Repository / PR', 'Status', 'Recommendation', 'Scan Time', 'Received At', 'Details'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.items.map((log, i) => (
                  <tr key={log._id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                      <span title={log.source} style={{ fontSize: '1.1rem' }}>{SOURCE_ICONS[log.source] || '◆'}</span>
                      <span style={{ marginLeft: 8, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{log.source}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 600 }}>
                      {log.repositoryId || '—'}
                      {log.pullNumber && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>#{log.pullNumber}</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        background: `${STATUS_COLORS[log.status] || '#888'}22`,
                        color: STATUS_COLORS[log.status] || 'var(--text-secondary)',
                        border: `1px solid ${STATUS_COLORS[log.status] || '#888'}44`,
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {log.recommendation || (log.reason ? `Skipped: ${log.reason}` : '—')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {log.scanTimeMs ? `${log.scanTimeMs}ms` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {log.receivedAt ? new Date(log.receivedAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                      {log.error ? (
                        <span title={log.error} style={{ color: 'var(--critical)', cursor: 'help', textDecoration: 'underline dotted' }}>
                          Error ⚠
                        </span>
                      ) : log.deliveryId ? (
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                          {log.deliveryId.slice(0, 8)}…
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {logs.pagination.pages > 1 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page <strong>{currentPage}</strong> of <strong>{logs.pagination.pages}</strong>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || fetching}>Previous</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === logs.pagination.pages || fetching}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
