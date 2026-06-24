# TMS API

Универсальная интеграция с Test Management System.

## Поддерживаемые TMS

| TMS | Структура | Статус |
|-----|-----------|--------|
| TestRail | Project → Suite → Section | ✅ |
| Zephyr Scale | Project → Folder | ✅ |
| Test IT | Project → Test Plan → Test Suite | ✅ |
| TestLink | Project → Test Plan → Test Suite | ✅ |

## Schema-driven UI

Backend отдает schema, UI рендерит форму динамически:

```json
{
  "provider": "testrail",
  "name": "TestRail",
  "fields": [
    { "key": "project_id", "label": "Проект", "type": "select", "required": true },
    { "key": "suite_id", "label": "Suite", "type": "select", "dependsOn": "project_id" },
    { "key": "section_id", "label": "Секция", "type": "select", "dependsOn": "suite_id", "allowCreate": true }
  ]
}
```

### Типы полей

| Тип | Описание |
|-----|----------|
| `select` | Dropdown выбор |
| `tree` | Дерево (папки) |
| `input` | Текстовое поле |
| `multiselect` | Множественный выбор |

### Зависимости

Поле `dependsOn` определяет, когда поле отображается:
- Если `dependsOn: "project_id"` → поле показывается только после выбора проекта
- Options загружаются через `apiEndpoint` с подставленным значением

## Endpoints

### GET /api/tms/schema

Получить schema текущего TMS.

**Response:**
```json
{
  "provider": "testrail",
  "name": "TestRail",
  "fields": [...],
  "capabilities": {
    "supportsTestSteps": true,
    "supportsPreconditions": true,
    "supportsTags": false,
    "supportsAttachments": false
  }
}
```

### GET /api/tms/providers

Получить список доступных TMS и текущий.

**Response:**
```json
{
  "current": "testrail",
  "available": [
    { "id": "testrail", "name": "TestRail" },
    { "id": "zephyr", "name": "Zephyr" },
    { "id": "testit", "name": "Test IT" },
    { "id": "testlink", "name": "TestLink" }
  ]
}
```

### GET /api/tms/projects

Получить список проектов.

**Response:**
```json
[
  { "id": "1", "name": "Project 1" },
  { "id": "2", "name": "Project 2" }
]
```

### GET /api/tms/tree/:projectId

Получить дерево структуры (suites/folders/plans).

**Response:**
```json
[
  { "id": "1", "name": "Suite 1", "type": "suite", "parentId": "1" }
]
```

### POST /api/tms/publish

Опубликовать тест-кейсы.

**Request Body:**
```json
{
  "projectId": "1",
  "nodeId": "2",
  "testCases": [
    {
      "title": "Test Case 1",
      "description": "Description",
      "steps": [
        { "order": 1, "action": "Step 1", "expected": "Result 1" }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "publishedCount": 1,
  "nodeUrl": "https://testrail.example.com/..."
}
```

## ENV переменные

```env
# TMS Provider
TMS_PROVIDER=testrail

# TestRail
TESTRAIL_URL=https://yourcompany.testrail.io
TESTRAIL_API_KEY=your-api-key
TESTRAIL_MOCK=true

# Zephyr
ZEPHYR_URL=https://yourcompany.atlassian.net
ZEPHYR_API_TOKEN=your-token
ZEPHYR_MOCK=true

# Test IT
TESTIT_URL=https://yourcompany.testit.software
TESTIT_API_TOKEN=your-token
TESTIT_MOCK=true

# TestLink
TESTLINK_URL=https://yourcompany.testlink.org
TESTLINK_API_KEY=your-api-key
TESTLINK_MOCK=true
```

## Динамический UI

```vue
<DynamicTmsForm
  :feature-slug="featureSlug"
  ref="tmsForm"
/>

<button @click="publish">Опубликовать</button>
```

UI автоматически:
1. Загружает schema из `/api/tms/schema`
2. Рендерит поля согласно schema
3. Обрабатывает зависимости между полями
4. Запоминает последний выбор пользователя
