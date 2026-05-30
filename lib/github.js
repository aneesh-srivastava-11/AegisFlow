import { Octokit } from 'octokit';
import crypto from 'crypto';
import { query } from './neon.js';

/**
 * Create an authenticated Octokit instance for a GitHub App installation
 * @param {string} installationToken - Installation access token
 * @returns {Octokit}
 */
export function createOctokit(installationToken) {
  return new Octokit({
    auth: installationToken,
  });
}

/**
 * Create an Octokit instance using a personal access token (for manual analysis)
 * @returns {Octokit}
 */
export function createOctokitWithPAT() {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
}

/**
 * Verify GitHub webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Hub-Signature-256 header value
 * @returns {boolean}
 */
export function verifyWebhookSignature(payload, signature) {
  const secret = process.env.WEBHOOK_SECRET;

  // In production, ALWAYS require a webhook secret — fail closed
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[GitHub] WEBHOOK_SECRET not set in production — rejecting request');
      return false;
    }
    console.warn('[GitHub] WEBHOOK_SECRET not set — skipping verification in development');
    return true;
  }

  if (!signature) {
    console.warn('[GitHub] Missing X-Hub-Signature-256 header');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/**
 * Get the diff for a pull request
 * @param {Octokit} octokit 
 * @param {string} owner 
 * @param {string} repo 
 * @param {number} pullNumber 
 * @returns {Promise<{diff: string, files: string[]}>}
 */
export async function getPRDiff(octokit, owner, repo, pullNumber) {
  // Get the diff (GitHub returns plain text when format: 'diff')
  const { data: diffData } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: {
      format: 'diff',
    },
  });

  // Validate diff is actually a string (not a parsed JSON object)
  let diff;
  if (typeof diffData === 'string') {
    diff = diffData;
  } else if (diffData && typeof diffData === 'object') {
    // If Octokit parsed it as JSON (shouldn't happen with format:'diff'),
    // fall back to fetching the diff URL directly
    console.warn('[GitHub] Diff response was not a string, fetching via diff_url');
    const prInfo = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
    const diffResponse = await fetch(prInfo.data.diff_url, {
      headers: { Accept: 'application/vnd.github.v3.diff' },
    });
    diff = await diffResponse.text();
  } else {
    throw new Error(`Unexpected diff response type: ${typeof diffData}`);
  }

  // Get list of changed files
  const { data: filesData } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  const files = filesData.map(f => f.filename);

  return { diff, files };
}

/**
 * Post analysis results as a PR review
 * @param {Octokit} octokit 
 * @param {string} owner 
 * @param {string} repo 
 * @param {number} pullNumber 
 * @param {Object} analysis - Analysis results from Gemini
 * @param {Object} [prDescription] - Proposal summary and changelog from Gemini
 * @param {Object} [policy] - Enterprise Policy settings
 */
export async function postPRReview(octokit, owner, repo, pullNumber, analysis, prDescription = null, policy = null) {
  const criticalCount = (analysis.critical || []).length;
  const highCount = (analysis.high || []).length;
  const mediumCount = (analysis.medium || []).length;
  const lowCount = (analysis.low || []).length;
  const total = criticalCount + highCount + mediumCount + lowCount;

  // Build review body
  let body = `## 🤖 AI Security Review\n\n`;

  // Feature 1: Append Proposal Summary & Changelog if available
  if (prDescription && !analysis.error) {
    body += `### 📄 Change Summary & Auto-Changelog\n`;
    body += `**Title Proposal:** ${prDescription.title || 'N/A'}\n\n`;
    body += `**Overview:**\n${prDescription.description || 'N/A'}\n\n`;
    if (prDescription.changelog) {
      body += `**Changelog:**\n${prDescription.changelog}\n\n`;
    }
    body += `---\n\n`;
  }

  if (analysis.error) {
    body += `⚠️ **Analysis Failed:** AegisFlow encountered an error while scanning this PR.\n\n`;
    body += `**Error Details:** \`${analysis.error}\`\n\n`;
    body += `Please check your API key configuration in the AegisFlow Dashboard.`;
  } else if (total === 0) {
    body += `✅ **No security issues detected.** This PR looks clean!\n\n`;
    body += `- **Languages analyzed:** ${analysis.languages_found?.join(', ') || analysis.language_detected}\n`;
    body += `- **Scan time:** ${analysis.scan_time_ms}ms\n`;
    body += `- **Files analyzed:** ${analysis.files_analyzed || 'N/A'}\n`;
  } else {
    body += `### Summary\n`;
    body += `| Severity | Count |\n|----------|-------|\n`;
    if (criticalCount > 0) body += `| 🔴 Critical | ${criticalCount} |\n`;
    if (highCount > 0) body += `| 🟠 High | ${highCount} |\n`;
    if (mediumCount > 0) body += `| 🟡 Medium | ${mediumCount} |\n`;
    if (lowCount > 0) body += `| 🔵 Low | ${lowCount} |\n`;
    body += `\n`;

    // Critical issues
    if (criticalCount > 0) {
      body += `### 🔴 Critical Issues\n\n`;
      for (const issue of analysis.critical) {
        body += formatIssue(issue);
      }
    }

    // High issues
    if (highCount > 0) {
      body += `### 🟠 High Priority Issues\n\n`;
      for (const issue of analysis.high) {
        body += formatIssue(issue);
      }
    }

    // Medium issues
    if (mediumCount > 0) {
      body += `### 🟡 Medium Priority Issues\n\n`;
      for (const issue of analysis.medium) {
        body += formatIssue(issue);
      }
    }

    // Low issues
    if (lowCount > 0) {
      body += `### 🔵 Low Priority Issues\n\n`;
      for (const issue of analysis.low) {
        body += formatIssue(issue);
      }
    }

    body += `\n---\n`;
    body += `📊 **Scan Details**\n`;
    body += `- Languages: ${analysis.languages_found?.join(', ') || analysis.language_detected}\n`;
    body += `- Scan time: ${analysis.scan_time_ms}ms\n`;
    body += `- Recommendation: **${analysis.recommendation}**\n`;
  }

  body += `\n\n*Powered by [AegisFlow](${process.env.NEXT_PUBLIC_APP_URL || 'https://code-review-ai.vercel.app'}) • Gemini*`;

  // Feature 2: Enterprise Policy Gate logic
  let event = 'COMMENT';
  
  if (!analysis.error) {
    const threshold = policy?.policy_severity_threshold || 'CRITICAL';
    const autoApprove = policy?.policy_auto_approve !== undefined ? policy.policy_auto_approve : true;

    let shouldBlock = false;
    if (threshold === 'CRITICAL' && criticalCount > 0) shouldBlock = true;
    if (threshold === 'HIGH' && (criticalCount > 0 || highCount > 0)) shouldBlock = true;
    if (threshold === 'MEDIUM' && (criticalCount > 0 || highCount > 0 || mediumCount > 0)) shouldBlock = true;
    if (threshold === 'LOW' && total > 0) shouldBlock = true;

    if (shouldBlock) {
      event = 'REQUEST_CHANGES';
    } else if (autoApprove) {
      event = 'APPROVE';
    }
  }

  // Post the review
  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    body,
    event,
  });

  console.log(`[GitHub] Posted review on ${owner}/${repo}#${pullNumber} (${event})`);
}

