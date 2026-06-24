# AGENTS.md - Универсальные инструкции для AI-агентов

## Контекст проекта

QA-платформа для автоматизированного тестирования требований. Стек: Nest.js 11 + Vue 3 + PostgreSQL + Redis (BullMQ).

## Ключевые принципы

1. **Безопасность**: Никогда не коммитьте секреты, ключи API, пароли
2. **Типизация**: Всегда используйте строгую типизацию TypeScript
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
│   ├── pipeline/       - Оркестрация пайплайнов
│   ├── testrail/       - Интеграция с TestRail
│   ├── tms/            - TMS адаптеры (TestRail, Zephyr, TestIT, TestLink)
│   ├── events/         - SSE события
│   ├── health/         - Health check
│   └── common/         - Queue, Tenant, FileProcessor, UrlFetcher
└── frontend/src/
    ├── api/            - API client и типы
    ├── components/     - Vue компоненты
    │   ├── stages/     - Stage-компоненты (Source, Requirements, TestPlan, etc.)
    │   └── __tests__/  - Тесты компонентов
    ├── composables/    - Vue composables (useSse)
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

## Pipeline

Backend: 9 stages, UI: 9 stages (test_plan_created → testplan, test_cases_created → testcases). Этап `new` не отображается в UI.

Статусы: `idle`, `running`, `blocked`, `waiting_for_qa`, `paused`, `completed`, `failed`, `cancelled`.

Approval gates: `review` (hard stop), `dry_run_completed` (hard stop), `coverage_audited` (gaps → waiting).

Restart stage: перезапуск конкретного этапа (`POST /pipeline/:slug/restart-stage`). Удаляет результат только этого этапа.

Questions persistence: вопросы сохраняются в `pipeline.questions` и остаются как артефакт после continue/approve.

## Артефакты

| Тип | Формат | Рендер |
|-----|--------|--------|
| source | `{ text, images }` | markdown → HTML |
| requirements | `{ requirements: [] }` | JSON → таблица |
| testcases | `{ test_plan_markdown, cases: [] }` | markdown + JSON → таблица |
| coverage | `{ coverage, coverage_matrix_markdown, gaps }` | JSON + markdown |
| review | `{ ... }` | JSON |
| dry_run | `{ ... }` | JSON |
