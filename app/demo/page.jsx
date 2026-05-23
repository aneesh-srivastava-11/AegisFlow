'use client';
import { useState } from 'react';
import AnalysisResults from '@/components/AnalysisResults';
import BreachShowcase from '@/components/BreachShowcase';
import breachData from '@/data/famous-breaches.json';

const sampleCodes = {
  JavaScript: `const express = require('express');
const app = express();
const API_KEY = 'sk-live-abc123def456ghi789';
const DB_PASSWORD = 'super_secret_password_123';

app.get('/user', (req, res) => {
  const userId = req.query.id;
  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
  db.query(query, (err, result) => {
    res.send(result);
  });
});

app.get('/file', (req, res) => {
  const filePath = path.join('/uploads', req.query.name);
  res.sendFile(filePath);
});

app.post('/run', (req, res) => {
  exec(\`echo \${req.body.command}\`, (err, stdout) => {
    res.json({ output: stdout });
  });
});`,
  Python: `import pickle
import os
import sqlite3
from flask import Flask, request

app = Flask(__name__)
SECRET_KEY = "ghp_abc123def456ghi789jkl012mno345pqr678"

@app.route('/query')
def query():
    user_input = request.args.get('search')
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM products WHERE name = '{user_input}'")
    return str(cursor.fetchall())

@app.route('/load')
def load_data():
    data = request.get_data()
    return str(pickle.loads(data))

@app.route('/run')
def run_cmd():
    cmd = request.args.get('cmd')
    return os.popen(cmd).read()`,
  Java: `import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import java.sql.*;

public class UserService {
    private static final Logger logger = LogManager.getLogger();
    private static final String DB_PASSWORD = "admin123!@#";

    public User getUser(String userId) {
        logger.info("Fetching user: " + userId);
        String query = "SELECT * FROM users WHERE id = '" + userId + "'";
        Statement stmt = connection.createStatement();
        ResultSet rs = stmt.executeQuery(query);
        return mapUser(rs);
    }

    public void processInput(String userInput) {
        Runtime.getRuntime().exec("cmd /c " + userInput);
        logger.error("Processing: {}", userInput);
    }
}`,
};

export default function DemoPage() {
  const [tab, setTab] = useState('analyze');
  const [code, setCode] = useState(sampleCodes.JavaScript);
  const [language, setLanguage] = useState('JavaScript');
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
      const body = tab === 'pr' ? { prUrl } : { code, language };
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const loadSample = (lang) => {
    setLanguage(lang);
    setCode(sampleCodes[lang] || sampleCodes.JavaScript);
  };

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="section-title">
        <h1 style={{ fontSize: '2.5rem' }}>Live <span className="gradient">Demo</span></h1>
        <p>Try our AI security analysis on real code or paste a GitHub PR URL.</p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${tab === 'analyze' ? 'active' : ''}`} onClick={() => setTab('analyze')}>Code Analysis</button>
        <button className={`tab ${tab === 'pr' ? 'active' : ''}`} onClick={() => setTab('pr')}>GitHub PR URL</button>
        <button className={`tab ${tab === 'breaches' ? 'active' : ''}`} onClick={() => setTab('breaches')}>Famous Breaches</button>
      </div>

      {tab === 'breaches' ? (
        <BreachShowcase breaches={breachData} />
      ) : (
        <form onSubmit={analyze} style={{ display: 'grid', gap: 16 }}>
          {tab === 'pr' ? (
            <input placeholder="https://github.com/owner/repo/pull/123" value={prUrl} onChange={e => setPrUrl(e.target.value)} required />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(sampleCodes).map(lang => (
                  <button key={lang} type="button" className={`btn btn-sm ${language === lang ? 'btn-primary' : 'btn-secondary'}`} onClick={() => loadSample(lang)}>
                    {lang}
                  </button>
                ))}
              </div>
              <textarea value={code} onChange={e => setCode(e.target.value)} rows={14} className="mono" style={{ fontSize: '0.85rem' }} required />
            </>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ justifySelf: 'start' }}>
            {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Analyzing...</> : '🔍 Analyze Code'}
          </button>

          {error && <div className="card" style={{ borderColor: 'var(--critical)', color: 'var(--critical)' }}>⚠️ {error}</div>}
        </form>
      )}

      {results && (
        <div style={{ marginTop: 32 }}>
          <AnalysisResults analysis={results.analysis} risk={results.risk} />
        </div>
      )}
    </div>
  );
}
