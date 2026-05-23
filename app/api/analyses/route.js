import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkRateLimit, getClientIP, rateLimitHeaders } from '@/lib/rate-limiter';
import { verifyServerSession } from '@/lib/auth-middleware';

/**
 * Paginated Analyses List Endpoint
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
    const skip = (page - 1) * limit;

    const collection = await getCollection('analyses');

    const [items, total] = await Promise.all([
      collection.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
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
          'metadata.languageDetected': 1,
          'metadata.scanTimeMs': 1,
          createdAt: 1,
        })
        .toArray(),
      collection.countDocuments({ status: 'completed' })
    ]);

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
