import { NextResponse } from 'next/server';
import { query } from '@/lib/neon';
import { checkRateLimit, getClientIP, rateLimitHeaders } from '@/lib/rate-limiter';
import { verifyServerSession } from '@/lib/auth-middleware';

/**
 * Webhook Logs Endpoint backed by Neon PostgreSQL
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
    const offset = (page - 1) * limitParam;

    // Build filter parts for PostgreSQL query
    const filterParts = [];
    const queryParams = [];
    let paramIndex = 1;

    if (source) {
      filterParts.push(`source = $${paramIndex++}`);
      queryParams.push(source);
    }
    if (status) {
      filterParts.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }

    const whereClause = filterParts.length > 0 ? `WHERE ${filterParts.join(' AND ')}` : '';

    // Paginated logs
    const itemsQueryStr = `
      SELECT id, delivery_id AS "deliveryId", event, source, status, repository_id AS "repositoryId",
             pull_number AS "pullNumber", recommendation, scan_time_ms AS "scanTimeMs", error, reason,
             received_at AS "receivedAt", completed_at AS "completedAt"
      FROM webhook_logs
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    // Total count query
    const countQueryStr = `
      SELECT COUNT(*) AS count
      FROM webhook_logs
      ${whereClause}
    `;

    const itemsQueryParams = [...queryParams, limitParam, offset];

    const [items, totalRes, statusSummary] = await Promise.all([
      query(itemsQueryStr, itemsQueryParams),
      query(countQueryStr, queryParams),
      query(`
        SELECT status AS _id, COUNT(*)::int AS count
        FROM webhook_logs
        GROUP BY status
      `).catch(() => [])
    ]);

    const total = parseInt(totalRes[0].count, 10);

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
