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
      breakdown: typeof row.risk_breakdown === 'string' ? JSON.parse(row.risk_breakdown) : row.risk_breakdown,
    },
    createdAt: row.created_at,
  };
}

/**
 * Dashboard Statistics Endpoint backed by Neon PostgreSQL
 * Returns real-time analytics
 * 
 * GET /api/stats
 */
export async function GET(request) {
  const ip = getClientIP(request);

  // Apply rate limiting: 30 requests per minute for stats page
  const limit = await checkRateLimit(ip, 30);
  const headers = rateLimitHeaders(limit);

  if (!limit.allowed) {
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel for performance using SQL
    const [
      totalAnalysesRes,
      completedAnalysesRes,
      failedAnalysesRes,
      recentAnalysesRes,
      severityBreakdown,
      topVulnTypes,
      languageStats,
      avgScanTimeRes,
      repoCountRes,
      breachesPreventedRes,
      dailyTrend,
    ] = await Promise.all([
      // Total analyses count
      query('SELECT COUNT(*) AS count FROM analyses'),

      // Completed analyses
      query("SELECT COUNT(*) AS count FROM analyses WHERE status = 'completed'"),

      // Failed analyses
      query("SELECT COUNT(*) AS count FROM analyses WHERE status = 'failed'"),

      // Recent analyses (last 10)
      query(`
        SELECT id, repository_id, pull_request_number, pull_request_title, pull_request_author, pull_request_url,
               results_summary, results_recommendation, risk_score, risk_level, risk_total_issues, risk_breakdown,
               metadata_language_detected, metadata_scan_time_ms, created_at
        FROM analyses
        WHERE status = 'completed'
        ORDER BY created_at DESC
        LIMIT 10
      `),

      // Severity breakdown
      query(`
        SELECT severity AS _id, COUNT(*)::int AS count
        FROM vulnerabilities
        GROUP BY severity
      `),

      // Top vulnerability types
      query(`
        SELECT type AS _id, COUNT(*)::int AS count, AVG(confidence) AS "avgConfidence"
        FROM vulnerabilities
        GROUP BY type
        ORDER BY count DESC
        LIMIT 10
      `),

      // Language distribution
      query(`
        SELECT language AS _id, COUNT(*)::int AS count
        FROM vulnerabilities
        GROUP BY language
        ORDER BY count DESC
      `),

      // Average scan time
      query(`
        SELECT COALESCE(AVG(metadata_scan_time_ms), 0) AS "avgScanTime",
               COALESCE(MAX(metadata_scan_time_ms), 0) AS "maxScanTime",
               COALESCE(MIN(metadata_scan_time_ms), 0) AS "minScanTime"
        FROM analyses
        WHERE status = 'completed'
      `),

      // Unique repositories
      query('SELECT COUNT(*) AS count FROM repositories'),

      // Breaches prevented
      query('SELECT COALESCE(SUM(stats_breaches_prevented), 0) AS total FROM repositories'),

      // Daily trend (last 7 days)
      query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS _id,
               COUNT(*)::int AS count,
               COALESCE(SUM(risk_total_issues), 0)::int AS vulnerabilities
        FROM analyses
        WHERE created_at >= $1 AND status = 'completed'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY _id ASC
      `, [sevenDaysAgo.toISOString()]),
    ]);

    const totalAnalyses = parseInt(totalAnalysesRes[0].count, 10);
    const completedAnalyses = parseInt(completedAnalysesRes[0].count, 10);
    const failedAnalyses = parseInt(failedAnalysesRes[0].count, 10);
    const repoCount = parseInt(repoCountRes[0].count, 10);
    const totalBreachesPrevented = parseInt(breachesPreventedRes[0].total, 10);

    // Format severity breakdown
    const severityMap = {};
    for (const s of severityBreakdown) {
      severityMap[s._id] = s.count;
    }

    // Format scan time stats
    const scanTimeStats = avgScanTimeRes[0] || { avgScanTime: 0, maxScanTime: 0, minScanTime: 0 };

    // Format recent analyses mapping
    const recentAnalyses = recentAnalysesRes.map(mapRowToAnalysis);

    return NextResponse.json({
      overview: {
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        repositoriesTracked: repoCount,
        breachesPrevented: totalBreachesPrevented,
      },
      vulnerabilities: {
        total: Object.values(severityMap).reduce((a, b) => a + b, 0),
        critical: severityMap.CRITICAL || 0,
        high: severityMap.HIGH || 0,
        medium: severityMap.MEDIUM || 0,
        low: severityMap.LOW || 0,
      },
      topVulnerabilityTypes: topVulnTypes.map(v => ({
        type: v._id,
        count: v.count,
        avgConfidence: Math.round((parseFloat(v.avgConfidence) || 0) * 100),
      })),
      languageDistribution: languageStats.map(l => ({
        language: l._id,
        count: l.count,
      })),
      performance: {
        avgScanTimeMs: Math.round(parseFloat(scanTimeStats.avgScanTime) || 0),
        maxScanTimeMs: Math.round(parseFloat(scanTimeStats.maxScanTime) || 0),
        minScanTimeMs: Math.round(parseFloat(scanTimeStats.minScanTime) || 0),
      },
      recentAnalyses,
      dailyTrend,
      generatedAt: new Date().toISOString(),
    }, { headers });
  } catch (error) {
    console.error('[Stats] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers }
    );
  }
}
