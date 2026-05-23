'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28 }}>
            <rect width="28" height="28" rx="6" fill="url(#g)" />
            <path d="M8 14l3 3 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="28" y2="28">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          Code Review AI
        </Link>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/demo">Live Demo</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/install">Install App</Link>
          
          {loading ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>...</span>
          ) : user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/admin" className="badge" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>Admin Panel</Link>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
