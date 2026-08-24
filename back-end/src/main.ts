import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security middleware: HTTP security headers (CSP, XSS, no-sniff, etc.)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Enable CORS so the front-end (file:// or localhost) can call the API
  app.enableCors({ origin: '*' });

  // Serve uploaded evidence photos and files statically
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });

  // Global validation — strip unknown fields, throw on bad DTOs
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
  );

  const { DocumentBuilder } = require('@nestjs/swagger');

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('InfraLynx API documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => `${controllerKey}_${methodKey}`,
  });

  const modules = (app as any).container.getModules();
  const roleMap: Record<string, string[]> = {};

  for (const module of modules.values()) {
    for (const controller of module.controllers.values()) {
      const instance = controller.instance;
      if (!instance) continue;
      
      const controllerClass = instance.constructor;
      const controllerName = controllerClass.name;

      const classRoles = Reflect.getMetadata('roles', controllerClass) || [];

      const methodNames = Object.getOwnPropertyNames(controllerClass.prototype).filter(
        (name) => name !== 'constructor' && typeof controllerClass.prototype[name] === 'function',
      );

      for (const methodName of methodNames) {
        const methodRoles = Reflect.getMetadata('roles', controllerClass.prototype[methodName]) || [];
        const combinedRoles = [...new Set([...classRoles, ...methodRoles])];
        if (combinedRoles.length > 0) {
          roleMap[`${controllerName}_${methodName}`] = combinedRoles;
        }
      }
    }
  }

  for (const pathKey in document.paths) {
    const pathItem = document.paths[pathKey] as any;
    for (const methodKey in pathItem) {
      const operation = pathItem[methodKey];
      if (typeof operation === 'object' && operation !== null) {
        const opId = operation.operationId;
        if (opId && roleMap[opId]) {
          if (!operation.parameters) {
            operation.parameters = [];
          }
          operation.parameters.push({
            name: 'X-Role',
            in: 'header',
            description: `Allowed roles: ${roleMap[opId].join(', ')}`,
            required: true,
            schema: { type: 'string' }
          });
        }
      }
    }
  }

  // Save the generated json to docs/swagger.json for reference
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(docsDir, 'swagger.json'), JSON.stringify(document, null, 2));

  // Serve Swagger UI using the dynamically generated document
  SwaggerModule.setup('api', app, document);
  console.log('Swagger UI available at http://localhost:3000/api');

  await app.listen(3000);
  console.log('InfraLynx CRIMS backend running on http://localhost:3000');
}
bootstrap();
