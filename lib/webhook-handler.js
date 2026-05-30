/**
 * Webhook event handler backed by Neon PostgreSQL
 * Processes incoming GitHub webhook events
 */

import { analyzeCode, generatePRDescription } from './gemini.js';
import { createOctokit, getPRDiff, postPRReview, getInstallationToken } from './github.js';
import { formatForStorage, calculateRiskScore } from './vulnerability-detector.js';
import { query } from './neon.js';

/**
 * Filter diff content and file list based on user policy's ignored paths
 */
export function filterDiffAndFiles(diff, files, ignoredDirsStr) {
  if (!ignoredDirsStr) return { filteredDiff: diff, filteredFiles: files };

  const ignoredDirs = ignoredDirsStr
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(d => d.length > 0);

  if (ignoredDirs.length === 0) return { filteredDiff: diff, filteredFiles: files };

  // Filter files list
  const filteredFiles = files.filter(file => {
    const lowerFile = file.toLowerCase();
    return !ignoredDirs.some(dir => lowerFile.startsWith(dir) || lowerFile.includes('/' + dir));
  });

  // Filter diff content block-by-block
  const diffBlocks = diff.split(/^diff --git /m);
  const header = diffBlocks[0]; // Any initial header content
  
  const filteredBlocks = [];
  for (let i = 1; i < diffBlocks.length; i++) {
    const block = diffBlocks[i];
    const firstLine = block.split('\n')[0] || '';
    const isIgnored = ignoredDirs.some(dir => firstLine.toLowerCase().includes('a/' + dir) || firstLine.toLowerCase().includes('/' + dir));
    if (!isIgnored) {
      filteredBlocks.push('diff --git ' + block);
    }
  }

  const filteredDiff = header + filteredBlocks.join('');
  return { filteredDiff, filteredFiles };
}

/**
 * Fetch a custom user API key based on repository owner
 */
async function getUserApiKey(owner) {
  try {
    const users = await query(
      'SELECT gemini_api_key FROM users WHERE github_owner = $1 AND gemini_api_key IS NOT NULL AND gemini_api_key != \'\'',
      [owner]
    );
    return users.length > 0 ? users[0].gemini_api_key : null;
  } catch (error) {
    console.error('[Webhook] Failed to get user API key:', error);
    return null;
  }
}

/**
 * Helper to save analysis record (success or failure) to database
 */
async function saveAnalysisRecord(analysisDoc, isError = false) {
  const risk = isError ? { score: 0.0, level: 'LOW', totalIssues: 0, breakdown: {} } : calculateRiskScore(analysisDoc);
  
  await query(
    `INSERT INTO analyses (
      repository_id, pull_request_number, pull_request_title, pull_request_author, pull_request_url, pull_request_head_sha,
      results_critical, results_high, results_medium, results_low, results_summary, results_recommendation,
      metadata_language_detected, metadata_languages_found, metadata_scan_time_ms, metadata_files_analyzed,
      risk_score, risk_level, risk_total_issues, risk_breakdown,
      status, source, error, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13, $14::jsonb, $15, $16, $17, $18, $19, $20::jsonb, $21, $22, $23, NOW(), NOW())`,
    [
      analysisDoc.repositoryId,
      analysisDoc.pullRequest.number,
      analysisDoc.pullRequest.title || '',
      analysisDoc.pullRequest.author || '',
      analysisDoc.pullRequest.url || '',
      analysisDoc.pullRequest.headSha || '',
      JSON.stringify(analysisDoc.results?.critical || []),
      JSON.stringify(analysisDoc.results?.high || []),
      JSON.stringify(analysisDoc.results?.medium || []),
      JSON.stringify(analysisDoc.results?.low || []),
      analysisDoc.results?.summary || analysisDoc.summary || '',
      analysisDoc.results?.recommendation || analysisDoc.recommendation || 'APPROVE',
      analysisDoc.metadata?.languageDetected || analysisDoc.language_detected || 'Unknown',
      JSON.stringify(analysisDoc.metadata?.languagesFound || analysisDoc.languages_found || []),
      analysisDoc.metadata?.scanTimeMs || analysisDoc.scan_time_ms || 0,
      analysisDoc.metadata?.filesAnalyzed || analysisDoc.files_analyzed || 0,
      risk.score,
      risk.level,
      risk.totalIssues,
      JSON.stringify(risk.breakdown || {}),
      isError ? 'failed' : 'completed',
      analysisDoc.source,
      analysisDoc.error || null,
    ]
  );
}

/**
 * Process a pull_request webhook event (GitHub)
 * @param {Object} payload - GitHub webhook payload
 * @param {string} [deliveryId] - GitHub delivery ID for tracing
 * @returns {Promise<Object>} Processing result
 */
