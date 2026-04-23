import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so the front-end (file:// or localhost) can call the API
  app.enableCors({ origin: '*' });

  // Global validation — strip unknown fields, throw on bad DTOs
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
  );

  await app.listen(3000);
  console.log('InfraLynx CRIMS backend running on http://localhost:3000');
}
bootstrap();
