import { Global, Module } from '@nestjs/common';
import { FileLoggerService } from './file-logger.service';

/**
 * Global logging module so FileLoggerService can be injected across
 * filters, guards, and middleware without requiring explicit imports in each feature module.
 */
@Global()
@Module({
  providers: [FileLoggerService],
  exports: [FileLoggerService],
})
export class LoggingModule {}
