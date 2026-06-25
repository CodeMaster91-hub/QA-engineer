# Процесс доработки в QA-engineer

## Сценарий 1: Добавление новой фичи

### Задача от тимлида
> "Нужно добавить возможность экспорта тесткейсов в CSV"

### Шаг 1: Открываешь AGENTS.md

Читаешь структуру проекта, понимаешь где что находится:
- Backend: `apps/backend/src/`
- Тесты: `test/`
- Документация: `docs/`

### Шаг 2: Создаёшь ветку

```bash
git checkout -b feature/csv-export
```

### Шаг 3: Реализуешь

**Создаёшь сервис:**
```typescript
// apps/backend/src/features/csv-export.service.ts
@Injectable()
export class CsvExportService {
  constructor(private readonly featuresService: FeaturesService) {}

  async exportFeature(slug: string): Promise<string> {
    // Логика экспорта
  }
}
```

**Добавляешь эндпоинт:**
```typescript
// apps/backend/src/features/features.controller.ts
@Get(':slug/export/csv')
async exportCsv(@Param('slug') slug: string) {
  const csv = await this.csvExportService.exportFeature(slug);
  return { data: csv, filename: `${slug}-testcases.csv` };
}
```

### Шаг 4: Запускаешь subagent для документации

```
@docs-maintainer обнови docs/areas/backend-api-structure.md
```

Subagent автоматически:
- Находит новый эндпоинт
- Обновляет таблицу API endpoints
- Добавляет описание в документацию

### Шаг 5: Пишешь тесты

**Unit тест:**
```typescript
// test/unit/csv-export.service.test.ts
describe('CsvExportService', () => {
  it('should export feature to CSV', async () => {
    // Тест логики экспорта
  });
});
```

**Integration тест:**
```typescript
// test/integration/csv-export-api.test.ts
describe('GET /api/features/:slug/export/csv', () => {
  it('should return CSV file', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/features/test-feature/export/csv')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toContain('Test Case');
  });
});
```

### Шаг 6: Запускаешь тесты

```bash
npm run test
```

Если тесты падают — исправляешь. Если всё зелёное — идёшь дальше.

### Шаг 7: Запускаешь валидацию схем

```bash
node scripts/validate-schemas.mjs
```

### Шаг 8: Мержишь в main

```bash
git checkout main
git merge feature/csv-export
git push
```

### Шаг 9: CI/CD автоматически

1. Запускает тесты
2. Собирает Docker image
3. Деплоит через Helm

**Итого: 2-4 часа на простую фичу**

---

## Сценарий 2: Исправление бага

### Задача
> "Пайплайн падает на этапе coverage_audited с ошибкой JSON schema"

### Шаг 1: Читаешь логи

```
@server-operator покажи последние 50 строк logs/backend.log
```

### Шаг 2: Исправляешь

Находишь ошибку в `apps/backend/src/pipeline/workflow-engine.ts`.

### Шаг 3: Пишешь тест на баг

```typescript
// test/integration/pipeline-bug.test.ts
describe('Pipeline bug fix', () => {
  it('should handle coverage_audited stage correctly', async () => {
    // Воспроизводишь баг
  });
});
```

### Шаг 4: Запускаешь тесты

```bash
npm run test
```

### Шаг 5: Обновляешь golden master если нужно

```bash
node scripts/collect-golden-master.mjs
```

### Шаг 6: Мержишь

```bash
git checkout main
git merge bugfix/pipeline-coverage
git push
```

**Итого: 1-2 часа на баг**

---

## Сценарий 3: Обновление конфигурации агента

### Задача
> "Нужно сменить модель для этапа requirements_extracted с qwen-72b на gpt-4"

### Шаг 1: Через API

```bash
curl -X PATCH http://localhost:3000/api/agents/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"stages": {"requirements_extracted": {"model": "gpt-4"}}}'
```

### Шаг 2: Или через UI

1. Заходишь в Admin → Agents Config
2. Меняешь модель для requirements_extracted
3. Сохраняешь

**Итого: 5 минут**

---

## Сценарий 4: Деплой на продакшен

### Шаг 1: Обновляешь version

