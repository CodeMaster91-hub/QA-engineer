# LLM Config

Конфигурация AI-моделей для пайплайна QA-платформы.

## Алиасы моделей

Используйте алиасы для работы с LLM. Каждый провайдер определяет свои алиасы.

**Примеры алиасов:**

| Алиас | Назначение |
|-------|-----------|
| `default` | Модель по умолчанию |
| `smart` | Умная модель (сложные задачи) |
| `fast` | Быстрая модель (простые задачи) |
| `dev` | Для разработки |
| `prod` | Для продакшена |

**Важно:** Не используйте конкретные имена физических моделей. Алиасы - точка совместимости.

## Модель

### AgentConfig

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Идентификатор |
| stage | enum | Этап пайплайна |
| alias | string | Алиас модели |
| provider | string | Провайдер |
| temperature | decimal | Температура (0-2) |
| maxTokens | int | Макс. токенов |
| enabled | boolean | Включена ли конфигурация |

**Этапы пайплайна:**
- `requirements_extracted` - Извлечение требований
- `draft_created` - Создание черновика
- `coverage_audited` - Аудит покрытия
- `review` - Ревью
- `dry_run` - Пробный запуск

## Endpoints

### GET /api/agents/config

Получить конфигурацию всех этапов.

**Response:** AgentConfig[]

### PATCH /api/agents/config/:stage

Обновить конфигурацию этапа. Требуется роль `admin`.

**Request Body:**
```json
{
  "alias": "smart",
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
    "id": "custom",
    "name": "Custom LLM",
    "aliases": ["default", "smart", "fast"]
  }
]
```

## Конфигурация по умолчанию

| Этап | Temperature | MaxTokens |
|------|-------------|-----------|
| requirements_extracted | 0.1 | 4096 |
| draft_created | 0.2 | 8192 |
| coverage_audited | 0.2 | 4096 |
| review | 0.1 | 4096 |
| dry_run | 0.1 | 4096 |

Алиасы для каждого этапа настраиваются через ENV переменные.

## ENV переменные

```env
# LLM Provider
LLM_BASE_URL=https://your-llm-provider.com/v1
LLM_API_KEY=your-api-key
LLM_MOCK=true

# LLM Provider Info
LLM_PROVIDER_ID=custom
LLM_PROVIDER_NAME=Custom LLM

# LLM Model Aliases
LLM_DEFAULT_ALIAS=default
LLM_ALIAS_REQUIREMENTS=default
LLM_ALIAS_DRAFT=default
LLM_ALIAS_COVERAGE=default
LLM_ALIAS_REVIEW=default
LLM_ALIAS_DRY_RUN=default
```

## Интеграция

### Использование LLMService

```typescript
import { LLMService } from '../agents/llm.service';
import { PipelineStage } from '../agents/agent-config.entity';

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

### Для вашего LLM провайдера

1. Узнайте доступные алиасы у вашего провайдера
2. Настройте ENV переменные:
```env
LLM_BASE_URL=https://your-provider.com/v1
LLM_API_KEY=your-key
LLM_DEFAULT_ALIAS=your-default-alias
LLM_ALIAS_REQUIREMENTS=your-smart-alias
LLM_ALIAS_DRAFT=your-fast-alias
```

3. При необходимости обновите конфигурацию через API:
```bash
curl -X PATCH http://localhost:3000/api/agents/config/requirements_extracted \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"alias": "your-smart-alias"}'
```
