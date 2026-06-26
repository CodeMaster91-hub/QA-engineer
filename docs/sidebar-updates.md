# Sidebar Enhancements

## Обзор

В sidebar добавлены три фичи, вдохновлённые TestCasesProject: поиск фич, отображение текущей LLM-модели и метаданные (количество требований и тест-кейсов).

## Фичи

### 1. Поиск фич (live search)

Реактивный `<input type="search">` над списком фич. Фильтрация по `title` и `slug` (case-insensitive). Скрыт при collapsed sidebar (≤60px).

### 2. Отображение текущей модели

Секция в sidebar отображает текущий LLM-провайдер и alias. Загружается через `GET /api/agents/providers`. Фундамент заложён для будущего переключения моделей (когда будет несколько провайдеров).

### 3. Метаданные фичи (reqCount, caseCount)

Каждая фича в sidebar показывает количество требований и тест-кейсов: `3 req · 12 cases`. Counts вычисляются на бэкенде из артефактов `requirements` и `testcases`.

## Изменения

### Backend

**`apps/backend/src/features/features.service.ts`**
- `getArtifactCounts(featureId)` — парсит JSON из `feature_artifacts` по типам `requirements` и `testcases`
- `findAll()` — возвращает `{ ..., reqCount, caseCount }` для каждой фичи
- `findBySlug()` — аналогично

**API уже готов:**
- `GET /api/agents/providers` — список провайдеров и алиасов

### Frontend

**`apps/frontend/src/api/types.ts`**
- `Feature` — добавлены `reqCount: number`, `caseCount: number`
- `AgentConfig` — новый тип для конфигурации агентов
- `LlmProvider` — новый тип для провайдеров LLM

**`apps/frontend/src/components/Sidebar.vue`**
- `searchQuery` + `filteredFeatures` — live-фильтрация списка
- `currentModel` + `currentProvider` — отображение модели
- `loadModelInfo()` — загрузка данных о провайдере
- CSS: `.sidebar-model`, `.sidebar-search`, `.search-input`, `.item-meta`, `.item-counts`

## Будущее расширение

### Переключение моделей

Когда будет подключено несколько провайдеров, достаточно:
1. Заменить текст модели на `<select>` с опциями из `GET /api/agents/providers`
2. При смене → `PATCH /api/agents/config/:stage` с новым alias
