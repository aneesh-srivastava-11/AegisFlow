'use client';

export default function DashboardSkeleton() {
  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60, opacity: 0.6 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ height: 32, width: 250, background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 16, width: 350, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
      </div>

      {/* Grid 4 */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card" style={{ height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ height: 14, width: '60%', background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 32, width: '40%', background: 'var(--bg-tertiary)', borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* Grid 2 */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ height: 260 }}>
          <div style={{ height: 20, width: '40%', background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 20 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ height: 12, width: 50, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
              <div style={{ flex: 1, height: 8, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
              <div style={{ height: 12, width: 20, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <div className="card" style={{ height: 260 }}>
          <div style={{ height: 20, width: '50%', background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 20 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ height: 14, width: '60%', background: 'var(--bg-tertiary)', borderRadius: 4 }} />
              <div style={{ height: 14, width: '15%', background: 'var(--bg-tertiary)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ height: 300 }}>
        <div style={{ height: 20, width: '30%', background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 20 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ height: 24, width: '100%', background: 'var(--bg-tertiary)', borderRadius: 4 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 40, width: '100%', background: 'var(--bg-tertiary)', borderRadius: 4 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
