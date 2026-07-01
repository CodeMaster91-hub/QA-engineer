import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSchema?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = this.configService.get<string>('DB_SCHEMA', 'public');
    
    req.tenantId = tenantId;
    req.tenantSchema = tenantId;

    next();
  }
}