/**
 * Format a single vulnerability issue for the PR comment.
 * Feature B: If the issue contains a fix_code_snippet, it is formatted as a
 * GitHub "Suggested Changes" block so developers can apply the fix with one click.
 * @param {Object} issue 
 * @returns {string}
 */
function formatIssue(issue) {
  let md = `<details>\n<summary><strong>${issue.type}</strong>`;
  if (issue.file && issue.file !== 'detected by pattern matching') {
    md += ` — \`${issue.file}\``;
    if (issue.line > 0) md += `:${issue.line}`;
  }
  md += ` (Confidence: ${Math.round((issue.confidence || 0) * 100)}%)</summary>\n\n`;
  md += `**Description:** ${issue.description}\n\n`;
  if (issue.code_snippet && issue.code_snippet !== 'See CVE details') {
    md += `**Vulnerable code:**\n\`\`\`\n${issue.code_snippet}\n\`\`\`\n\n`;
  }
  md += `**Impact:** ${issue.impact}\n\n`;

  // Feature B: Emit a GitHub "Suggested Changes" block for one-click auto-fix
  if (issue.fix_code_snippet) {
    md += `**Suggested Fix** *(click Apply suggestion to auto-apply)*:\n\`\`\`suggestion\n${issue.fix_code_snippet}\n\`\`\`\n\n`;
  } else {
    md += `**Fix:** ${issue.fix}\n\n`;
  }

  if (issue.cve_reference) {
    md += `**CVE Reference:** [${issue.cve_reference}](https://cve.mitre.org/cgi-bin/cvename.cgi?name=${issue.cve_reference})\n\n`;
  }
  md += `</details>\n\n`;
  return md;
}

/**
 * Generate an installation access token for a GitHub App
 * Uses JWT authentication and caches token in Neon DB to prevent rate limiting.
 * @param {number} installationId 
 * @returns {Promise<string>}
 */
export async function getInstallationToken(installationId) {
  try {
    // 1. Try to fetch from Neon DB token cache (valid if it expires in more than 2 minutes)
    const cached = await query(
      `SELECT token FROM installation_token_cache 
       WHERE installation_id = $1 AND expires_at > NOW() + INTERVAL '2 minutes'`,
      [BigInt(installationId)]
    );
    if (cached.length > 0) {
      console.log(`[GitHub App] Using cached installation token for ID: ${installationId}`);
      return cached[0].token;
    }
  } catch (cacheErr) {
    console.warn('[GitHub App] Token cache read warning:', cacheErr.message);
  }

  // 2. Cache miss/expired: Fetch from GitHub App access token API
  const jwt = generateJWT();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get installation token from GitHub: ${error}`);
  }

  const data = await response.json();
  const token = data.token;
  const expiresAt = new Date(data.expires_at);

  try {
    // 3. Cache the newly generated token in Neon DB
    await query(
      `INSERT INTO installation_token_cache (installation_id, token, expires_at, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (installation_id) DO UPDATE
       SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, updated_at = NOW()`,
      [BigInt(installationId), token, expiresAt]
    );
  } catch (cacheWriteErr) {
    console.warn('[GitHub App] Token cache write warning:', cacheWriteErr.message);
  }

  return token;
}

/**
 * Generate a JWT for GitHub App authentication
 * @returns {string}
 */
function generateJWT() {
  const appId = process.env.GITHUB_APP_ID;
  const rawKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !rawKey) {
    throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be configured for GitHub App authentication.');
  }

  const privateKey = rawKey.replace(/\\n/g, '\n');
  if (!privateKey.includes('-----BEGIN') || !privateKey.includes('-----END')) {
    throw new Error('GITHUB_APP_PRIVATE_KEY is invalid. Make sure it is in valid PEM format.');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,       // Issued at (60s in the past to account for clock drift)
    exp: now + 600,      // Expires in 10 minutes
    iss: appId,          // GitHub App ID
  };

  // Create JWT manually using crypto (no external JWT library needed)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createSign('RSA-SHA256')
    .update(`${header}.${body}`)
    .sign(privateKey, 'base64url');

  return `${header}.${body}.${signature}`;
}
