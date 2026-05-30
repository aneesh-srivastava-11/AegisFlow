import { NextResponse } from 'next/server';
import { analyzeCode } from '@/lib/gemini';
import { createOctokitWithPAT, getPRDiff } from '@/lib/github';
import { calculateRiskScore } from '@/lib/vulnerability-detector';
import { query } from '@/lib/neon';
import { checkRateLimit, getClientIP, rateLimitHeaders } from '@/lib/rate-limiter';

/**
 * Helper function to save analysis result to Neon PostgreSQL
 */
async function saveAnalysisResult(analysis, prInfo, source, customRepoId = null) {
  const risk = calculateRiskScore(analysis);
  const repositoryId = customRepoId || `${prInfo.owner}/${prInfo.repo}`;

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
      repositoryId,
      prInfo.pullNumber,
      prInfo.title || '',
      prInfo.author || '',
      prInfo.url || '',
      prInfo.headSha || '',
      JSON.stringify(analysis.critical || []),
      JSON.stringify(analysis.high || []),
      JSON.stringify(analysis.medium || []),
      JSON.stringify(analysis.low || []),
      analysis.summary,
      analysis.recommendation,
      analysis.language_detected,
      JSON.stringify(analysis.languages_found || []),
      analysis.scan_time_ms,
      analysis.files_analyzed || 0,
      risk.score,
      risk.level,
      risk.totalIssues,
      JSON.stringify(risk.breakdown || {}),
      'completed',
      source,
      analysis.error || null,
    ]
  );
}

/**
 * Manual Analysis Endpoint backed by Neon PostgreSQL
 * Analyze a GitHub PR URL on demand or raw code snippet
 * 
 * POST /api/analyze
 * Body: { prUrl: string, code: string, language: string }
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
        { error: 'Provide a valid "prUrl" (GitHub PR) or raw "code"' },
        { status: 400, headers }
      );
    }

    let response;
    if (code) {
      response = await analyzeSandboxCode(code, language || 'JavaScript', startTime);
    } else if (prUrl.includes('github.com')) {
      response = await analyzePR(prUrl, startTime);
    } else {
      return NextResponse.json(
        { error: 'Unsupported URL. Only GitHub PR URLs are supported.' },
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

  // Store manual sandbox run in Neon PostgreSQL
  try {
    await saveAnalysisResult(analysis, {
      owner: 'sandbox',
      repo: 'playground',
      pullNumber: 0,
      title: `Sandbox analysis of ${language} code`,
      author: 'sandbox-user',
      url: '',
    }, 'sandbox');
  } catch (dbError) {
    console.warn('[Analyze] Failed to store sandbox run in database:', dbError.message);
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

  // Store in database
  try {
    await saveAnalysisResult(analysis, {
      owner,
      repo,
      pullNumber,
      title: `Manual analysis of PR #${pullNumber}`,
      author: 'manual',
      url: prUrl,
    }, 'github');
  } catch (dbError) {
    console.warn('[Analyze] Failed to store in database:', dbError.message);
  }

  return NextResponse.json({
    analysis,
    risk,
    pr: { owner, repo, pullNumber, url: prUrl, source: 'github' },
    processingTimeMs: Date.now() - startTime,
  });
}
