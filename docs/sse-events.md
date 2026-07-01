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
id: 1782317725861-y0b103
data: {"featureId":"...","featureSlug":"my-feature","stage":"test_plan_created","progress":3,"total":9,"status":"running"}

event: pipeline:log
id: 1782317725861-308410
data: {"featureId":"...","featureSlug":"my-feature","message":"Starting stage: test_plan_created","level":"info"}

event: pipeline:completed
id: 1782317800000-abc123
data: {"stage":"published","featureSlug":"my-feature"}

event: pipeline:failed
id: 1782317900000-def456
data: {"stage":"requirements_extracted","error":"Не удалось извлечь требования"}

event: pipeline:waiting_for_qa
id: 1782318000000-ghi789
data: {"stage":"coverage_audited","coverageGaps":["REQ-001: нет негативного тест-кейса"]}
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
  "stage": "test_plan_created",
  "progress": 3,
  "total": 9,
  "status": "running"
}
```

### pipeline:completed

Пайплайн завершен успешно.

```json
{
  "stage": "published",
  "featureSlug": "my-feature"
}
```

### pipeline:failed

Ошибка выполнения пайплайна.

```json
{
  "stage": "requirements_extracted",
  "error": "Не удалось извлечь требования из документа"
}
```

### pipeline:blocked

Пайплайн заблокирован вопросами к QA. Backend эмитит два события:
1. `pipeline:stage-update` — обновляет статус этапа (чтобы UI обновился без F5)
2. `pipeline:blocked` — содержит вопросы для QA

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

### pipeline:fill-gaps-started

Начало генерации дополнительных тест-кейсов для устранения пробелов.

```json
{
  "gapsCount": 8
}
```

### pipeline:fill-gaps-done

Завершение генерации дополнительных тест-кейсов. Кейсы сохранены в артефакте `testcases`. После этого события автоматически запускается этап `coverage_audited` через очередь.

```json
{
  "success": true,
  "error": null
}
```

**Порядок событий при fill-gaps:**
1. `pipeline:fill-gaps-started` → спинер на test_cases
2. `pipeline:fill-gaps-done` → убираем спинер, обновляем кейсы
3. `pipeline:progress` → покрытие в процессе
4. `pipeline:waiting_for_qa` (если gaps) ИЛИ `pipeline:stage-update` (если coverage completed)

## Frontend

SSE больше не используется на фронтенде. Вместо этого — **HTTP polling**:

- `GET /api/features/:slug` — единственный endpoint, возвращает `{ feature, pipeline }` (включает артефакты в `feature.artifacts`)
- Polling с настраиваемым интервалом (5-120с, по умолчанию 5с), активен только пока `pipeline.status === 'running'`
- При любом действии (run, approve, restart, и т.д.) — `loadAll()` для немедленного обновления

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
