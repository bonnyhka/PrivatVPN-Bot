import prisma from './db'

/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Tracks request counts per IP over a sliding window.
 */

interface RateLimitRecord {
  count: number
  windowStart: number
  lastLoggedAt?: number
}

const store = new Map<string, RateLimitRecord>()

// Clean up old entries every 5 minutes to avoid memory leaks
const cleanupInterval = setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000
  store.forEach((v, k) => {
    if (v.windowStart < cutoff) store.delete(k)
  })
}, 5 * 60 * 1000)

cleanupInterval.unref?.()

/**
 * @param ip - Client IP address
 * @param limit - Max requests allowed
 * @param windowMs - Time window in milliseconds
 * @param path - The API path being accessed (for logging)
 * @returns `allowed: true` if within limit, `allowed: false` + `retryAfter` seconds otherwise
 */
export function rateLimit(
  ip: string,
  limit: number,
  windowMs: number,
  path: string = 'unknown'
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const key = `${path}:${ip}`

  let record = store.get(key)

  if (!record || now - record.windowStart > windowMs) {
    record = { count: 1, windowStart: now }
    store.set(key, record)
    return { allowed: true }
  }

  record.count++

  if (record.count > limit) {
    const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000)
    
    // Log once every minute per IP to avoid flooding DB during active attack
    if (!record.lastLoggedAt || now - record.lastLoggedAt > 60000) {
      record.lastLoggedAt = now
      
      const isDdos = record.count > limit * 5
      
      // Async log to DB
      prisma.securityLog.create({
        data: {
          type: isDdos ? 'ddos' : 'rate_limit',
          ip,
          path,
          details: `Blocked after ${record.count} requests. Limit: ${limit} per ${windowMs}ms`,
          severity: isDdos ? 'high' : 'medium'
        }
      }).catch(err => console.error('Failed to log security event:', err))
    }
    
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}
