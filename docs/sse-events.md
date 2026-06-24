# SSE Events API

Real-time события через Server-Sent Events.

## Endpoints

### GET /api/events/stream/:featureId

Подключение к SSE стриму для фичи.

**Headers:**
```
Authorization: Bearer <jwt_token>
Accept: text/event-stream
```

**Response:** SSE stream

```
event: pipeline:progress
data: {"featureId":"...","stage":"requirements_extracted","progress":2,"total":7,"status":"running"}

event: pipeline:log
data: {"featureId":"...","message":"Starting stage: requirements_extracted","level":"info"}

event: pipeline:completed
data: {"featureId":"...","result":{...}}

event: pipeline:failed
data: {"featureId":"...","error":"Stage failed"}
```

### GET /api/events/health

Проверка состояния SSE сервиса.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00Z"
}
```

## Типы событий

### pipeline:progress

Прогресс выполнения пайплайна.

```json
{
  "featureId": "uuid",
  "featureSlug": "my-feature",
  "stage": "requirements_extracted",
  "progress": 2,
  "total": 7,
  "status": "running"
}
```

### pipeline:completed

Пайплайн завершен успешно.

```json
{
  "featureId": "uuid",
  "featureSlug": "my-feature",
  "result": { ... }
}
```

### pipeline:failed

Ошибка выполнения пайплайна.

```json
{
  "featureId": "uuid",
  "featureSlug": "my-feature",
  "error": "Stage failed: LLM timeout"
}
```

### pipeline:blocked

Пайплайн заблокирован вопросами к QA.

```json
{
  "featureId": "uuid",
  "featureSlug": "my-feature",
  "stage": "requirements_extracted",
  "questions": [
    {
      "question": "Что происходит если...",
      "reason": "Не указано поведение в случае...",
      "severity": "high"
    }
  ]
}
```

### pipeline:waiting_for_qa

Пайплайн ждёт одобрения QA.

```json
{
  "featureId": "uuid",
  "featureSlug": "my-feature",
  "stage": "review",
  "coverageGaps": ["REQ-001: нет негативного тест-кейса"]
}
```

### pipeline:log

Лог выполнения.

```json
{
  "featureId": "uuid",
  "featureSlug": "my-feature",
  "message": "Starting stage: requirements_extracted",
  "level": "info"
}
```

### testrail:progress

Прогресс публикации в TestRail.

```json
{
  "featureId": "uuid",
  "featureSlug": "my-feature",
  "status": "publishing",
  "progress": 5
}
```

## Использование на Frontend

### Composable useSse.ts

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useSse(featureId: string, token: string) {
  const events = ref<any[]>([]);
  const connected = ref(false);
  let eventSource: EventSource | null = null;

  const connect = () => {
    eventSource = new EventSource(
      `/api/events/stream/${featureId}?token=${token}`
    );

    eventSource.addEventListener('pipeline:progress', (e) => {
      const data = JSON.parse(e.data);
      events.value.push({ type: 'pipeline:progress', data });
    });

    eventSource.addEventListener('pipeline:log', (e) => {
      const data = JSON.parse(e.data);
      events.value.push({ type: 'pipeline:log', data });
    });

    eventSource.addEventListener('pipeline:completed', (e) => {
      const data = JSON.parse(e.data);
      events.value.push({ type: 'pipeline:completed', data });
    });

    eventSource.addEventListener('pipeline:failed', (e) => {
      const data = JSON.parse(e.data);
      events.value.push({ type: 'pipeline:failed', data });
    });

    eventSource.onopen = () => {
      connected.value = true;
    };

    eventSource.onerror = () => {
      connected.value = false;
    };
  };

  const disconnect = () => {
    eventSource?.close();
    connected.value = false;
  };

  onMounted(connect);
  onUnmounted(disconnect);

  return { events, connected, disconnect };
}
```

### Использование в компоненте

```vue
<script setup lang="ts">
import { useSse } from '@/composables/useSse';

const { events, connected } = useSse(featureId, token);
</script>

<template>
  <div>
    <div :class="{ online: connected }">
      {{ connected ? 'Подключено' : 'Отключено' }}
    </div>
    
    <div v-for="event in events" :key="event.timestamp">
      <template v-if="event.type === 'pipeline:progress'">
        {{ event.data.stage }}: {{ event.data.progress }}/{{ event.data.total }}
      </template>
      <template v-if="event.type === 'pipeline:log'">
        [{{ event.data.level }}] {{ event.data.message }}
      </template>
    </div>
  </div>
</template>
```

## Multi-pod

Для работы в Kubernetes с несколькими pod'ами используется Redis Pub/Sub:

1. **Pod A** → публикует событие в Redis
2. **Redis** → рассылает всем подписчикам
3. **Pod B** → получает событие и отправляет клиенту

```
Pod A ──┐
        ├──▶ Redis Pub/Sub ──┬──▶ Pod A ──▶ Client A
Pod B ──┘                    └──▶ Pod B ──▶ Client B
```

## ENV переменные

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # опционально
```
