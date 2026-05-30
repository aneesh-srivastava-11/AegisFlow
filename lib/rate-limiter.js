/**
 * Neon PostgreSQL-backed sliding window rate limiter with inline in-memory fallback.
 * Fixes serverless background timer memory leaks.
 */

import { query } from './neon';

const windowMs = 60 * 1000; // 1 minute window
const requestLog = new Map();

/**
 * Check if a request should be rate limited (in-memory fallback)
 * Uses inline pruning to avoid setInterval leak in serverless runtimes.
 */
function checkInMemoryRateLimit(identifier, maxRequests) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = requestLog.get(identifier) || [];
  timestamps = timestamps.filter(t => t > windowStart);

  // Proactive inline cleanup of stale Map entries (10% chance per check)
  if (Math.random() < 0.10) {
    for (const [key, val] of requestLog.entries()) {
      const valid = val.filter(t => t > windowStart);
      if (valid.length === 0) {
        requestLog.delete(key);
      } else {
        requestLog.set(key, valid);
      }
    }
  }

  const remaining = Math.max(0, maxRequests - timestamps.length);
  const oldestInWindow = timestamps.length > 0 ? timestamps[0] : now;
  const resetMs = oldestInWindow + windowMs - now;

  if (timestamps.length >= maxRequests) {
    requestLog.set(identifier, timestamps);
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  timestamps.push(now);
  requestLog.set(identifier, timestamps);

  return {
    allowed: true,
    remaining: remaining - 1,
    resetMs: windowMs,
  };
}

/**
 * Check if a request should be rate limited (asynchronous, Neon PostgreSQL-backed)
 * @param {string} identifier - IP address or API key
 * @param {number} maxRequests - Maximum requests per window (default: 10)
 * @returns {Promise<{ allowed: boolean, remaining: number, resetMs: number }>}
 */
export async function checkRateLimit(identifier, maxRequests = 10) {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    if (!process.env.DATABASE_URL) {
      return checkInMemoryRateLimit(identifier, maxRequests);
    }

    // Retrieve existing rate limit record
    const records = await query('SELECT timestamps, allowed FROM rate_limits WHERE id = $1', [identifier]);
    const record = records[0];

    let timestamps = [];
    if (record && record.timestamps) {
      timestamps = typeof record.timestamps === 'string' 
        ? JSON.parse(record.timestamps) 
        : record.timestamps;
    }

    // Filter old timestamps outside of the window
    timestamps = timestamps.filter(t => t > windowStart);

    const allowed = timestamps.length < maxRequests;

    if (allowed) {
      timestamps.push(now);
    }

    // Perform upsert
    await query(
      `INSERT INTO rate_limits (id, timestamps, allowed, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (id) DO UPDATE
       SET timestamps = EXCLUDED.timestamps,
           allowed = EXCLUDED.allowed,
           updated_at = NOW()`,
      [identifier, JSON.stringify(timestamps), allowed]
    );

    const remaining = Math.max(0, maxRequests - timestamps.length);
    const oldestInWindow = timestamps.length > 0 ? timestamps[0] : now;
    const resetMs = oldestInWindow + windowMs - now;

    return {
      allowed,
      remaining,
      resetMs: allowed ? windowMs : resetMs,
    };
  } catch (error) {
    console.warn('[Rate Limiter] Persistent rate check failed, falling back to memory:', error.message);
    return checkInMemoryRateLimit(identifier, maxRequests);
  }
}

/**
 * Get the client IP from a Next.js request
 * @param {Request} request - Next.js request object
 * @returns {string}
 */
export function getClientIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Build rate limit headers for the response
 * @param {{ remaining: number, resetMs: number }} rateLimit
 * @returns {Object}
 */
export function rateLimitHeaders(rateLimit) {
  return {
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetMs / 1000)),
  };
}