```bash
# В package.json backend
"version": "1.2.0"
```

### Шаг 2: Коммитишь

```bash
git add .
git commit -m "chore: bump version to 1.2.0"
git push
```

### Шаг 3: CI/CD автоматически

1. Запускает тесты
2. Собирает Docker image с тегом `1.2.0`
3. Пушит в registry
4. Обновляет Helm chart

### Шаг 4: Деплоишь через Helm

```bash
helm upgrade qa-engineer ./helm \
  --set image.tag=1.2.0 \
  -n qa-platform
```

### Шаг 5: Проверяешь

```bash
curl http://localhost:3000/api/health/ready
```

**Итого: 10 минут**

---

## Сценарий 5: Добавление нового агента

### Задача
> "Нужно добавить агента для генерации unit тестов"

### Шаг 1: Создаёшь промпт

```markdown
# qa-ai-agents/agents/unit-test-generator.md

## Role
Unit Test Generator Agent

## Instructions
Generate unit tests for the given module...
```

### Шаг 2: Добавляешь stage в пайплайн

```typescript
// apps/backend/src/pipeline/workflow-stages.ts
export const STAGE_ORDER = [
  'new',
  'source_ingested',
  'requirements_extracted',
  'test_plan_created',
  'test_cases_created',
  'coverage_audited',
  'unit_tests_generated',  // Новый этап
  'review',
  'dry_run_completed',
  'published',
];
```

### Шаг 3: Добавляешь конфигурацию

```typescript
// apps/backend/src/agents/agents.service.ts
const defaultConfigs = [
  // ... существующие
  {
    stage: 'unit_tests_generated',
    provider: 'internal-llm',
    model: 'fast-model',
    temperature: 0.2,
    enabled: true,
  },
];
```

### Шаг 4: Пишешь тесты

```typescript
// test/integration/unit-test-generator.test.ts
describe('Unit test generator stage', () => {
  it('should generate unit tests for a module', async () => {
    // Тест нового этапа
  });
});
```

### Шаг 5: Обновляешь документацию

```
@docs-maintainer обнови docs/sub-agents.md
```

**Итого: 3-4 часа**

---

## Сценарий 6: Исправление проблемы на продакшене

### Проблема
> "Пайплайн завис на этапе test_plan_created, не завершается"

### Шаг 1: Диагностика

```bash
# Проверяем логи
@server-operator покажи последние 100 строк logs/backend.log | grep -i "test_plan_created"

# Проверяем статус Redis очереди
@server-operator выполни: redis-cli LLEN bull:pipeline:wait
```

### Шаг 2: Определяешь причину

LLM сервер не отвечает, job завис в Redis.

### Шаг 3: Отменяешь зависший job

```bash
curl -X POST http://localhost:3000/api/pipeline/my-feature/cancel \
  -H "Authorization: Bearer <token>"
```

### Шаг 4: Перезапускаешь

```bash
curl -X POST http://localhost:3000/api/pipeline/my-feature/restart \
  -H "Authorization: Bearer <token>" \
  -d '{"fromStage": "test_plan_created"}'
```

### Шаг 5: Исправляешь корневую причину

Если проблема повторяется — добавляешь retry logic или увеличиваешь timeout.

**Итого: 30 минут — 2 часа**

---

## Инструменты

| Задача | Инструмент |
|--------|------------|
| Найти файл | `@explore найди где определен TestSuiteEntity` |
| Обновить документацию | `@docs-maintainer обнови docs` |
| Запустить тесты | `npm run test` |
| Проверить логи | `@server-operator покажи logs/backend.log` |
| Деплой | `helm upgrade qa-engineer ./helm -n qa-platform` |
| Проверить health | `curl http://localhost:3000/api/health/ready` |

---

## Время на типичные задачи

| Задача | Время |
|--------|-------|
| Мелкий баг | 1-2 часа |
| Новая фича (простая) | 2-4 часа |
| Новая фича (сложная) | 4-8 часов |
| Новый агент/этап | 3-4 часа |
| Обновление конфигурации | 5 минут |
| Деплой | 10 минут |
| Исправление на продакшене | 30 мин — 2 часа |
