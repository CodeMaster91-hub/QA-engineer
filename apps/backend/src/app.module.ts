import { Module, MiddlewareConsumer, NestModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';

function findEnvFiles(): string[] {
  const paths: string[] = [
    // Relative to __dirname (works for dist/main.js in any deployment)
    join(__dirname, '../../../.env'),
    join(__dirname, '../../.env'),
    join(__dirname, '../.env'),
    join(__dirname, '.env'),

    // Company server paths for deployed environments
    '/etc/qa-platform/.env',
    '/opt/qa-platform/.env',

    // CWD-based paths (works for ts-node / nest start --watch)
    join(process.cwd(), '.env'),
    join(process.cwd(), '../.env'),
    join(process.cwd(), '../../.env'),
  ];

  const existing = paths.filter((p) => existsSync(p));
  if (existing.length > 0) {
    Logger.log(`Loading .env from: ${existing[0]}`, 'AppModule');
  } else {
    Logger.warn('No .env file found — using system environment variables only', 'AppModule');
  }
  return existing;
}
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FeaturesModule } from './features/features.module';
import { AgentsModule } from './agents/agents.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { TestRailModule } from './testrail/testrail.module';
import { TmsModule } from './tms/tms.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { TenantModule } from './common/tenant/tenant.module';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { QueueModule } from './common/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: findEnvFiles(),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'qa_user'),
        password: configService.get<string>('DB_PASSWORD', 'strong_password'),
        database: configService.get<string>('DB_DATABASE', 'qa_platform'),
        schema: configService.get<string>('DB_SCHEMA', 'public'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    TenantModule,
    QueueModule,
    AuthModule,
    UsersModule,
    FeaturesModule,
    AgentsModule,
    PipelineModule,
    TestRailModule,
    TmsModule,
    EventsModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
