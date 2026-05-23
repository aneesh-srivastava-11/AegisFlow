import InstallButton from '@/components/InstallButton';

const features = [
  { icon: '🤖', title: 'AI-Powered Analysis', desc: 'Gemini 2.0 Flash analyzes every PR for security vulnerabilities in seconds.' },
  { icon: '🌐', title: 'Any Language', desc: 'JavaScript, Python, Java, Go, Rust, PHP, Ruby, C++, and 20+ more languages.' },
  { icon: '⚡', title: 'Instant Feedback', desc: 'Results posted as GitHub PR review comments within 10 seconds.' },
  { icon: '🔒', title: 'Real CVE Detection', desc: 'Matches code patterns against known CVEs like Log4Shell and prototype pollution.' },
  { icon: '🛡️', title: 'Block Critical PRs', desc: 'Automatically requests changes when critical vulnerabilities are found.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Track vulnerabilities, languages, and security posture across all repos.' },
];

const stats = [
  { label: 'Vulnerability Types', value: '50+' },
  { label: 'Languages Supported', value: '25+' },
  { label: 'Avg Scan Time', value: '<5s' },
  { label: 'CVE Patterns', value: '100+' },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge">🚀 Powered by Gemini 2.0 Flash</div>
          <h1>
            AI Security Review<br />
            for Every <span className="gradient">Pull Request</span>
          </h1>
          <p>
            Automatically detect vulnerabilities, hardcoded secrets, and security issues
            across any programming language. Install once, protect every PR.
          </p>
          <div className="hero-actions">
            <InstallButton />
            <a href="/demo" className="btn btn-secondary btn-lg">Try Live Demo →</a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 0 60px' }}>
        <div className="container grid-4">
          {stats.map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>Everything You Need for Secure Code</h2>
            <p>One GitHub App installation protects your entire organization.</p>
          </div>
          <div className="grid-3">
            {features.map(f => (
              <div key={f.title} className="card">
                <span style={{ fontSize: '2rem', marginBottom: 12, display: 'block' }}>{f.icon}</span>
                <h3 style={{ fontSize: '1.15rem', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-title">
            <h2>How It Works</h2>
            <p>Three steps. Zero configuration. Instant protection.</p>
          </div>
          <div className="grid-3">
            {[
              { step: '01', title: 'Install', desc: 'Click Install GitHub App and select your repositories. Takes 30 seconds.' },
              { step: '02', title: 'Code', desc: 'Open pull requests as normal. Our AI watches for every change automatically.' },
              { step: '03', title: 'Secure', desc: 'Get instant security reviews with actionable fixes right on your PR.' },
            ].map(s => (
              <div key={s.step} className="card" style={{ textAlign: 'center', padding: 32 }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.step}</span>
                <h3 style={{ margin: '12px 0 8px' }}>{s.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 16 }}>Stop Shipping Vulnerabilities</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 32px' }}>
            Join teams using AI to catch security issues before they reach production.
          </p>
          <div className="hero-actions">
            <InstallButton />
            <a href="/demo" className="btn btn-secondary btn-lg">See It In Action →</a>
          </div>
        </div>
      </section>
    </>
  );
}
