# Pipeline

Оркестрация пайплайна обработки требований.

## Workflow

```
new → source_ingested → requirements_extracted → test_plan_created → test_cases_created →
coverage_audited → review → dry_run_completed → published
```

| Этап | Описание | Артефакт |
|------|----------|----------|
| new | Фича создана | - |
| source_ingested | Исходный бандл загружен | source |
| requirements_extracted | Требования извлечены | requirements |
| test_plan_created | Тест-план создан | testplan |
| test_cases_created | Тест-кейсы созданы | testcases |
| coverage_audited | Аудит покрытия пройден | coverage |
| review | Ревью завершено | review |
| dry_run_completed | Пробный запуск завершен | dry_run |
| published | Опубликовано | - |

## UI Pipeline Stages

Backend имеет 9 этапов, UI показывает 7 (без `new` и `source_ingested`):

| UI Stage | Backend Stage | Артефакт | Формат рендера |
|----------|---------------|----------|----------------|
| Требования | requirements_extracted | source + requirements | Split-screen: источник + таблица |
| Тест-план | test_plan_created | testplan | markdown → HTML |
| Тест-кейсы | test_cases_created | testcases | JSON → таблица |
| Покрытие | coverage_audited | coverage | JSON + markdown matrix |
| Ревью | review | review | JSON → карточки |
| Пробный запуск | dry_run_completed | dry_run | JSON → результаты |
| Опубликовано | published | — | Текст + кнопка |

### Маппинг UI → Backend

```typescript
const PIPELINE_STAGES_UI = [
  { key: 'requirements_extracted', backendStage: 'requirements_extracted' },
  { key: 'test_plan',              backendStage: 'test_plan_created', artifactType: 'testplan' },
  { key: 'test_cases',             backendStage: 'test_cases_created', artifactType: 'testcases' },
  { key: 'coverage_audited',       backendStage: 'coverage_audited' },
  { key: 'review',                 backendStage: 'review' },
  { key: 'dry_run_completed',      backendStage: 'dry_run_completed' },
  { key: 'published',              backendStage: 'published' },
];
```

## Статусы пайплайна

| Статус | Описание | UI Label | Иконка |
|--------|----------|-----------|--------|
| idle | Ожидает запуска | New | Серый круг |
| running | Выполняется | Running | Спиннер |
| blocked | Заблокирован (есть вопросы к QA) | Нужен фидбек | Пауза |
| waiting_for_qa | Ожидает одобрения QA | Ожидает одобрения QA | Пауза |
| paused | На паузе | Paused | Пауза |
| completed | Завершен | Passed | Галочка |
| failed | Ошибка | Failed | Крестик |
| cancelled | Отменен | Canceled | Серый |

## Валидация артефактов

Каждый этап проверяет наличие артефакта предыдущего этапа. Если артефакт отсутствует или пуст — этап завершается с `status: "failed"` и описанием ошибки на русском языке.

| Этап | Проверяемый артефакт | Ошибка |
|------|----------------------|--------|
| Requirements | source (источник) | Источник не найден |
| Test Plan | requirements | Требования не найдены |
| Test Cases | requirements | Требования не найдены |
| Coverage | requirements + testcases | Тест-кейсы не найдены |
| Review | testcases | Тест-кейсы не найдены |
| Dry Run | testcases | Тест-кейсы не найдены |

**Правило:** `requirements` не может быть пустым массивом. Если LLM не извлёк требования из документа — этап Requirements завершается с ошибкой, и флоу не продолжается.

## Approval Gates

Пайплайн останавливается на определённых этапах и ждёт подтверждения QA:

| Gate | Когда | Действие |
|------|-------|----------|
| requirements_extracted | LLM обнаружил неясности в требованиях | Вопросы показываются QA, pipeline блокируется |
| coverage_audited | Обнаружены пробелы в покрытии | Gaps показываются QA, ждёт команды |
| review | Ревью завершено | **Hard stop** — всегда ждёт апрува QA |
| dry_run_completed | Dry-run завершён | Ждёт апрува перед публикацией в TestRail |

### Blocked (вопросы)

Когда LLM обнаруживает неясности в требованиях:

```json
{
  "status": "blocked",
  "blockedStage": "requirements_extracted",
  "questions": [
    {
      "question": "Что происходит если...",
      "reason": "Не указано поведение в случае...",
      "severity": "high",
      "stage": "requirements_extracted"
    }
  ]
}
```

QA отвечает на вопросы → `POST /api/pipeline/:slug/answer` → pipeline перезапускает этап.

### Waiting for QA (одобрение)

На этапах `review` и `dry_run_completed` pipeline останавливается:

```json
{
  "status": "waiting_for_qa",
  "blockedStage": "review",
  "coverageGaps": ["REQ-001: нет негативного тест-кейса"]
}
```

QA одобряет → `POST /api/pipeline/:slug/approve` → pipeline продолжает.