export async function handlePullRequestEvent(payload, deliveryId = null) {
  const { action, pull_request: pr, repository, installation } = payload;

  // Only process opened and synchronize events
  if (!['opened', 'synchronize', 'reopened'].includes(action)) {
    return { status: 'skipped', reason: `Action '${action}' not processed` };
  }

  const owner = repository.owner.login;
  const repo = repository.name;
  const pullNumber = pr.number;
  const receivedAt = new Date();

  console.log(`[Webhook] Processing PR #${pullNumber} on ${owner}/${repo} (${action})`);

  try {
    // Get installation token
    let octokit;
    if (installation?.id) {
      const token = await getInstallationToken(installation.id);
      octokit = createOctokit(token);
    } else {
      // Fallback to PAT for testing
      const { createOctokitWithPAT } = await import('./github.js');
      octokit = createOctokitWithPAT();
    }

    // Fetch PR diff
    const { diff, files } = await getPRDiff(octokit, owner, repo, pullNumber);

    if (!diff || diff.trim().length === 0) {
      console.log(`[Webhook] No diff found for PR #${pullNumber}`);
      await logWebhookEvent({
        deliveryId, event: 'pull_request', source: 'github',
        status: 'skipped', repositoryId: `${owner}/${repo}`,
        pullNumber, receivedAt, reason: 'No code changes found',
      });
      return { status: 'skipped', reason: 'No code changes found' };
    }

    // Fetch user key and quality gate policies (Feature 2)
    const userRows = await query(
      `SELECT gemini_api_key, policy_severity_threshold, policy_auto_approve, policy_ignored_dirs 
       FROM users WHERE github_owner = $1 LIMIT 1`,
      [owner]
    );
    const policy = userRows[0] || {
      gemini_api_key: null,
      policy_severity_threshold: 'CRITICAL',
      policy_auto_approve: true,
      policy_ignored_dirs: ''
    };

    const customApiKey = policy.gemini_api_key;

    // Apply directory exclusions if specified in policy (Feature 2)
    const { filteredDiff, filteredFiles } = filterDiffAndFiles(diff, files, policy.policy_ignored_dirs);

    if (!filteredDiff || filteredDiff.trim().length === 0) {
      console.log(`[Webhook] All changed files in PR #${pullNumber} were ignored by policy paths: ${policy.policy_ignored_dirs}`);
      await logWebhookEvent({
        deliveryId, event: 'pull_request', source: 'github',
        status: 'skipped', repositoryId: `${owner}/${repo}`,
        pullNumber, receivedAt, reason: 'All changes ignored by policy exclusions',
      });
      return { status: 'skipped', reason: 'All changes ignored by policy exclusions' };
    }

    // Analyze with Gemini
    const analysis = await analyzeCode(filteredDiff, filteredFiles, customApiKey);

    // Feature 1: PR Summary & Auto-Changelog Generation
    let prDescription = null;
    try {
      prDescription = await generatePRDescription(filteredDiff, filteredFiles, customApiKey);
    } catch (descErr) {
      console.warn('[Webhook] Failed to generate PR description:', descErr.message);
    }

    // Post review on GitHub (Passing analysis, description and policy)
    await postPRReview(octokit, owner, repo, pullNumber, analysis, prDescription, policy);

    // Store in Neon PostgreSQL
    const analysisDoc = formatForStorage(analysis, {
      owner,
      repo,
      pullNumber,
      title: pr.title,
      author: pr.user?.login || 'unknown',
      url: pr.html_url,
      headSha: pr.head?.sha || '',
    });
    analysisDoc.source = 'github';

    await saveAnalysisRecord(analysisDoc);

    // Update repository stats
    await updateRepositoryStats(owner, repo, analysis, installation?.id);

    // Store individual vulnerabilities
    await storeVulnerabilities(analysis, owner, repo, pullNumber);

    await logWebhookEvent({
      deliveryId, event: 'pull_request', source: 'github',
      status: 'completed', repositoryId: `${owner}/${repo}`,
      pullNumber, receivedAt, completedAt: new Date(),
      recommendation: analysis.recommendation,
      scanTimeMs: analysis.scan_time_ms,
    });

    console.log(`[Webhook] Completed analysis for ${owner}/${repo}#${pullNumber}`);

    return {
      status: 'completed',
      summary: analysis.summary,
      recommendation: analysis.recommendation,
      scanTimeMs: analysis.scan_time_ms,
    };
  } catch (error) {
    console.error(`[Webhook] Error processing ${owner}/${repo}#${pullNumber}:`, error);

    // Store failed analysis in Neon DB
    try {
      await saveAnalysisRecord({
        repositoryId: `${owner}/${repo}`,
        pullRequest: {
          number: pullNumber,
          title: pr.title,
          author: pr.user?.login || 'unknown',
          url: pr.html_url,
          headSha: pr.head?.sha || '',
        },
        error: error.message,
        source: 'github',
      }, true);
    } catch (dbError) {
      console.error('[Webhook] Failed to store error:', dbError);
    }

    // Log failed webhook
    await logWebhookEvent({
      deliveryId, event: 'pull_request', source: 'github',
      status: 'failed', repositoryId: `${owner}/${repo}`,
      pullNumber, receivedAt, completedAt: new Date(),
      error: error.message,
    }).catch(() => {});

    return {
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Update repository statistics
 * @param {string} owner 
 * @param {string} repo 
 * @param {Object} analysis 
 * @param {number} [installationId] 
 * @param {string} [customFullName]
 */
async function updateRepositoryStats(owner, repo, analysis, installationId = null, customFullName = null) {
  const risk = calculateRiskScore(analysis);
  const fullName = customFullName || `${owner}/${repo}`;
  const languagesAnalyzed = analysis.languages_found || [analysis.language_detected];

  await query(
    `INSERT INTO repositories (
      full_name, owner, repo, installation_id, last_analyzed_at,
      stats_total_analyses, stats_total_vulnerabilities, stats_critical_count,
      stats_high_count, stats_medium_count, stats_low_count, stats_breaches_prevented,
      stats_languages_analyzed, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, NOW(),
      1, $5, $6, $7, $8, $9, $10,
      $11::jsonb, NOW(), NOW()
    )
    ON CONFLICT (full_name) DO UPDATE
    SET owner = EXCLUDED.owner,
        repo = EXCLUDED.repo,
        installation_id = COALESCE(EXCLUDED.installation_id, repositories.installation_id),
        last_analyzed_at = EXCLUDED.last_analyzed_at,
        stats_total_analyses = repositories.stats_total_analyses + 1,
        stats_total_vulnerabilities = repositories.stats_total_vulnerabilities + EXCLUDED.stats_total_vulnerabilities,
        stats_critical_count = repositories.stats_critical_count + EXCLUDED.stats_critical_count,
        stats_high_count = repositories.stats_high_count + EXCLUDED.stats_high_count,
        stats_medium_count = repositories.stats_medium_count + EXCLUDED.stats_medium_count,
        stats_low_count = repositories.stats_low_count + EXCLUDED.stats_low_count,
        stats_breaches_prevented = repositories.stats_breaches_prevented + EXCLUDED.stats_breaches_prevented,
        stats_languages_analyzed = (
          SELECT jsonb_agg(distinct val)
          FROM (
            SELECT jsonb_array_elements_text(repositories.stats_languages_analyzed) AS val
            UNION
            SELECT jsonb_array_elements_text(EXCLUDED.stats_languages_analyzed) AS val
          ) t
        ),
        updated_at = NOW()`,
    [
      fullName,
      owner,
      repo,
      installationId ? BigInt(installationId) : null,
      risk.totalIssues,
      risk.breakdown.critical,
      risk.breakdown.high,
      risk.breakdown.medium,
      risk.breakdown.low,
      risk.breakdown.critical > 0 ? 1 : 0,
      JSON.stringify(languagesAnalyzed),
    ]
  );
}

/**
 * Store individual vulnerabilities for trending/analytics
 * @param {Object} analysis 
 * @param {string} owner 
 * @param {string} repo 
 * @param {number} pullNumber 
 * @param {string} [customRepoId]
 */
async function storeVulnerabilities(analysis, owner, repo, pullNumber, customRepoId = null) {
  const repositoryId = customRepoId || `${owner}/${repo}`;
  
  const allIssues = [
    ...(analysis.critical || []).map(v => ({ ...v, severity: 'CRITICAL' })),
    ...(analysis.high || []).map(v => ({ ...v, severity: 'HIGH' })),
    ...(analysis.medium || []).map(v => ({ ...v, severity: 'MEDIUM' })),
    ...(analysis.low || []).map(v => ({ ...v, severity: 'LOW' })),
  ];

  if (allIssues.length === 0) return;

  for (const issue of allIssues) {
    await query(
      `INSERT INTO vulnerabilities (
        type, severity, language, repository_id, pull_number, file, line,
        description, impact, fix, cve_reference, confidence, detected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        issue.type,
        issue.severity,
        analysis.language_detected,
        repositoryId,
        pullNumber,
        issue.file,
        String(issue.line || '0'),
        issue.description,
        issue.impact,
        issue.fix,
        issue.cve_reference || null,
        issue.confidence !== undefined ? parseFloat(issue.confidence) : 1.0,
      ]
    );
  }
}

/**
 * Log a webhook event to the webhook_logs Neon database table.
 * This powers the Webhook Diagnostic History Viewer in the admin panel.
 * @param {Object} logData - Structured log entry fields
 */
async function logWebhookEvent(logData) {
  try {
    await query(
      `INSERT INTO webhook_logs (
        delivery_id, event, source, status, repository_id, pull_number,
        recommendation, scan_time_ms, error, reason, received_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        logData.deliveryId || null,
        logData.event,
        logData.source,
        logData.status,
        logData.repositoryId || null,
        logData.pullNumber || null,
        logData.recommendation || null,
        logData.scanTimeMs || null,
        logData.error || null,
        logData.reason || null,
        logData.receivedAt || new Date(),
        logData.completedAt || null,
      ]
    );
  } catch (err) {
    console.warn('[Webhook] Failed to write webhook log entry:', err.message);
  }
}
