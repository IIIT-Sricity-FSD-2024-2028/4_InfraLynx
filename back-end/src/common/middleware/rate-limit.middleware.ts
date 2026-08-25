import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * RateLimitMiddleware
 *
 * Router-level security middleware implementing in-memory fixed-window rate limiting per client IP.
 * Protects against excessive requests, rapid automated scraping, and API flooding.
 *
 * NOTE: maxRequests is set to 2000/min because each page load issues ~24 parallel API requests
 * via Promise.all() in the front-end data store. 300 was too low and caused sign-in to be
 * blocked after just ~13 page reloads within the same 60-second window.
 *
 * NOTE: HttpException must be passed via next(error) — not thrown — in NestJS middleware.
 * Throwing directly in middleware bypasses the NestJS exception filter pipeline and causes
 * unhandled Express errors instead of the expected JSON error response.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windowMs = 60_000; // 1 minute fixed window
  private readonly maxRequests = 2000; // max requests per IP within the window
  private hits = new Map<string, { count: number; windowStart: number }>();

  use(req: Request, res: Response, next: NextFunction) {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      return next();
    }

    entry.count += 1;

    if (entry.count > this.maxRequests) {
      // Pass the error to next() so NestJS exception filters (AllExceptionsFilter)
      // can catch it and return a structured JSON response. Throwing directly in
      // middleware bypasses the NestJS exception handling pipeline.
      return next(
        new HttpException(
          'Too many requests, please slow down.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    }

    next();
  }
}
