import { neon } from '@neondatabase/serverless';

let sqlClient = null;

export function getSqlClient() {
  if (sqlClient) return sqlClient;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[Neon Database] DATABASE_URL environment variable is missing.');
    return null;
  }

  try {
    sqlClient = neon(connectionString);
    return sqlClient;
  } catch (error) {
    console.error('[Neon Database] Failed to initialize client:', error.message);
    return null;
  }
}

/**
 * Execute a query with parameters
 */
export async function query(queryString, params = []) {
  const client = getSqlClient();
  if (!client) {
    throw new Error('Database connection is not initialized. Please set DATABASE_URL.');
  }
  return client(queryString, params);
}

/**
 * Initialize all database tables and indexes for Neon Postgres
 */
export async function initializeDatabase() {
  console.log('[Neon Database] Initializing schema...');

  const tables = [
    // Users table with Enterprise Policy settings columns
    `CREATE TABLE IF NOT EXISTS users (
      uid VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255),
      gemini_api_key TEXT,
      github_owner VARCHAR(255),
      policy_severity_threshold VARCHAR(50) DEFAULT 'CRITICAL',
      policy_auto_approve BOOLEAN DEFAULT TRUE,
      policy_ignored_dirs TEXT DEFAULT '',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // Installation token cache table for GitHub App (Bug #1 Fix)
    `CREATE TABLE IF NOT EXISTS installation_token_cache (
      installation_id BIGINT PRIMARY KEY,
      token TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // Analyses table
    `CREATE TABLE IF NOT EXISTS analyses (
      id SERIAL PRIMARY KEY,
      repository_id VARCHAR(255),
      pull_request_number INTEGER,
      pull_request_title TEXT,
      pull_request_author VARCHAR(255),
      pull_request_url TEXT,
      pull_request_head_sha VARCHAR(255),
      results_critical JSONB DEFAULT '[]'::jsonb,
      results_high JSONB DEFAULT '[]'::jsonb,
      results_medium JSONB DEFAULT '[]'::jsonb,
      results_low JSONB DEFAULT '[]'::jsonb,
      results_summary TEXT,
      results_recommendation VARCHAR(50),
      metadata_language_detected VARCHAR(100),
      metadata_languages_found JSONB DEFAULT '[]'::jsonb,
      metadata_scan_time_ms INTEGER,
      metadata_files_analyzed INTEGER,
      risk_score DOUBLE PRECISION,
      risk_level VARCHAR(50),
      risk_total_issues INTEGER,
      risk_breakdown JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(50),
      source VARCHAR(50),
      error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // Repositories table
    `CREATE TABLE IF NOT EXISTS repositories (
      full_name VARCHAR(255) PRIMARY KEY,
      owner VARCHAR(255),
      repo VARCHAR(255),
      installation_id BIGINT,
      last_analyzed_at TIMESTAMP WITH TIME ZONE,
      stats_total_analyses INTEGER DEFAULT 0,
      stats_total_vulnerabilities INTEGER DEFAULT 0,
      stats_critical_count INTEGER DEFAULT 0,
      stats_high_count INTEGER DEFAULT 0,
      stats_medium_count INTEGER DEFAULT 0,
      stats_low_count INTEGER DEFAULT 0,
      stats_breaches_prevented INTEGER DEFAULT 0,
      stats_languages_analyzed JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // Vulnerabilities table
    `CREATE TABLE IF NOT EXISTS vulnerabilities (
      id SERIAL PRIMARY KEY,
      type VARCHAR(255),
      severity VARCHAR(50),
      language VARCHAR(100),
      repository_id VARCHAR(255),
      pull_number INTEGER,
      file TEXT,
      line VARCHAR(50),
      description TEXT,
      impact TEXT,
      fix TEXT,
      cve_reference VARCHAR(100),
      confidence DOUBLE PRECISION,
      detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // Breach Database table
    `CREATE TABLE IF NOT EXISTS breach_database (
      slug VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      category VARCHAR(255),
      year INTEGER,
      description TEXT,
      affected_users VARCHAR(255),
      financial_impact VARCHAR(255),
      severity VARCHAR(50),
      vulnerable_code TEXT,
      language VARCHAR(100),
      detection_points JSONB DEFAULT '[]'::jsonb,
      cve VARCHAR(100),
      lessons JSONB DEFAULT '[]'::jsonb,
      what_happened TEXT,
      our_detection TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // Webhook logs table
    `CREATE TABLE IF NOT EXISTS webhook_logs (
      id SERIAL PRIMARY KEY,
      delivery_id VARCHAR(255),
      event VARCHAR(100),
      source VARCHAR(50),
      status VARCHAR(50),
      repository_id VARCHAR(255),
      pull_number INTEGER,
      recommendation VARCHAR(50),
      scan_time_ms INTEGER,
      error TEXT,
      reason TEXT,
      received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP WITH TIME ZONE
    );`,

    // Rate limits table
    `CREATE TABLE IF NOT EXISTS rate_limits (
      id VARCHAR(255) PRIMARY KEY,
      timestamps JSONB DEFAULT '[]'::jsonb,
      allowed BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // CVE patterns table
    `CREATE TABLE IF NOT EXISTS cve_patterns (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      severity VARCHAR(50),
      description TEXT,
      languages JSONB DEFAULT '[]'::jsonb,
      examples JSONB DEFAULT '[]'::jsonb,
      cwe VARCHAR(100)
    );`
  ];

  const indexes = [
    `CREATE INDEX IF NOT EXISTS repo_date_idx ON analyses (repository_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS pr_repo_idx ON analyses (pull_request_number, repository_id);`,
    `CREATE INDEX IF NOT EXISTS status_idx ON analyses (status);`,
    `CREATE INDEX IF NOT EXISTS date_idx ON analyses (created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS type_severity_idx ON vulnerabilities (type, severity);`,
    `CREATE INDEX IF NOT EXISTS language_idx ON vulnerabilities (language);`,
    `CREATE INDEX IF NOT EXISTS vuln_repo_idx ON vulnerabilities (repository_id);`,
    `CREATE INDEX IF NOT EXISTS vuln_date_idx ON vulnerabilities (detected_at DESC);`,
    `CREATE INDEX IF NOT EXISTS breach_year_idx ON breach_database (year DESC);`,
    `CREATE INDEX IF NOT EXISTS wlog_date_idx ON webhook_logs (received_at DESC);`,
    `CREATE INDEX IF NOT EXISTS wlog_source_status_idx ON webhook_logs (source, status);`,
    `CREATE INDEX IF NOT EXISTS wlog_repo_idx ON webhook_logs (repository_id);`
  ];

  // Run queries sequentially
  for (const tableQuery of tables) {
    await query(tableQuery);
  }

  for (const indexQuery of indexes) {
    await query(indexQuery);
  }

  // Check and run migrations if columns are missing in active database
  try {
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS policy_severity_threshold VARCHAR(50) DEFAULT 'CRITICAL',
      ADD COLUMN IF NOT EXISTS policy_auto_approve BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS policy_ignored_dirs TEXT DEFAULT ''
    `);
  } catch (migError) {
    console.warn('[Neon Database] Migration warning (columns might already exist):', migError.message);
  }

  console.log('[Neon Database] Database schema and indexes initialized successfully');
}
