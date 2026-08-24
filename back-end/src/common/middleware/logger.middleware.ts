import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FileLoggerService } from '../logging/file-logger.service';

/**
 * LoggerMiddleware
 *
 * Router-level middleware (bound via AppModule.configure()) that logs every HTTP request:
 * method, path, caller role ('x-role' header), response status code, and response duration in ms.
 * Lines are buffered and written to logs/access-YYYY-MM-DD.log at regular intervals.
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly fileLogger: FileLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl } = req;
    const role = (req.headers['x-role'] as string) || '-';

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const line = `[${new Date().toISOString()}] ${method} ${originalUrl} role=${role} status=${res.statusCode} ${durationMs}ms`;
      console.log(`[HTTP] ${line}`);
      this.fileLogger.logAccess(line);
    });

    next();
  }
}
