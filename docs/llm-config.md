# LLM Config

Конфигурация AI-моделей для пайплайна QA-платформы.

## Модель

### LLM_MODEL (основная)

Одна переменная для всех стадий пайплайна:

```env
LLM_MODEL=your-model-id
```

Если `LLM_MODEL` задана, она используется как модель по умолчанию для всех этапов.

### Приоритет разрешения модели

```
LLM_ALIAS_<STAGE> (override для стадии)
  → LLM_MODEL (основная модель)
    → LLM_DEFAULT_ALIAS (legacy fallback)
```

### AgentConfig

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Идентификатор |
| stage | enum | Этап пайплайна |
| alias | string | Модель (алиас) |
| provider | string | Провайдер |
| temperature | decimal | Температура (0-2) |
| maxTokens | int | Макс. токенов |
| enabled | boolean | Включена ли конфигурация |

**Этапы пайплайна:**
- `requirements_extracted` — Извлечение требований
- `test_plan_created` — Создание тест-плана
- `test_cases_created` — Создание тест-кейсов
- `coverage_audited` — Аудит покрытия
- `review` — Ревью
- `dry_run_completed` — Пробный запуск

## Endpoints

### GET /api/agents/config

Получить конфигурацию всех этапов.

**Response:** AgentConfig[]

### PATCH /api/agents/config/:stage

Обновить конфигурацию этапа. Требуется роль `admin`.

**Request Body:**
```json
{
  "alias": "your-model-id",
  "temperature": 0.2,
  "maxTokens": 8192,
  "enabled": true
}
```

**Response:** AgentConfig object

### GET /api/agents/providers

Получить список доступных провайдеров.

**Response:**
```json
[
  {
    "id": "your-provider-id",
    "name": "Your Provider",
    "aliases": ["your-model-id"]
  }
]
```

## Конфигурация по умолчанию

| Этап | Temperature | MaxTokens |
|------|-------------|-----------|
| requirements_extracted | 0.1 | 4096 |
| test_plan_created | 0.2 | 8192 |
| test_cases_created | 0.2 | 8192 |
| coverage_audited | 0.2 | 4096 |
| review | 0.1 | 4096 |
| dry_run_completed | 0.1 | 4096 |

При запуске сервера конфиги синхронизируются из ENV переменных (seed + sync).

## ENV переменные

```env
# LLM Provider
LLM_BASE_URL=https://your-llm-provider.com/v1
LLM_API_KEY=your-api-key
LLM_MODEL=your-model-id
LLM_MOCK=false

# LLM Provider Info
LLM_PROVIDER_ID=your-provider-id
LLM_PROVIDER_NAME=Your Provider

# Per-stage override (опционально, fallback → LLM_MODEL)
LLM_ALIAS_REQUIREMENTS=your-model-id
LLM_ALIAS_TEST_PLAN=your-model-id
LLM_ALIAS_TEST_CASES=your-model-id
LLM_ALIAS_COVERAGE=your-model-id
LLM_ALIAS_REVIEW=your-model-id
LLM_ALIAS_DRY_RUN=your-model-id

# Legacy fallback
LLM_DEFAULT_ALIAS=your-model-id
```

## Интеграция

### Использование LLMService

```typescript
import { LLMService } from '../agents/llm.service';
import { PipelineStage } from '../pipeline/pipeline.entity';

@Injectable()
export class PipelineService {
  constructor(private llmService: LLMService) {}

  async extractRequirements(text: string) {
    const response = await this.llmService.complete(
      PipelineStage.REQUIREMENTS_EXTRACTED,
      [
        { role: 'system', content: 'Извлеки требования из текста' },
        { role: 'user', content: text },
      ],
    );
    return response.content;
  }
}
```

## Примеры конфигурации

### OpenRouter (пример)

```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-v1-...
LLM_MODEL=your-model-id
```

### Разные модели для разных этапов

```env
LLM_MODEL=your-default-model
LLM_ALIAS_REQUIREMENTS=your-smart-model
LLM_ALIAS_TEST_PLAN=your-fast-model
```

### Dev-режим (mock)

```env
LLM_MOCK=true
```

## Промпты этапов

### test_cases_created (fill-gaps)

Используется при генерации дополнительных тест-кейсов через `POST /api/pipeline/:slug/fill-gaps`.

**Входные данные:** `requirements`, `gaps`, `existingCases` (полный список существующих кейсов).

**Ключевые правила:**
- LLM видит все существующие кейсы — создаёт новый только если gap не покрыт
- Группирует похожие кейсы в один с несколькими шагами (валидация полей, негативные сценарии одного модуля)
- Не создаёт кейсы с одним шагом

### coverage_audited

Аудит покрытия требований тест-кейсами.

**Ключевые правила:**
- "Covered" = есть хотя бы один тест-кейс, чьи шаги (steps) проверяют требование
- В gaps добавляет ТОЛЬКО аспекты, которых действительно нет ни в одном тест-кейсе
- НЕ добавляет гипотетические edge cases, не упомянутые в требовании
- Анализирует шаги (steps) каждого тест-кейса, а не только заголовок
- Не дублирует gaps из предыдущих раундов, если они закрыты новыми кейсами

### review

Ревью тест-кейсов. Возвращает структурированный отчёт.

**Входные данные:** `testCases`, `coverage`.

**Структура ответа (review артефакт):**
```json
{
  "summary": "Краткое резюме...",
  "overall_quality": "high",
  "strengths": ["Хорошая группировка", "Полное покрытие"],
  "weaknesses": ["REQ-003 покрыто частично"],
  "recommendations": ["Добавить негативные кейсы"]
}
```

### Pipeline processor — порядок событий

`pipeline.processor.ts` эмитит `pipeline:progress` (running) **до** `executeStage()`.
Это гарантирует, что UI покажет спиннер на этапе до завершения LLM-вызова.
После `handleStageResult()` статус обновится до `waiting_for_qa` / `blocked` / `completed`.
