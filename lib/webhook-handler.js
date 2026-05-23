/**
 * Webhook event handler
 * Processes incoming GitHub and GitLab webhook events
 */

import { analyzeCode } from './gemini.js';
import { createOctokit, getPRDiff, postPRReview, getInstallationToken } from './github.js';
import { getMRDiff, postMRReview } from './gitlab.js';
import { formatForStorage, calculateRiskScore } from './vulnerability-detector.js';
import { getCollection } from './mongodb.js';

/**
 * Process a pull_request webhook event (GitHub)
 * @param {Object} payload - GitHub webhook payload
 * @returns {Promise<Object>} Processing result
 */
export async function handlePullRequestEvent(payload) {
  const { action, pull_request: pr, repository, installation } = payload;

  // Only process opened and synchronize events
  if (!['opened', 'synchronize', 'reopened'].includes(action)) {
    return { status: 'skipped', reason: `Action '${action}' not processed` };
  }

  const owner = repository.owner.login;
  const repo = repository.name;
  const pullNumber = pr.number;

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
      return { status: 'skipped', reason: 'No code changes found' };
    }

    // Analyze with Gemini
    const analysis = await analyzeCode(diff, files);

    // Post review on GitHub
    await postPRReview(octokit, owner, repo, pullNumber, analysis);

    // Store in MongoDB
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

    const analyses = await getCollection('analyses');
    await analyses.insertOne(analysisDoc);

    // Update repository stats
    await updateRepositoryStats(owner, repo, analysis, installation?.id);

    // Store individual vulnerabilities
    await storeVulnerabilities(analysis, owner, repo, pullNumber);

    console.log(`[Webhook] Completed analysis for ${owner}/${repo}#${pullNumber}`);

    return {
      status: 'completed',
      summary: analysis.summary,
      recommendation: analysis.recommendation,
      scanTimeMs: analysis.scan_time_ms,
    };
  } catch (error) {
    console.error(`[Webhook] Error processing ${owner}/${repo}#${pullNumber}:`, error);

    // Store failed analysis
    try {
      const analyses = await getCollection('analyses');
      await analyses.insertOne({
        repositoryId: `${owner}/${repo}`,
        pullRequest: {
          number: pullNumber,
          title: pr.title,
          author: pr.user?.login || 'unknown',
          url: pr.html_url,
        },
        status: 'failed',
        error: error.message,
        source: 'github',
        createdAt: new Date(),
      });
    } catch (dbError) {
      console.error('[Webhook] Failed to store error:', dbError);
    }

    return {
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Process a merge_request webhook event (GitLab)
 * @param {Object} payload - GitLab webhook payload
 * @returns {Promise<Object>} Processing result
 */
export async function handleMergeRequestEvent(payload) {
  const { object_attributes: mr, project } = payload;
  const action = mr.action;

  // GitLabMR actions to watch (open, update, reopen)
  if (!['open', 'update', 'reopen'].includes(action)) {
    return { status: 'skipped', reason: `Merge Request action '${action}' not processed` };
  }

  const projectId = project.id;
  const projectName = project.path_with_namespace; // e.g. "group/repo"
  const mrIid = mr.iid;

  console.log(`[Webhook] Processing GitLab MR #${mrIid} on project ${projectName} (${action})`);

  try {
    // Fetch MR diff
    const { diff, files } = await getMRDiff(projectId, mrIid);

    if (!diff || diff.trim().length === 0) {
      console.log(`[Webhook] No diff found for GitLab MR #${mrIid}`);
      return { status: 'skipped', reason: 'No code changes found' };
    }

    // Analyze with Gemini
    const analysis = await analyzeCode(diff, files);

    // Post review note on GitLab
    await postMRReview(projectId, mrIid, analysis);

    // Store in MongoDB
    const analysisDoc = formatForStorage(analysis, {
      owner: project.namespace,
      repo: project.name,
      pullNumber: mrIid,
      title: mr.title,
      author: payload.user?.username || 'unknown',
      url: mr.url,
      headSha: mr.last_commit?.id || '',
    });
    analysisDoc.source = 'gitlab';
    analysisDoc.repositoryId = projectName; // Override to GitLab path

    const analyses = await getCollection('analyses');
    await analyses.insertOne(analysisDoc);

    // Update repository stats
    await updateRepositoryStats(project.namespace, project.name, analysis, null, projectName);

    // Store individual vulnerabilities
    await storeVulnerabilities(analysis, project.namespace, project.name, mrIid, projectName);

    console.log(`[Webhook] Completed GitLab analysis for ${projectName}#${mrIid}`);

    return {
      status: 'completed',
      summary: analysis.summary,
      recommendation: analysis.recommendation,
      scanTimeMs: analysis.scan_time_ms,
    };
  } catch (error) {
    console.error(`[Webhook] Error processing GitLab MR ${projectName}#${mrIid}:`, error);

    // Store failed analysis
    try {
      const analyses = await getCollection('analyses');
      await analyses.insertOne({
        repositoryId: projectName,
        pullRequest: {
          number: mrIid,
          title: mr.title,
          author: payload.user?.username || 'unknown',
          url: mr.url,
        },
        status: 'failed',
        error: error.message,
        source: 'gitlab',
        createdAt: new Date(),
      });
    } catch (dbError) {
      console.error('[Webhook] Failed to store GitLab error:', dbError);
    }

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
  const repos = await getCollection('repositories');
  const risk = calculateRiskScore(analysis);
  const fullName = customFullName || `${owner}/${repo}`;

  await repos.updateOne(
    { fullName },
    {
      $set: {
        fullName,
        owner,
        repo,
        installationId: installationId || null,
        lastAnalyzedAt: new Date(),
        updatedAt: new Date(),
      },
      $inc: {
        'stats.totalAnalyses': 1,
        'stats.totalVulnerabilities': risk.totalIssues,
        'stats.criticalCount': risk.breakdown.critical,
        'stats.highCount': risk.breakdown.high,
        'stats.mediumCount': risk.breakdown.medium,
        'stats.lowCount': risk.breakdown.low,
        'stats.breachesPrevented': risk.breakdown.critical > 0 ? 1 : 0,
      },
      $addToSet: {
        'stats.languagesAnalyzed': { $each: analysis.languages_found || [analysis.language_detected] },
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
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
  const vulns = await getCollection('vulnerabilities');
  const repositoryId = customRepoId || `${owner}/${repo}`;
  
  const allIssues = [
    ...(analysis.critical || []).map(v => ({ ...v, severity: 'CRITICAL' })),
    ...(analysis.high || []).map(v => ({ ...v, severity: 'HIGH' })),
    ...(analysis.medium || []).map(v => ({ ...v, severity: 'MEDIUM' })),
    ...(analysis.low || []).map(v => ({ ...v, severity: 'LOW' })),
  ];

  if (allIssues.length === 0) return;

  const docs = allIssues.map(issue => ({
    type: issue.type,
    severity: issue.severity,
    language: analysis.language_detected,
    repositoryId,
    pullNumber,
    file: issue.file,
    line: issue.line,
    description: issue.description,
    impact: issue.impact,
    fix: issue.fix,
    cveReference: issue.cve_reference,
    confidence: issue.confidence,
    detectedAt: new Date(),
  }));

  await vulns.insertMany(docs);
}
