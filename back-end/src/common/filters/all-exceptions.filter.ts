import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileLoggerService } from '../logging/file-logger.service';

/**
 * AllExceptionsFilter
 *
 * Catches every exception thrown anywhere in the application (HttpException and unexpected runtime errors),
 * formats a consistent JSON error response to the client, and records the error detail and stack trace
 * into logs/error-YYYY-MM-DD.log via FileLoggerService.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly fileLogger: FileLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = isHttpException
      ? typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || exception.message
      : 'Internal server error';

    const stack = exception instanceof Error ? exception.stack : String(exception);

    const logLine = `[${new Date().toISOString()}] ${request.method} ${request.originalUrl} status=${status} message=${JSON.stringify(
      message,
    )}\n${stack}`;
    this.fileLogger.logError(logLine);

    response.status(status).json({
      statusCode: status,
      path: request.originalUrl,
      method: request.method,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
