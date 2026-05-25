import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkRateLimit, getClientIP, rateLimitHeaders } from '@/lib/rate-limiter';
import { verifyServerSession } from '@/lib/auth-middleware';

/**
 * Feature C: Webhook Logs Endpoint
 * GET /api/webhook-logs?page=1&limit=20&source=github|gitlab&status=completed|failed
 */
export async function GET(request) {
  const ip = getClientIP(request);
  const limit = await checkRateLimit(ip, 60);
  const headers = rateLimitHeaders(limit);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in 1 minute.' },
      { status: 429, headers }
    );
  }

  // Require authentication
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limitParam = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));
    const source = searchParams.get('source'); // 'github' | 'gitlab' | null (all)
    const status = searchParams.get('status'); // 'completed' | 'failed' | null (all)
    const skip = (page - 1) * limitParam;

    const collection = await getCollection('webhook_logs');

    // Build filter query
    const filter = {};
    if (source) filter.source = source;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      collection.find(filter)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limitParam)
        .project({
          event: 1,
          source: 1,
          status: 1,
          repositoryId: 1,
          pullNumber: 1,
          deliveryId: 1,
          recommendation: 1,
          scanTimeMs: 1,
          error: 1,
          receivedAt: 1,
          completedAt: 1,
        })
        .toArray(),
      collection.countDocuments(filter),
    ]);

    // Aggregate status summary
    const statusSummary = await collection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]).toArray().catch(() => []);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit: limitParam,
        total,
        pages: Math.ceil(total / limitParam),
      },
      summary: Array.isArray(statusSummary) ? statusSummary : [],
    }, { headers });
  } catch (error) {
    console.error('[Webhook Logs] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers });
  }
}
