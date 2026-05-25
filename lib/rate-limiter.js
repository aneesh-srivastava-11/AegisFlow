/**
 * MongoDB-backed sliding window rate limiter with in-memory fallback.
 * 
 * In Vercel serverless, each cold start gets a fresh memory Map.
 * For true global rate limiting in production, we use the shared MongoDB 
 * database, falling back to in-memory tracking in development or on DB error.
 */

import { getCollection } from './mongodb';

const windowMs = 60 * 1000; // 1 minute window
const requestLog = new Map();

// Cleanup stale in-memory entries every 5 minutes to prevent memory leaks (fallback only)
setInterval(() => {
  const cutoff = Date.now() - windowMs;
  for (const [key, timestamps] of requestLog) {
    const valid = timestamps.filter(t => t > cutoff);
    if (valid.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, valid);
    }
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Check if a request should be rate limited (in-memory fallback)
 */
function checkInMemoryRateLimit(identifier, maxRequests) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = requestLog.get(identifier) || [];
  timestamps = timestamps.filter(t => t > windowStart);

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
 * Check if a request should be rate limited (asynchronous, MongoDB-backed)
 * @param {string} identifier - IP address or API key
 * @param {number} maxRequests - Maximum requests per window (default: 10)
 * @returns {Promise<{ allowed: boolean, remaining: number, resetMs: number }>}
 */
export async function checkRateLimit(identifier, maxRequests = 10) {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    if (!process.env.MONGODB_URI) {
      return checkInMemoryRateLimit(identifier, maxRequests);
    }

    const collection = await getCollection('rate_limits');

    // Atomic update to filter old timestamps and conditionally push new one
    const record = await collection.findOneAndUpdate(
      { _id: identifier },
      [
        {
          $set: {
            timestamps: {
              $filter: {
                input: { $ifNull: ["$timestamps", []] },
                as: "t",
                cond: { $gt: ["$$t", windowStart] }
              }
            },
            createdAt: { $ifNull: ["$createdAt", new Date(now)] }
          }
        },
        {
          $set: {
            allowed: { $lt: [{ $size: "$timestamps" }, maxRequests] }
          }
        },
        {
          $set: {
            timestamps: {
              $cond: {
                if: "$allowed",
                then: { $concatArrays: ["$timestamps", [now]] },
                else: "$timestamps"
              }
            },
            updatedAt: new Date(now)
          }
        }
      ],
      { upsert: true, returnDocument: 'after' }
    );

    const timestamps = record?.timestamps || [];
    const allowed = record?.allowed ?? false;

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
