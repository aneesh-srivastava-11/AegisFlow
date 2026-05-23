'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';
import DashboardSkeleton from '@/components/DashboardSkeleton';

// Theme Colors
const SEVERITY_COLORS = {
  CRITICAL: '#ff453a',
  HIGH: '#ff9f0a',
  MEDIUM: '#ffd60a',
  LOW: '#64d2ff',
};

const CHART_COLORS = ['#0071e3', '#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#bf5af2'];

function DashboardContent() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [analysesData, setAnalysesData] = useState({ items: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  const pollIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch both stats and initial paginated analyses
  const fetchData = async (showSkeleton = true) => {
    if (!token) return;
    if (showSkeleton) setLoading(true);
    try {
      const statsRes = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!statsRes.ok) throw new Error('Failed to fetch dashboard statistics');
      const statsData = await statsRes.json();
      setStats(statsData);

      await fetchAnalyses(currentPage, false, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyses = async (page, showLoadingIndicator = true, activeToken = token) => {
    if (!activeToken) return;
    if (showLoadingIndicator) setLoadingTable(true);
    try {
      const res = await fetch(`/api/analyses?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch analyses list');
      const data = await res.json();
      setAnalysesData(data);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTable(false);
    }
  };

  // Redirect to login if unauthenticated, otherwise fetch data
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (token) {
        fetchData(true);
      }
    }
  }, [user, token, authLoading]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= analysesData.pagination.pages) {
      fetchAnalyses(newPage, true);
    }
  };

  // Auto-polling setup
  useEffect(() => {
    if (autoRefresh) {
      setRefreshCountdown(30);
      
      countdownIntervalRef.current = setInterval(() => {
        setRefreshCountdown((prev) => {
          if (prev <= 1) {
            fetchData(false); // Silent refresh
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(countdownIntervalRef.current);
      clearInterval(pollIntervalRef.current);
    }

    return () => {
      clearInterval(countdownIntervalRef.current);
      clearInterval(pollIntervalRef.current);
    };
  }, [autoRefresh, currentPage, token]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="container" style={{ padding: '60px 0' }}><div className="card" style={{ borderColor: 'var(--critical)', color: 'var(--critical)' }}>Error: {error}</div></div>;
  if (!stats) return null;

  const { overview, vulnerabilities, topVulnerabilityTypes, languageDistribution, performance, dailyTrend } = stats;

  // Prepare Pie Chart Data
  const pieData = [
    { name: 'Critical', value: vulnerabilities.critical, color: SEVERITY_COLORS.CRITICAL },
    { name: 'High', value: vulnerabilities.high, color: SEVERITY_COLORS.HIGH },
    { name: 'Medium', value: vulnerabilities.medium, color: SEVERITY_COLORS.MEDIUM },
    { name: 'Low', value: vulnerabilities.low, color: SEVERITY_COLORS.LOW },
  ].filter(d => d.value > 0);

  const displayPieData = pieData.length > 0 ? pieData : [{ name: 'No Vulnerabilities', value: 1, color: '#10b981' }];

  const areaData = dailyTrend && dailyTrend.length > 0 ? dailyTrend : [
    { _id: new Date().toLocaleDateString(), count: 0, vulnerabilities: 0 }
  ];

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Security Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time code review metrics and telemetry</p>
        </div>
        
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              id="auto-refresh"
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="auto-refresh" style={{ cursor: 'pointer', userSelect: 'none' }}>
              Auto-refresh {autoRefresh && `(${refreshCountdown}s)`}
            </label>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchData(true)}>
            Refresh Now
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <span className="stat-label">PRs Analyzed</span>
          <span className="stat-value">{overview.totalAnalyses}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vulnerabilities Found</span>
          <span className="stat-value">{vulnerabilities.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Breaches Prevented</span>
          <span className="stat-value" style={{ color: 'var(--critical)' }}>
            {overview.breachesPrevented}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg Scan Time</span>
          <span className="stat-value">{performance.avgScanTimeMs}ms</span>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Severity Pie Chart */}
        <div className="card" style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: 16 }}>Vulnerability Severity Distribution</h3>
          <div style={{ flex: 1, width: '100%', minHeight: 220 }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {displayPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Scan Trend Area Chart */}
        <div className="card" style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: 16 }}>Analysis Activity (Last 7 Days)</h3>
          <div style={{ flex: 1, width: '100%', minHeight: 220 }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                  <XAxis dataKey="_id" stroke="var(--text-secondary)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <Area type="monotone" name="PR Scans" dataKey="count" stroke="var(--accent-primary)" fillOpacity={0.06} fill="var(--accent-primary)" />
                  <Area type="monotone" name="Vulns Found" dataKey="vulnerabilities" stroke="#ef4444" fillOpacity={0.06} fill="#ef4444" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Languages & Detailed Breakdown */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Top Vulnerability Types</h3>
          {topVulnerabilityTypes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No vulnerabilities detected yet</p>
          ) : (
            topVulnerabilityTypes.slice(0, 6).map((v, i) => (
              <div key={v.type} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 5 ? '1px solid var(--border-color)' : 'none' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{v.type}</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.avgConfidence}% conf</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v.count}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Languages Analyzed</h3>
          {languageDistribution.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No analysis data yet</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: 'start' }}>
              {languageDistribution.map(l => (
                <span key={l.language} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 6 }}>
                  {l.language} ({l.count})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paginated Recent Analyses */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Review Logs</h3>
          {loadingTable && <div className="spinner" style={{ width: 16, height: 16 }} />}
        </div>
        
        {analysesData.items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>
            No analyses logged. Install the app on GitHub to populate review history.
          </p>
        ) : (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Repository', 'PR / Source', 'Risk Level', 'Vulnerabilities', 'Language', 'Scan Time', 'Date'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysesData.items.map((a, i) => (
                    <tr 
                      key={a._id || i} 
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                      <td style={{ padding: '12px', fontSize: '0.875rem', fontWeight: 600 }}>{a.repositoryId}</td>
                      <td style={{ padding: '12px' }}>
                        {a.pullRequest?.url ? (
                          <a href={a.pullRequest.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 500 }}>
                            #{a.pullRequest.number} ({a.pullRequest.author})
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            On-Demand Demo
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${(a.risk?.level || 'CLEAN').toLowerCase()}`} style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                          {a.risk?.level || 'CLEAN'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.875rem', fontWeight: 700 }}>{a.risk?.totalIssues || 0}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.metadata?.languageDetected || '—'}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.metadata?.scanTimeMs || 0}ms</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {analysesData.pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing page <strong>{currentPage}</strong> of <strong>{analysesData.pagination.pages}</strong> ({analysesData.pagination.total} total runs)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loadingTable}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === analysesData.pagination.pages || loadingTable}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
