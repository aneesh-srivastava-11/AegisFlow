import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkRateLimit, getClientIP, rateLimitHeaders } from '@/lib/rate-limiter';
import { verifyServerSession } from '@/lib/auth-middleware';

/**
 * Dashboard Statistics Endpoint
 * Returns real-time analytics from MongoDB
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
    const analyses = await getCollection('analyses');
    const vulnerabilities = await getCollection('vulnerabilities');
    const repositories = await getCollection('repositories');

    // Run all queries in parallel for performance
    const [
      totalAnalyses,
      completedAnalyses,
      failedAnalyses,
      recentAnalyses,
      severityBreakdown,
      topVulnTypes,
      languageStats,
      avgScanTime,
      repoCount,
      breachesPrevented,
      dailyTrend,
    ] = await Promise.all([
      // Total analyses count
      analyses.countDocuments(),

      // Completed analyses
      analyses.countDocuments({ status: 'completed' }),

      // Failed analyses
      analyses.countDocuments({ status: 'failed' }),

      // Recent analyses (last 10)
      analyses.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(10)
        .project({
          repositoryId: 1,
          'pullRequest.number': 1,
          'pullRequest.title': 1,
          'pullRequest.author': 1,
          'pullRequest.url': 1,
          'results.summary': 1,
          'results.recommendation': 1,
          'risk.score': 1,
          'risk.level': 1,
          'risk.totalIssues': 1,
          'risk.breakdown': 1,
          'metadata.languageDetected': 1,
          'metadata.scanTimeMs': 1,
          createdAt: 1,
        })
        .toArray(),

      // Severity breakdown
      vulnerabilities.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ]).toArray(),

      // Top vulnerability types
      vulnerabilities.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$confidence' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).toArray(),

      // Language distribution
      vulnerabilities.aggregate([
        {
          $group: {
            _id: '$language',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]).toArray(),

      // Average scan time
      analyses.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            avgScanTime: { $avg: '$metadata.scanTimeMs' },
            maxScanTime: { $max: '$metadata.scanTimeMs' },
            minScanTime: { $min: '$metadata.scanTimeMs' },
          },
        },
      ]).toArray(),

      // Unique repositories
      repositories.countDocuments(),

      // Breaches prevented (critical issues found)
      repositories.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$stats.breachesPrevented' },
          },
        },
      ]).toArray(),

      // Daily trend (last 7 days)
      analyses.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            status: 'completed',
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
            vulnerabilities: { $sum: '$risk.totalIssues' },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray(),
    ]);

    // Format severity breakdown
    const severityMap = {};
    for (const s of severityBreakdown) {
      severityMap[s._id] = s.count;
    }

    // Format scan time stats
    const scanTimeStats = avgScanTime[0] || { avgScanTime: 0, maxScanTime: 0, minScanTime: 0 };

    return NextResponse.json({
      overview: {
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        repositoriesTracked: repoCount,
        breachesPrevented: breachesPrevented[0]?.total || 0,
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
        avgConfidence: Math.round((v.avgConfidence || 0) * 100),
      })),
      languageDistribution: languageStats.map(l => ({
        language: l._id,
        count: l.count,
      })),
      performance: {
        avgScanTimeMs: Math.round(scanTimeStats.avgScanTime || 0),
        maxScanTimeMs: Math.round(scanTimeStats.maxScanTime || 0),
        minScanTimeMs: Math.round(scanTimeStats.minScanTime || 0),
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
