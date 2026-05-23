'use client';
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="card" style={{ maxWidth: 500, margin: '0 auto', borderColor: 'var(--critical)', padding: 32 }}>
            <span style={{ fontSize: '3rem' }}>⚠️</span>
            <h2 style={{ marginTop: 16, color: 'var(--critical)' }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '0.9rem' }}>
              An unexpected error occurred while rendering this page:
            </p>
            <div className="code-block" style={{ marginTop: 16, textAlign: 'left' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'var(--critical)' }}>
                {this.state.error?.message || String(this.state.error)}
              </pre>
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 24 }}
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
