import { Controller, Get, Param, Query, Sse } from '@nestjs/common';
import { Observable, from, concat, map } from 'rxjs';
import { EventsService, SseEvent } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Sse('stream/:featureId')
  stream(
    @Param('featureId') featureId: string,
    @Query('since') since: string,
  ): Observable<SseEvent> {
    // Replay пропущенных событий
    const replayEvents = this.eventsService.getReplayEvents(featureId, since);
    const replay$ = from(replayEvents).pipe(
      map((event) => ({
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
        id: event.id,
      })),
    );

    // Live stream
    const live$ = this.eventsService.getObservable(featureId).pipe(
      map((event) => ({
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
        id: event.id,
      })),
    );

    // Replay сначала, потом live
    return concat(replay$, live$);
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }
}
