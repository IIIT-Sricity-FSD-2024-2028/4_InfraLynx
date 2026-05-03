import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });

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
    const pathItem = document.paths[pathKey];
    for (const methodKey in pathItem) {
      const operation = pathItem[methodKey as keyof typeof pathItem];
      if (typeof operation === 'object' && operation !== null) {
        const opId = (operation as any).operationId;
        if (opId && roleMap[opId]) {
          if (!(operation as any).parameters) {
            (operation as any).parameters = [];
          }
          (operation as any).parameters.push({
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

  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }

  fs.writeFileSync(path.join(docsDir, 'swagger.json'), JSON.stringify(document, null, 2));

  console.log('Swagger documentation generated successfully at docs/swagger.json');
  await app.close();
}

bootstrap();
