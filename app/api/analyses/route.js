import { NextResponse } from 'next/server';
import { query } from '@/lib/neon';
import { checkRateLimit, getClientIP, rateLimitHeaders } from '@/lib/rate-limiter';
import { verifyServerSession } from '@/lib/auth-middleware';

function mapRowToAnalysis(row) {
  return {
    _id: row.id,
    repositoryId: row.repository_id,
    pullRequest: {
      number: row.pull_request_number,
      title: row.pull_request_title,
      author: row.pull_request_author,
      url: row.pull_request_url,
    },
    results: {
      summary: row.results_summary,
      recommendation: row.results_recommendation,
    },
    metadata: {
      languageDetected: row.metadata_language_detected,
      scanTimeMs: row.metadata_scan_time_ms,
    },
    risk: {
      score: row.risk_score,
      level: row.risk_level,
      totalIssues: row.risk_total_issues,
    },
    createdAt: row.created_at,
  };
}

/**
 * Paginated Analyses List Endpoint backed by Neon PostgreSQL
 * GET /api/analyses?page=1&limit=10
 */
export async function GET(request) {
  const ip = getClientIP(request);
  const limitRate = await checkRateLimit(ip, 60);
  const headers = rateLimitHeaders(limitRate);

  if (!limitRate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in 1 minute.' },
      { status: 429, headers }
    );
  }

  // Authenticate session via Firebase OR ANALYZE_AUTH_TOKEN fallback
  const session = await verifyServerSession(request);
  if (!session) {
    const authToken = process.env.ANALYZE_AUTH_TOKEN;
    const authHeader = request.headers.get('Authorization');
    if (!authToken || !authHeader || authHeader !== `Bearer ${authToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized. Valid Firebase session or API token required.' },
        { status: 401, headers }
      );
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    const [itemsRes, totalRes] = await Promise.all([
      query(`
        SELECT id, repository_id, pull_request_number, pull_request_title, pull_request_author, pull_request_url,
               results_summary, results_recommendation, risk_score, risk_level, risk_total_issues,
               metadata_language_detected, metadata_scan_time_ms, created_at
        FROM analyses
        WHERE status = 'completed'
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      query("SELECT COUNT(*) AS count FROM analyses WHERE status = 'completed'")
    ]);

    const total = parseInt(totalRes[0].count, 10);
    const items = itemsRes.map(mapRowToAnalysis);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { headers });
  } catch (error) {
    console.error('[Analyses API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers });
  }
}
