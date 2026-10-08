/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Protects against brute-force attacks and denial-of-service without external dependencies.
 */

class MemoryRateLimiter {
  constructor(windowMs, maxRequests, message) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message || 'Too many requests from this IP, please try again later.';
    this.clients = new Map();

    // Periodic cleanup every 5 minutes to prevent memory leaks
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.clients.entries()) {
      const valid = timestamps.filter((t) => now - t < this.windowMs);
      if (valid.length === 0) {
        this.clients.delete(ip);
      } else {
        this.clients.set(ip, valid);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      const ip =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        'unknown_client';

      const now = Date.now();
      const clientTimestamps = this.clients.get(ip) || [];
      const windowStart = now - this.windowMs;

      // Filter timestamps inside sliding window
      const validTimestamps = clientTimestamps.filter((t) => t > windowStart);

      if (validTimestamps.length >= this.maxRequests) {
        const oldest = validTimestamps[0];
        const retryAfterSec = Math.ceil((oldest + this.windowMs - now) / 1000);

        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          success: false,
          error: {
            message: this.message,
            statusCode: 429,
            retryAfterSeconds: retryAfterSec,
          },
        });
      }

      validTimestamps.push(now);
      this.clients.set(ip, validTimestamps);
      next();
    };
  }
}

// 1. Strict Limiter for Login / Auth endpoints (max 15 attempts per 15 minutes)
export const authRateLimiter = new MemoryRateLimiter(
  15 * 60 * 1000,
  15,
  'Too many login attempts. For security reasons, please wait 15 minutes before trying again.'
).middleware();

// 2. General API Limiter (max 200 requests per minute)
export const apiRateLimiter = new MemoryRateLimiter(
  60 * 1000,
  200,
  'API rate limit exceeded. Please slow down your requests.'
).middleware();

export default {
  authRateLimiter,
  apiRateLimiter,
};
