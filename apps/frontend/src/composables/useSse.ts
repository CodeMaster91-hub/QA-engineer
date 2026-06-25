import { ref, onMounted, onUnmounted } from 'vue';

export interface SseEvent {
  type: string;
  data: any;
  timestamp: Date;
  id?: string;
}

export function useSse(featureId: string) {
  const events = ref<SseEvent[]>([]);
  const connected = ref(false);

  let eventSource: EventSource | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = 1000;
  const MAX_RETRY_DELAY = 30000;
  let lastEventTimestamp: number = 0;
  let disposed = false;

  const connect = () => {
    if (disposed) return;

    const sinceParam = lastEventTimestamp > 0
      ? `?since=${lastEventTimestamp}`
      : '';

    const url = `/api/events/stream/${featureId}${sinceParam}`;
    eventSource = new EventSource(url);

    const handleSseMessage = (rawData: string) => {
      try {
        const raw = JSON.parse(rawData);
        const event: SseEvent = {
          type: raw.type,
          data: raw.data,
          timestamp: new Date(raw.timestamp || Date.now()),
          id: raw.id,
        };

        if (event.id) {
          const ts = parseInt(event.id.split('-')[0], 10);
          if (!isNaN(ts) && ts > lastEventTimestamp) {
            lastEventTimestamp = ts;
          }
        }

        events.value.push(event);
        retryDelay = 1000;
      } catch {
        // ignore parse errors
      }
    };

    const eventTypes = [
      'pipeline:stage-update',
      'pipeline:progress',
      'pipeline:blocked',
      'pipeline:waiting_for_qa',
      'pipeline:completed',
      'pipeline:failed',
      'pipeline:log',
      'pipeline:fill-gaps-started',
      'pipeline:fill-gaps-done',
    ]

    eventTypes.forEach((type) => {
      eventSource!.addEventListener(type, (e: MessageEvent) => {
        handleSseMessage(e.data)
      })
    })

    eventSource.onmessage = (e) => {
      handleSseMessage(e.data)
    }

    eventSource.onopen = () => {
      connected.value = true;
      retryDelay = 1000;
    };

    eventSource.onerror = () => {
      connected.value = false;
      eventSource?.close();
      eventSource = null;
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (disposed) return;
    if (retryTimeout) clearTimeout(retryTimeout);

    retryTimeout = setTimeout(() => {
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
      connect();
    }, retryDelay);
  };

  const disconnect = () => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    connected.value = false;
  };

  const clearEvents = () => {
    events.value = [];
  };

  onMounted(connect);

  onUnmounted(() => {
    disposed = true;
    disconnect();
  });

  return {
    events,
    connected,
    disconnect,
    clearEvents,
  };
}