## Questions Persistence

Вопросы сохраняются в `pipeline.questions` и остаются как артефакт после ответа QA.
При `POST /api/pipeline/:slug/answer` — вопросы **НЕ** удаляются, pipeline продолжает выполнение.
Вопросы видны в RequirementsStage через `pipeline.questions`.

## Restart Stage

Перезапуск конкретного этапа (как в GitLab CI):

```
POST /api/pipeline/:slug/restart-stage
Body: { "stage": "requirements_extracted" }
```

Удаляет результат только этого этапа и перезапускает его.
Предыдущие этапы не затрагиваются.

## Endpoints

### GET /api/pipeline/:slug/status

Получить статус пайплайна.

**Response:**
```json
{
  "id": "uuid",
  "featureId": "uuid",
  "status": "running",
  "currentStage": "requirements_extracted",
  "stageResults": {
    "source_ingested": { "status": "completed", ... }
  },
  "questions": [],
  "blockedStage": null,
  "coverageGaps": null,
  "retryCount": 0,
  "maxRetries": 3,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### POST /api/pipeline/:slug/run

Запустить пайплайн.

**Response:** Pipeline object

### POST /api/pipeline/:slug/restart

Перезапустить пайплайн с указанного этапа.

**Request Body:**
```json
{
  "fromStage": "requirements_extracted"
}
```

**Response:** Pipeline object

### POST /api/pipeline/:slug/continue

Продолжить пайплайн с текущего этапа (после паузы).

**Response:** Pipeline object

### POST /api/pipeline/:slug/cancel

Отменить выполняющийся пайплайн.

**Response:** Pipeline object

### POST /api/pipeline/:slug/approve

Одобрить текущий gate (review, dry_run_completed, coverage_audited).

**Response:** Pipeline object

### POST /api/pipeline/:slug/answer

Ответить на вопросы и продолжить pipeline.

**Response:** Pipeline object

### POST /api/pipeline/:slug/restart-stage

Перезапустить конкретный этап. Удаляет результат этапа и запускает его заново.

**Request Body:**
```json
{
  "stage": "requirements_extracted"
}
```

**Response:** Pipeline object

### POST /api/pipeline/:slug/fill-gaps

Дополнить тест-кейсы для устранения пробелов в покрытии. Доступен только когда pipeline в статусе `waiting_for_qa` на этапе `coverage_audited`.

**Request Body:**
```json
{
  "gaps": ["REQ-001: нет тест-кейса на истечение SMS-кода", "REQ-003: нет негативного кейса"]
}
```

**Response:** Pipeline object

**Логика:**
1. LLM генерирует новые тест-кейсы для каждого gap (модель `test_cases_created`)
2. Новые кейсы объединяются с существующими (merge, перенумерация ID)
3. Автоматический переаудит покрытия (модель `coverage_audited`)
4. Если пробелы остались → `waiting_for_qa`, если нет → `completed`

**SSE события:**
- `pipeline:fill-gaps-started` — начало генерации
- `pipeline:fill-gaps-done` — завершение (триггерит обновление UI)

**Отличие от Restart stage:**
- Restart stage: удаляет все тест-кейсы → генерирует с нуля
- Fill gaps: сохраняет существующие кейсы → добавляет недостающие

## ENV переменные

```env
# Pipeline
PIPELINE_MAX_RETRIES=3
PIPELINE_RETRY_DELAY=2000
```

## Архитектура

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  Controller │────▶│   Service   │────▶│  InMemoryQueue  │
│  (HTTP)     │     │  (Business) │     │  (dev) / BullMQ │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                    │                    │
       │ approve/answer     │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Pipeline   │     │  Workflow   │     │  Processor  │
│  Service    │◀────│   Engine    │◀────│  (Worker)   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  LLM Service│
                     └─────────────┘
```

## Retry Logic

- **LLM этапы**: 3 попытки (PIPELINE_MAX_RETRIES), фиксированная задержка
- **TestRail sync**: 5 попыток (настраивается через ENV)
- **Невалидная модель (400)**: fast-fail, без ретраев

## Пример использования

```bash
# Запуск пайплайна
curl -X POST http://localhost:3000/api/pipeline/my-feature/run \
  -H "Authorization: Bearer <token>"

# Проверка статуса
curl http://localhost:3000/api/pipeline/my-feature/status \
  -H "Authorization: Bearer <token>"

# Отмена
curl -X POST http://localhost:3000/api/pipeline/my-feature/cancel \
  -H "Authorization: Bearer <token>"

# Одобрить gate
curl -X POST http://localhost:3000/api/pipeline/my-feature/approve \
  -H "Authorization: Bearer <token>"

# Ответить на вопросы
curl -X POST http://localhost:3000/api/pipeline/my-feature/answer \
  -H "Authorization: Bearer <token>"
```
