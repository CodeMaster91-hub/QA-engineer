# Features API

Управление фичами и артефактами QA-платформы.

## Модели

### Feature

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Идентификатор |
| slug | string | Уникальный slug фичи |
| title | string | Название фичи |
| status | enum | Статус фичи |
| sourceType | string | Тип источника (text/file/url) |
| sourceFileName | string | Имя загруженного файла |
| artifacts | FeatureArtifact[] | Артефакты фичи |
| createdAt | Date | Дата создания |
| updatedAt | Date | Дата обновления |

**Статусы:**
- `new` - Создана, не обработана
- `ingested` - Источник загружен
- `processing` - В обработке
- `completed` - Обработка завершена
- `failed` - Ошибка обработки

### FeatureArtifact

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Идентификатор |
| featureId | uuid | FK на Feature |
| type | enum | Тип артефакта |
| content | JSONB | Содержимое артефакта |
| createdAt | Date | Дата создания |
| updatedAt | Date | Дата обновления |

**Типы артефактов:**
- `source` - Исходный бандл требований
- `requirements` - Карта требований
- `testcases` - Тест-кейсы
- `coverage` - Матрица покрытия
- `review` - Результат ревью
- `dry_run` - Результат пробного запуска

**Структура content для source:**
```json
{
  "text": "Текст требований",
  "images": [
    {
      "data": "base64...",
      "mimeType": "image/png",
      "name": "image_0.png"
    }
  ],
  "metadata": {
    "filename": "requirements.pdf",
    "type": "pdf",
    "pages": 10
  }
}
```

**Структура content для requirements:**
```json
{
  "requirements": [
    {
      "id": "REQ-001",
      "title": "Регистрация через email",
      "description": "Пользователь может зарегистрироваться...",
      "priority": "high",
      "type": "functional"
    }
  ]
}
```

**Структура content для testcases:**
```json
{
  "test_plan_markdown": "# Тест план\n\n## Регистрация...",
  "cases": [
    {
      "id": "TC-001",
      "title": "Успешная регистрация",
      "status": "draft",
      "requirement_ids": ["REQ-001"],
      "steps": [
        { "action": "Открыть форму", "expected": "Форма отображается" }
      ]
    }
  ]
}
```

**Структура content для coverage:**
```json
{
  "coverage": {
    "requirements_coverage": [
      {
        "requirement_id": "REQ-001",
        "status": "Covered",
        "covered_by": ["TC-001"],
        "notes": ""
      }
    ]
  },
  "coverage_matrix_markdown": "| REQ | Status | Covered by |\n|-----|--------|------------|\n| REQ-001 | Covered | TC-001 |"
}
```

## Endpoints

### GET /api/features

Получить список фич с пагинацией.

**Query Parameters:**
- `page` (number, default: 1) - Номер страницы
- `limit` (number, default: 20) - Количество на странице

**Response:**
```json
{
  "data": [...],
  "total": 100
}
```

### POST /api/features

Создать новую фичу вручную. Требуется роль `admin`.

**Request Body:**
```json
{
  "slug": "user-registration",
  "title": "Регистрация пользователя"
}
```

**Response:** Feature object

### POST /api/features/create-with-source

Создать фичу с автоматической обработкой источника. Title и slug генерируются автоматически на основе содержимого.

**Request Body (multipart/form-data):**

| Поле | Тип | Описание |
|------|-----|----------|
| sourceType | string | "text", "file" или "url" |
| sourceText | string | Текст требований (для sourceType=text) |
| sourceUrl | string | URL страницы (для sourceType=url) |
| file | binary | Файл (для sourceType=file) |

**Поддерживаемые форматы файлов:** PDF, DOCX, XLSX, CSV, TXT, MD

**Лимит размера файла:** 10MB (настраивается через MAX_FILE_SIZE)

**Примеры запросов:**

Текстовый источник:
```bash
curl -X POST /api/features/create-with-source \
  -H "Authorization: Bearer <token>" \
  -F "sourceType=text" \
  -F "sourceText=Регистрация пользователя через email..."
```

Файл:
```bash
curl -X POST /api/features/create-with-source \
  -H "Authorization: Bearer <token>" \
  -F "sourceType=file" \
  -F "file=@requirements.pdf"
```

URL:
```bash
curl -X POST /api/features/create-with-source \
  -H "Authorization: Bearer <token>" \
  -F "sourceType=url" \
  -F "sourceUrl=https://wiki.example.com/requirements"
```

**Response:**
```json
{
  "feature": {
    "id": "...",
    "slug": "автогенерированный-slug",
    "title": "Автогенерированное название",
    "status": "new",
    "sourceType": "file",
    "sourceFileName": "requirements.pdf"
  },
  "preview": "Первые 500 символов текста..."
}
```

### GET /api/features/:slug

Получить фичу по slug со всеми артефактами.

**Response:** Feature object с artifacts

### DELETE /api/features/:slug

Удалить фичу и все артефакты. Требуется роль `admin`.

**Response:** 204 No Content

### GET /api/features/:slug/artifacts

Получить все артефакты фичи.

**Response:** FeatureArtifact[]

### GET /api/features/:slug/artifacts/:type

Получить артефакт по типу.

**Response:** FeatureArtifact object

### POST /api/features/:slug/artifacts

Создать или обновить артефакт (upsert по featureId + type).

**Request Body:**
```json
{
  "type": "requirements",
  "content": {
    "requirements": [
      { "id": "REQ-001", "title": "Требование 1" }
    ]
  }
}
```

**Response:** FeatureArtifact object

## ENV Variables

| Переменная | Описание | Дефолт |
|------------|----------|--------|
| MAX_FILE_SIZE | Максимальный размер файла в байтах | 10485760 (10MB) |

## Примеры использования

### Создание фичи через UI

1. Нажать "+ Новая фича"
2. Выбрать тип источника: Текст / Файл / Ссылка
3. Ввести текст, загрузить файл или указать URL
4. Нажать "Создать и запустить"
5. Pipeline запустится автоматически

### API вызов для создания фичи

```typescript
const formData = new FormData();
formData.append('sourceType', 'file');
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/features/create-with-source', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: formData
});

const { feature, preview } = await response.json();
console.log(`Фича создана: ${feature.slug}`);
```
