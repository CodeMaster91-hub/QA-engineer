# TestRail API

Интеграция с TestRail для публикации тест-кейсов.

## Endpoints

### GET /api/testrail/projects

Получить список проектов TestRail.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Project Name",
    "announcement": "...",
    "is_completed": false
  }
]
```

### GET /api/testrail/projects/:projectId/suites

Получить список suites проекта.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Suite Name",
    "project_id": 1
  }
]
```

### GET /api/testrail/projects/:projectId/suites/:suiteId/sections

Получить список секций suite.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Section Name",
    "suite_id": 1,
    "description": "..."
  }
]
```

### POST /api/testrail/projects/:projectId/suites/:suiteId/sections

Создать секцию. Требуется роль `admin`.

**Request Body:**
```json
{
  "name": "New Section",
  "description": "Optional description"
}
```

### POST /api/testrail/:slug/dry-run

Пробный запуск публикации (без реальной отправки).

**Request Body:**
```json
{
  "projectId": 1,
  "suiteId": 1
}
```

Если projectId/suiteId не указаны, используются значения из ENV.

**Response:**
```json
{
  "jobId": "uuid",
  "message": "Dry run started"
}
```

### POST /api/testrail/:slug/publish

Опубликовать тест-кейсы в TestRail.

**Request Body:**
```json
{
  "projectId": 1,
  "suiteId": 1,
  "sectionId": 1
}
```

Если projectId/suiteId не указаны, используются значения из ENV.

**Response:**
```json
{
  "jobId": "uuid",
  "message": "Publish started"
}
```

### GET /api/testrail/jobs/:jobId/status

Получить статус задачи публикации.

**Response:**
```json
{
  "id": "uuid",
  "status": "completed",
  "progress": 100,
  "data": {
    "featureSlug": "my-feature",
    "sectionId": 1,
    "casesPublished": 15
  }
}
```

## ENV переменные

```env
# TestRail Connection
TESTRAIL_URL=https://yourcompany.testrail.io
TESTRAIL_EMAIL=your-email@example.com
TESTRAIL_API_KEY=your-api-key
TESTRAIL_MOCK=true

# TestRail Default Destination (куда публикация по умолчанию)
TESTRAIL_PROJECT_ID=1
TESTRAIL_SUITE_ID=1
TESTRAIL_SECTION_ID=  # опционально, если пусто - создается новая секция
```

### Описание переменных

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `TESTRAIL_URL` | URL TestRail | Да |
| `TESTRAIL_EMAIL` | Email аккаунта TestRail (для Basic Auth) | Да |
| `TESTRAIL_API_KEY` | API ключ TestRail | Да |
| `TESTRAIL_MOCK` | Режим mock (true/false) | Нет (default: true) |
| `TESTRAIL_PROJECT_ID` | ID проекта по умолчанию | Нет |
| `TESTRAIL_SUITE_ID` | ID suite по умолчанию | Нет |
| `TESTRAIL_SECTION_ID` | ID секции по умолчанию | Нет |

Если `TESTRAIL_PROJECT_ID` и `TESTRAIL_SUITE_ID` не заданы, при публикации их нужно указывать в request body.

## Retry Logic

- **Dry run**: 1 попытка
- **Publish**: 5 попыток, exponential backoff (2s, 4s, 8s, 16s, 32s)

## Пример использования

```bash
# Получить проекты
curl http://localhost:3000/api/testrail/projects \
  -H "Authorization: Bearer <token>"

# Пробная публикация (с дефолтными из ENV)
curl -X POST http://localhost:3000/api/testrail/my-feature/dry-run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Пробная публикация (с явным указанием)
curl -X POST http://localhost:3000/api/testrail/my-feature/dry-run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"projectId": 1, "suiteId": 1}'

# Публикация
curl -X POST http://localhost:3000/api/testrail/my-feature/publish \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Проверка статуса
curl http://localhost:3000/api/testrail/jobs/<jobId>/status \
  -H "Authorization: Bearer <token>"
```

## Архитектура

```
Controller → Queue (BullMQ) → Processor → TestRailService → TestRail API
```

## Mock режим

В режиме mock (`TESTRAIL_MOCK=true`) все операции возвращают фиктивные данные без реального обращения к TestRail API.
