# AGENTS.md - Универсальные инструкции для AI-агентов

## Контекст проекта

QA-платформа для автоматизированного тестирования требований. Стек: Nest.js 11 + Vue 3 + PostgreSQL + BullMQ (production) / In-memory queue (dev).

## Ключевые принципы

1. **Безопасность**: Никогда не коммитьте секреты, ключи API, пароли
2. **Типизация**: Всегда используйте строгую типизацию TypeScript
3. **Анализ перед реализацией**: При доработках/новом функционале сначала проанализировать код, предложить план, реализовывать только после одобрения
4. **Документирование**: Всегда документировать новые фичи и доработки
5. **Коммит без пуша**: Коммитить изменения, но не пушить. Пуш только по команде пользователя
3. **Тесты**: Пишите unit + integration тесты для нового кода
4. **Документация**: Обновляйте README и docs/ при изменении API

## Структура проекта

```
apps/
├── backend/src/
│   ├── auth/           - Authentik OIDC + JWT
│   ├── users/          - Управление пользователями
│   ├── features/       - Фичи и артефакты
│   ├── agents/         - AI-агенты и конфигурация
│   ├── pipeline/       - Оркестрация пайплайнов (PipelineStage enum — единый источник)
│   ├── testrail/       - Интеграция с TestRail
│   ├── tms/            - TMS адаптеры (TestRail, Zephyr, TestIT, TestLink)
│   ├── events/         - Внутренние события (backend-only, Redis Pub/Sub)
│   ├── health/         - Health check
│   └── common/         - InMemoryQueue, Tenant, FileProcessor, UrlFetcher
└── frontend/src/
    ├── api/            - API client (fetch, не axios) и типы
    ├── components/     - Vue компоненты
    │   ├── Sidebar.vue - Левое меню (список фич, polling, collapse)
    │   ├── stages/     - Stage-компоненты (Requirements, TestPlan, TestCases, etc.)
    │   └── __tests__/  - Тесты компонентов
     ├── composables/    - Vue composables (useSse, useTestCases)
    ├── utils/          - Утилиты (markdown renderer)
    ├── views/          - Vue страницы
    └── router/         - Vue Router
```

## Команды

```bash
npm run dev:backend   - Запуск backend в dev режиме
npm run dev:frontend  - Запуск frontend в dev режиме
npm run build         - Сборка всего проекта
npm run test          - Запуск тестов
npm run lint          - Проверка стиля кода
```

## Конвенции

- Файлы: `kebab-case.ts`
- Классы: `PascalCase`
- API endpoints: `/api/[resource]`
- ENV vars: `UPPER_SNAKE_CASE`
- Vue components: `PascalCase.vue`
- Stage components: `[StageName]Stage.vue`
- **PipelineStage enum**: единый `pipeline/pipeline.entity.ts`, импортировать отовсюду

## Pipeline

Backend: 9 stages, UI: 7 stages (без `new` и `source_ingested`). Этапы `new` и `source_ingested` не отображаются в UI.

```
new → source_ingested → requirements_extracted → test_plan_created
→ test_cases_created → coverage_audited → review → dry_run_completed → published
```

Статусы: `idle`, `running`, `blocked`, `waiting_for_qa`, `paused`, `completed`, `failed`, `cancelled`.

Approval gates: `review` (hard stop), `dry_run_completed` (hard stop), `coverage_audited` (gaps → waiting).

Restart stage: перезапуск конкретного этапа (`POST /pipeline/:slug/restart-stage`). Удаляет результат только этого этапа.

Questions persistence: вопросы сохраняются в `pipeline.questions` и остаются как артефакт после continue/approve.

Answer Questions: `answerQuestions()` переводит pipeline на **следующий stage**, не перезапуская текущий. LLM получает контекст существующих артефактов (REQ и т.д.) при restart.

Requirements restart: при перезапуске `requirements_extracted` LLM получает существующие требования и должен вернуть их БЕЗ ИЗМЕНЕНИЙ, если всё покрыто. Дублирование запрещено.

### Source Refresh при Restart Requirements

При перезапуске этапа `requirements_extracted` источник перечитывается из оригинала:

