import { Octokit } from 'octokit';
import crypto from 'crypto';

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
 */
export async function postPRReview(octokit, owner, repo, pullNumber, analysis) {
  const criticalCount = (analysis.critical || []).length;
  const highCount = (analysis.high || []).length;
  const mediumCount = (analysis.medium || []).length;
  const lowCount = (analysis.low || []).length;
  const total = criticalCount + highCount + mediumCount + lowCount;

  // Build review body
  let body = `## 🤖 AI Security Review\n\n`;

  if (total === 0) {
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

  body += `\n\n*Powered by [Code Review AI](${process.env.NEXT_PUBLIC_APP_URL || 'https://code-review-ai.vercel.app'}) • Gemini 2.0 Flash*`;

  // Determine review event
  let event = 'COMMENT';
  if (analysis.recommendation === 'BLOCK' || criticalCount > 0) {
    event = 'REQUEST_CHANGES';
  } else if (analysis.recommendation === 'APPROVE' && total === 0) {
    event = 'APPROVE';
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
 * Format a single vulnerability issue for the PR comment
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
  md += `**Fix:** ${issue.fix}\n\n`;
  if (issue.cve_reference) {
    md += `**CVE Reference:** [${issue.cve_reference}](https://cve.mitre.org/cgi-bin/cvename.cgi?name=${issue.cve_reference})\n\n`;
  }
  md += `</details>\n\n`;
  return md;
}

/**
 * Generate an installation access token for a GitHub App
 * Uses JWT authentication
 * @param {number} installationId 
 * @returns {Promise<string>}
 */
export async function getInstallationToken(installationId) {
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
    throw new Error(`Failed to get installation token: ${error}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Generate a JWT for GitHub App authentication
 * @returns {string}
 */
function generateJWT() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = (process.env.GITHUB_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n');

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
