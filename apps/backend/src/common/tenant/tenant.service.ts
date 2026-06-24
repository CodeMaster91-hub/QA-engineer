import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private configService: ConfigService) {}

  getTenantId(): string {
    return this.configService.get<string>('DB_SCHEMA', 'public');
  }

  getSchema(): string {
    return this.configService.get<string>('DB_SCHEMA', 'public');
  }

  getTenantFromRequest(req: Request): string {
    return req.tenantId || this.getTenantId();
  }
}
