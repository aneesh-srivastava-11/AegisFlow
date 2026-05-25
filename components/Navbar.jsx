'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22 }}>
            <path d="M12 2L3 5v6c0 5.5 4.5 10 9 11 4.5-1 9-5.5 9-11V5l-9-3z" stroke="var(--accent-primary)" strokeWidth="2" strokeLinejoin="round" fill="none" />
            <path d="M8 11c1.5-1.5 3-2 4-2s2.5.5 4 2" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 14c1-1 2-1.5 3-1.5s2 .5 3 1.5" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          AegisFlow
        </Link>
        <div className="nav-links">
          <Link href="/" className={pathname === '/' ? 'active' : ''}>Home</Link>
          <Link href="/install" className={pathname === '/install' ? 'active' : ''}>Install App</Link>
          
          {loading ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>...</span>
          ) : user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''} style={{ fontSize: '0.85rem', fontWeight: 500 }}>Dashboard</Link>
              <Link href="/admin" className={`badge ${pathname === '/admin' ? 'active' : ''}`} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}>Admin</Link>
              <Link href="/admin/webhook-logs" className={`badge ${pathname === '/admin/webhook-logs' ? 'active' : ''}`} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}>Webhook Logs</Link>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email || 'Admin'}
              </span>
              <button onClick={logout} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
