import { NextResponse } from 'next/server';
import { analyzeCode, analyzeRawCode } from '@/lib/gemini';
import { createOctokitWithPAT, getPRDiff, postPRReview } from '@/lib/github';
import { formatForStorage, calculateRiskScore } from '@/lib/vulnerability-detector';
import { getCollection } from '@/lib/mongodb';
import { checkRateLimit, getClientIP, rateLimitHeaders } from '@/lib/rate-limiter';

/**
 * Manual Analysis Endpoint
 * Analyze code or a GitHub PR URL on demand
 * 
 * POST /api/analyze
 * Body: { code: string, language: string } OR { prUrl: string }
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
    const { code, language, prUrl } = body;

    // Mode 1: Analyze a GitHub PR URL
    if (prUrl) {
      const response = await analyzePR(prUrl, startTime);
      // Copy headers to the response
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
      return response;
    }

    // Mode 2: Analyze raw code
    if (code) {
      const response = await analyzeRaw(code, language || 'JavaScript', startTime);
      // Copy headers to the response
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
      return response;
    }

    return NextResponse.json(
      { error: 'Provide either "code" with "language" or "prUrl"' },
      { status: 400, headers }
    );
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
    doc.source = 'manual';
    await analyses.insertOne(doc);
  } catch (dbError) {
    console.warn('[Analyze] Failed to store in MongoDB:', dbError.message);
  }

  return NextResponse.json({
    analysis,
    risk,
    pr: { owner, repo, pullNumber, url: prUrl },
    processingTimeMs: Date.now() - startTime,
  });
}

/**
 * Analyze raw code snippet
 */
async function analyzeRaw(code, language, startTime) {
  const analysis = await analyzeRawCode(code, language);
  const risk = calculateRiskScore(analysis);

  // Store in MongoDB
  try {
    const analyses = await getCollection('analyses');
    await analyses.insertOne({
      repositoryId: 'manual/analysis',
      pullRequest: {
        number: 0,
        title: `Manual ${language} code analysis`,
        author: 'manual',
        url: '',
      },
      results: {
        critical: analysis.critical || [],
        high: analysis.high || [],
        medium: analysis.medium || [],
        low: analysis.low || [],
        summary: analysis.summary,
        recommendation: analysis.recommendation,
      },
      metadata: {
        languageDetected: language,
        languagesFound: [language],
        scanTimeMs: analysis.scan_time_ms,
        codeLength: code.length,
      },
      risk,
      status: 'completed',
      source: 'demo',
      createdAt: new Date(),
    });
  } catch (dbError) {
    console.warn('[Analyze] Failed to store in MongoDB:', dbError.message);
  }

  return NextResponse.json({
    analysis,
    risk,
    processingTimeMs: Date.now() - startTime,
  });
}
