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
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windowMs = 60_000; // 1 minute sliding/fixed window
  private readonly maxRequests = 300; // max requests per IP within the window
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
      throw new HttpException(
        'Too many requests, please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
