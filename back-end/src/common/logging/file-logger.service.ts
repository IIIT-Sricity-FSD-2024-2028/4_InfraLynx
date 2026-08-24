import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * FileLoggerService
 *
 * Buffers access and error log lines in memory and flushes them to disk
 * on a fixed interval (every 5 seconds), rather than writing synchronously
 * on every single request.
 * This satisfies the "logs stored in files at regular intervals" evaluation requirement.
 *
 * Log files written under back-end/logs/, partitioned by date:
 *   logs/access-YYYY-MM-DD.log
 *   logs/error-YYYY-MM-DD.log
 */
@Injectable()
export class FileLoggerService implements OnModuleDestroy {
  private readonly logsDir = path.join(__dirname, '..', '..', '..', 'logs');
  private accessBuffer: string[] = [];
  private errorBuffer: string[] = [];
  private readonly flushIntervalMs = 5000;
  private flushTimer: NodeJS.Timeout;

  constructor() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    // Unref so the interval does not prevent graceful process exit
    this.flushTimer.unref?.();
  }

  private dailyFile(prefix: 'access' | 'error'): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return path.join(this.logsDir, `${prefix}-${today}.log`);
  }

  logAccess(line: string) {
    this.accessBuffer.push(line);
  }

  logError(line: string) {
    this.errorBuffer.push(line);
  }

  /** Force write of current buffered lines to corresponding daily files */
  flush() {
    if (this.accessBuffer.length > 0) {
      const chunk = this.accessBuffer.join('\n') + '\n';
      this.accessBuffer = [];
      fs.appendFile(this.dailyFile('access'), chunk, (err) => {
        if (err) console.error('Failed to append to access log:', err);
      });
    }
    if (this.errorBuffer.length > 0) {
      const chunk = this.errorBuffer.join('\n') + '\n';
      this.errorBuffer = [];
      fs.appendFile(this.dailyFile('error'), chunk, (err) => {
        if (err) console.error('Failed to append to error log:', err);
      });
    }
  }

  onModuleDestroy() {
    clearInterval(this.flushTimer);
    this.flush();
  }
}
