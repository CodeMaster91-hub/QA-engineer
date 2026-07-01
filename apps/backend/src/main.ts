import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseEnv } from 'dotenv';
import { AppModule } from './app.module';

function loadEnvFileWithOverride(): void {
  const candidates = [
    join(__dirname, '../../../.env'),
    join(__dirname, '../../.env'),
    join(__dirname, '../.env'),
    join(__dirname, '.env'),
  ];
  const envPath = candidates.find((p) => existsSync(p));
  if (!envPath) return;

  const parsed = parseEnv(readFileSync(envPath, 'utf-8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFileWithOverride();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  app.setGlobalPrefix('api');
  app.enableCors();
  
  const config = new DocumentBuilder()
    .setTitle('QA Platform API')
    .setDescription('QA-платформа для автоматизированного тестирования требований')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
