import { NextResponse } from 'next/server';
import { analyzeCode } from '@/lib/gemini';
import { createOctokitWithPAT, getPRDiff } from '@/lib/github';
import { getMRDiff } from '@/lib/gitlab';
import { formatForStorage, calculateRiskScore } from '@/lib/vulnerability-detector';
import { getCollection } from '@/lib/mongodb';
import { checkRateLimit, getClientIP, rateLimitHeaders } from '@/lib/rate-limiter';

/**
 * Manual Analysis Endpoint
 * Analyze a GitHub PR or GitLab MR URL on demand
 * 
 * POST /api/analyze
 * Body: { prUrl: string }
 */
export async function POST(request) {
  const startTime = Date.now();
  const ip = getClientIP(request);

  // Apply rate limiting: 10 requests per minute
  const limit = await checkRateLimit(ip, 10);
  const headers = rateLimitHeaders(limit);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in 1 minute.' },
      { status: 429, headers }
    );
  }

  // Optional Token Auth (if ANALYZE_AUTH_TOKEN is defined in env)
  const authToken = process.env.ANALYZE_AUTH_TOKEN;
  if (authToken) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${authToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing Authorization token.' },
        { status: 401, headers }
      );
    }
  }

  try {
    const body = await request.json();
    const { prUrl, code, language } = body;

    if (!prUrl && !code) {
      return NextResponse.json(
        { error: 'Provide a valid "prUrl" (GitHub PR or GitLab MR) or raw "code"' },
        { status: 400, headers }
      );
    }

    let response;
    if (code) {
      response = await analyzeSandboxCode(code, language || 'JavaScript', startTime);
    } else if (prUrl.includes('github.com')) {
      response = await analyzePR(prUrl, startTime);
    } else if (prUrl.includes('gitlab.com')) {
      response = await analyzeMR(prUrl, startTime);
    } else {
      return NextResponse.json(
        { error: 'Unsupported URL. Only GitHub PR and GitLab MR URLs are supported.' },
        { status: 400, headers }
      );
    }

    // Copy headers to the response
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    return response;
  } catch (error) {
    console.error('[Analyze] Error:', error);
    return NextResponse.json(
      {
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500, headers }
    );
  }
}

/**
 * Feature D: Analyze raw code snippet from Sandbox Code Editor
 */
async function analyzeSandboxCode(code, language, startTime) {
  const { analyzeRawCode } = await import('@/lib/gemini');
  const analysis = await analyzeRawCode(code, language);
  const risk = calculateRiskScore(analysis);

  // Store manual sandbox run in MongoDB
  try {
    const analyses = await getCollection('analyses');
    const doc = formatForStorage(analysis, {
      owner: 'sandbox',
      repo: 'playground',
      pullNumber: 0,
      title: `Sandbox analysis of ${language} code`,
      author: 'sandbox-user',
      url: '',
    });
    doc.source = 'sandbox';
    await analyses.insertOne(doc);
  } catch (dbError) {
    console.warn('[Analyze] Failed to store sandbox run in MongoDB:', dbError.message);
  }

  return NextResponse.json({
    analysis,
    risk,
    pr: { owner: 'sandbox', repo: 'playground', pullNumber: 0, url: '', source: 'sandbox' },
    processingTimeMs: Date.now() - startTime,
  });
}


/**
 * Analyze a GitHub PR by URL
 */
async function analyzePR(prUrl, startTime) {
  // Parse PR URL: https://github.com/owner/repo/pull/123
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    return NextResponse.json(
      { error: 'Invalid GitHub PR URL. Format: https://github.com/owner/repo/pull/123' },
      { status: 400 }
    );
  }

  const [, owner, repo, pullNumberStr] = match;
  const pullNumber = parseInt(pullNumberStr, 10);

  // Create Octokit instance (using PAT for manual analysis)
  const octokit = createOctokitWithPAT();

  // Fetch PR diff
  const { diff, files } = await getPRDiff(octokit, owner, repo, pullNumber);

  if (!diff || diff.trim().length === 0) {
    return NextResponse.json({
      analysis: {
        critical: [], high: [], medium: [], low: [],
        summary: 'No code changes found in this PR',
        recommendation: 'APPROVE',
        scan_time_ms: Date.now() - startTime,
      },
      processingTimeMs: Date.now() - startTime,
    });
  }

  // Analyze with Gemini
  const analysis = await analyzeCode(diff, files);
  const risk = calculateRiskScore(analysis);

  // Store in MongoDB
  try {
    const analyses = await getCollection('analyses');
    const doc = formatForStorage(analysis, {
      owner,
      repo,
      pullNumber,
      title: `Manual analysis of PR #${pullNumber}`,
      author: 'manual',
      url: prUrl,
    });
    doc.source = 'github';
    await analyses.insertOne(doc);
  } catch (dbError) {
    console.warn('[Analyze] Failed to store in MongoDB:', dbError.message);
  }

  return NextResponse.json({
    analysis,
    risk,
    pr: { owner, repo, pullNumber, url: prUrl, source: 'github' },
    processingTimeMs: Date.now() - startTime,
  });
}

/**
 * Analyze a GitLab MR by URL
 */
async function analyzeMR(mrUrl, startTime) {
  // Parse MR URL: https://gitlab.com/group/subgroup/project/-/merge_requests/123
  const match = mrUrl.match(/gitlab\.com\/([^/]+(?:\/[^/]+)*)\/-\/merge_requests\/(\d+)/);
  if (!match) {
    return NextResponse.json(
      { error: 'Invalid GitLab MR URL. Format: https://gitlab.com/owner/repo/-/merge_requests/123' },
      { status: 400 }
    );
  }

  const [, projectPath, mrIidStr] = match;
  const mrIid = parseInt(mrIidStr, 10);

  // Fetch GitLab MR diff
  const { diff, files } = await getMRDiff(projectPath, mrIid);

  if (!diff || diff.trim().length === 0) {
    return NextResponse.json({
      analysis: {
        critical: [], high: [], medium: [], low: [],
        summary: 'No code changes found in this MR',
        recommendation: 'APPROVE',
        scan_time_ms: Date.now() - startTime,
      },
      processingTimeMs: Date.now() - startTime,
    });
  }

  // Analyze with Gemini
  const analysis = await analyzeCode(diff, files);
  const risk = calculateRiskScore(analysis);

  // Store in MongoDB
  try {
    const analyses = await getCollection('analyses');
    const doc = formatForStorage(analysis, {
      owner: projectPath.split('/')[0],
      repo: projectPath.split('/').slice(1).join('/'),
      pullNumber: mrIid,
      title: `Manual analysis of MR #${mrIid}`,
      author: 'manual',
      url: mrUrl,
    });
    doc.source = 'gitlab';
    doc.repositoryId = projectPath;
    await analyses.insertOne(doc);
  } catch (dbError) {
    console.warn('[Analyze] Failed to store in MongoDB:', dbError.message);
  }

  return NextResponse.json({
    analysis,
    risk,
    pr: { owner: projectPath.split('/')[0], repo: projectPath.split('/').slice(1).join('/'), pullNumber: mrIid, url: mrUrl, source: 'gitlab' },
    processingTimeMs: Date.now() - startTime,
  });
}