- **URL** (`sourceType === 'url'`): автоматически рефетчится через `UrlFetcherService.fetchUrl()`, source artifact обновляется, LLM получает свежий контент. Модалка НЕ показывается.
- **Text** (`sourceType === 'text'`): показывается модалка с textarea для ввода обновлённого текста → `POST /features/:slug/source` → restart.
- **File** (`sourceType === 'file'`): показывается модалка с file dropzone для загрузки нового файла → `POST /features/:slug/source` → restart.

Feature entity хранит `sourceUrl` для возможности рефетча. Endpoint `POST /features/:slug/source` обновляет source artifact через `FeaturesService.updateSource()`.

### Dry Run — Пробный запуск

Этап `dry_run_completed` (hard stop) распределяет тест-кейсы по секциям TMS:
- Запрашивает существующие секции через `TmsService.getTree()`
- LLM распределяет кейсы по секциям (существующие или новые)
- Кейсы со статусом `approved` публикуются, `draft` — остаются как черновики
- Артефакт `dry_run` содержит: `{ sections: { existing, new }, cases: [], summary: {} }`

## Артефакты

| Тип | Формат | Рендер |
|-----|--------|--------|
| source | `{ text, images }` | markdown → HTML |
| requirements | `{ requirements: [] }` | JSON → таблица |
| testplan | `{ test_plan_markdown }` | markdown → HTML |
| testcases | `{ cases: [] }` | Split layout: список слева, редактор справа |
| coverage | `{ coverage, coverage_matrix_markdown, gaps }` | JSON + markdown |
| review | `{ ... }` | JSON |
| dry_run | `{ sections: { existing, new }, cases: [], summary: {} }` | Summary cards + таблица + секции |

## UI-паттерны

### Sticky Panel Header

Все stage-компоненты используют паттерн `panel-header` + `panel-body`:
- `.stage-panel` → `overflow: hidden`, `padding: 0`
- `.panel-header` → `flex-shrink: 0`, `border-bottom` — заголовок зафиксирован
- `.panel-body` → `flex: 1`, `overflow-y: auto` — только контент скроллится

Исключение: `RequirementsStage` — два side-by-side panel через `.split-container`.

### RequirementsStage — Loading State

`RequirementsStage` показывает источник (левая панель) даже пока LLM работает:
- **Left panel**: всегда показывает `sourceArtifact` (текст + изображения)
- **Right panel**: показывает loading-заглушку пока `isProcessing=true` и нет требований
- **isProcessing**: `true` когда `pipeline.status === 'running' && currentStage === 'requirements_extracted'` и артефакт `requirements` ещё не создан
- После завершения LLM: требования появляются в правой панели, loading-заглушка исчезает

### TestCasesStage — Split Layout

`TestCasesStage` использует split layout для редактирования тест-кейсов:
- **Левая панель (40%)**: кликабельный список кейсов (id, title, steps count, status badge)
- **Правая панель (60%)**: форма редактирования "Редактирование кейса"
- **Композабл `useTestCases`**: управление состоянием, snapshot для отслеживания изменений, save/delete
- **Steps**: горизонтальные поля (action + expected), кнопки ↑↓ для перемещения, ✕ удалить, "+ Добавить шаг"
- **Теги/Requirements/TestData**: inline input с Enter для добавления, ✕ для удаления
- **Кнопки внизу**: "Сохранить" (активна при изменениях) и "Удалить" (справа)

### Обновление статуса (HTTP Polling)

SSE на фронтенде удалён. Вместо этого — **HTTP polling** с единым endpoint:

- **Endpoint**: `GET /api/features/:slug` возвращает `{ feature, pipeline }` (артефакты в `feature.artifacts`)
- **Polling** в `FeatureDetailView.vue`:
  - `setInterval` с настраиваемым интервалом (по умолчанию 5 секунд)
  - Активен только пока `pipeline.status === 'running'`
  - Автоматически останавливается при `completed | failed | cancelled`
  - Интервал настраивается в `Settings → Интерфейс → poll_interval` (5-120 секунд)
- **После действий**: все обработчики (run, cancel, restart, approve, answer, restart-stage, fill-gaps) вызывают `loadAll()` — единую функцию, которая делает один запрос и обновляет feature + pipeline + artifacts в одном render-tick

