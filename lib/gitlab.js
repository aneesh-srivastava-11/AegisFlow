import crypto from 'crypto';

/**
 * Verify GitLab webhook token/signature
 * @param {string} tokenHeader - X-Gitlab-Token header value
 * @returns {boolean}
 */
export function verifyGitlabWebhookSignature(tokenHeader) {
  const secret = process.env.GITLAB_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[GitLab] GITLAB_WEBHOOK_SECRET not set in production — rejecting request');
      return false;
    }
    console.warn('[GitLab] GITLAB_WEBHOOK_SECRET not set — skipping verification in development');
    return true;
  }

  if (!tokenHeader) {
    console.warn('[GitLab] Missing X-Gitlab-Token header');
    return false;
  }

  // GitLab webhook uses plain token matching, but we do constant-time comparison for security
  try {
    return crypto.timingSafeEqual(
      Buffer.from(secret),
      Buffer.from(tokenHeader)
    );
  } catch {
    return false;
  }
}

/**
 * Get the diff for a GitLab Merge Request
 * @param {number|string} projectId 
 * @param {number} mrIid 
 * @returns {Promise<{diff: string, files: string[]}>}
 */
export async function getMRDiff(projectId, mrIid) {
  const token = process.env.GITLAB_TOKEN;
  const apiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';

  if (!token) {
    throw new Error('GITLAB_TOKEN is not set in environment variables');
  }

  const response = await fetch(`${apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/changes`, {
    headers: {
      'PRIVATE-TOKEN': token,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch GitLab MR changes: ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  const changes = data.changes || [];
  
  const files = changes.map(c => c.new_path || c.old_path);
  
  // Reconstruct unified diff format from files changes
  const diffParts = changes.map(c => {
    const oldPath = c.old_path;
    const newPath = c.new_path;
    return `--- a/${oldPath}\n+++ b/${newPath}\n${c.diff}`;
  });

  return {
    diff: diffParts.join('\n'),
    files,
  };
}

/**
 * Post analysis results as a GitLab Merge Request note (comment)
 * @param {number|string} projectId 
 * @param {number} mrIid 
 * @param {Object} analysis - Analysis results from Gemini
 */
export async function postMRReview(projectId, mrIid, analysis) {
  const token = process.env.GITLAB_TOKEN;
  const apiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';

  if (!token) {
    throw new Error('GITLAB_TOKEN is not set in environment variables');
  }

  const criticalCount = (analysis.critical || []).length;
  const highCount = (analysis.high || []).length;
  const mediumCount = (analysis.medium || []).length;
  const lowCount = (analysis.low || []).length;
  const total = criticalCount + highCount + mediumCount + lowCount;

  // Build review body
  let body = `## 🤖 AI Security Review\n\n`;

  if (total === 0) {
    body += `✅ **No security issues detected.** This MR looks clean!\n\n`;
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

  const response = await fetch(`${apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes`, {
    method: 'POST',
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to post GitLab review note: ${response.statusText} - ${errText}`);
  }

  console.log(`[GitLab] Posted review on project ${projectId} MR #${mrIid}`);
}

/**
 * Format a single vulnerability issue for the GitLab MR comment
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
