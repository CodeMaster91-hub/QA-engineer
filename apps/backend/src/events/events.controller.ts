import { Controller, Get } from '@nestjs/common';

@Controller('events')
export class EventsController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }
}