### UI-настройки (localStorage)

Настройки интерфейса хранятся в `localStorage` (не в БД):
| Ключ | Тип | По умолчанию | Описание |
|------|-----|-------------|----------|
| `show_logs` | boolean | `true` | Показывать/скрывать секцию логов (`Settings → Интерфейс`) |
| `poll_interval` | number (5-120) | `15` | Интервал HTTP-опроса статуса пайплайна в секундах |

## Features

- **Slug generation**: `generateFallbackSlug()` транслитерирует кириллицу → lowercase → замена пробелов на `-` → обрезка до 50 символов
- **Уникальность slug**: `generateUniqueSlug()` проверяет БД и добавляет суффикс `-2`, `-3`, etc. при повторных загрузках того же источника
- **createWithSource()**: автоматически генерирует уникальный slug, каждая фича полностью изолирована
- **create()**: ручное создание через `POST /features` — slug передаётся явно, дубликат → ConflictException

## LLM и очередь

### LLMService

- **LLMService.complete()** принимает `PipelineStage` (строку-enum) в качестве первого аргумента — НЕ объект
- **InMemoryQueue**: кастомная очередь в памяти для dev; BullMQ — для production (Redis обязателен)
- **LLM_MOCK=true**: моковые ответы для разработки без реального LLM
- **ioredis**: динамический импорт, не в package.json — Redis работает только если пакет установлен вручную

### Health-check при старте

`LLMService.onModuleInit()` выполняет GET `${baseUrl}/models` с таймаутом 5s:
- `200` → `[LOG] LLM endpoint reachable: ${baseUrl}/models`
- Ошибка → `[WARN] LLM endpoint unreachable: ${baseUrl} — ...`
- Не блокирует startup — только предупреждение
- Пропускается при `LLM_MOCK=true`

### Timeout

`LLM_TIMEOUT` (env, default `60000` ms) — таймаут каждого запроса к LLM. Устанавливается через `AbortSignal.timeout`.

### Сетевые ошибки

В `complete()` ошибки `fetch` логируются с расшифровкой `error.cause`:
| Ситуация | Сообщение |
|----------|-----------|
| Неверный IP/hostname (таймаут) | `Connection timeout (host unreachable or wrong IP/hostname)` |
| Сервер слишком медленный | `Response timeout (server too slow)` |
| Сервер не запущен/не тот порт | `Connection refused (server not running or wrong port)` |
| Hostname не найден | `DNS resolution failed (hostname not found)` |
| Прочее | `error.code: error.message` |

## TMS / TestRail

- **Auth**: Basic Auth с форматом `email:api_key` (НЕ `api:api_key`). Требуется `TESTRAIL_EMAIL` + `TESTRAIL_API_KEY`
- **TmsService** доступен через `TmsModule` (импортировать вButtonModule)
- **AdapterFactory** выбирает адаптер по `TMS_PROVIDER` env: `testrail` | `zephyr` | `testit` | `testlink`
- **getTree()** возвращает `TmsNode[]` — плоский список с `type: 'suite' | 'section'`
- **TestRail API v2 — paginated responses**: Все collection-эндпоинты возвращают обёртку `{ offset, limit, size, _links, <resource>: [...] }`, а НЕ голый массив. Адаптер извлекает данные через `response.suites || []`, `response.sections || []`, `response.projects || []`
- **`.env` приоритет**: Системные переменные окружения (установленные через Kubernetes, systemd, Docker, export и т.д.) имеют **наивысший приоритет** и НЕ перезаписываются `.env` файлом. `@nestjs/config` v4 загружает `.env`, но устанавливает значения только если ключ отсутствует в `process.env`. Поиск `.env` в `app.module.ts` (`findEnvFiles()`) проверяет пути в порядке: `__dirname`-relative (dist), `/etc/qa-platform/.env`, `/opt/qa-platform/.env`, CWD-relative. Первый найденный файл используется.
--- **`LLM_MOCK`**: по умолчанию `false`. Если переменная не задана — запросы уходят к реальному LLM. Для включения мока на сервере: `export LLM_MOCK=true` или в `/etc/qa-platform/.env`.
