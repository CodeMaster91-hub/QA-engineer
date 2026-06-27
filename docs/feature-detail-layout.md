# Feature-Detail Layout

## Текущая архитектура layout

### Цепочка layout

```
.main-content (flex, overflow: hidden, padding: 20px)
  → .feature-detail (flex: 1, flex-col, overflow: hidden)
    → .detail-header (flex-shrink: 0)
    → .pipeline-section (flex-shrink: 0)
    → .stage-content (flex: 1, flex-col, align-items: stretch)
      → stage-компонент (flex: 1, width: 100%, overflow: hidden)
        → .panel-header (flex-shrink: 0, border-bottom)
        → .panel-body (flex: 1, overflow-y: auto)
          → [data exists] ... контент
          → [error] .pipeline-error
          → [else] .empty
```

### Sticky Panel Header (все stage-компоненты)

Все stage-компоненты используют паттерн `panel-header` + `panel-body` для фиксации заголовка при скролле:

```html
<div class="stage-panel">
  <div class="panel-header">
    <h3>Title</h3>
  </div>
  <div class="panel-body">
    <!-- скроллируемый контент -->
  </div>
</div>
```

CSS:
```css
.stage-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}
.panel-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}
.panel-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
```

### Особенности по компонентам

| Компонент | Sticky зона | Скроллится |
|-----------|-------------|------------|
| RequirementsStage | Два panel-header (Источник + Требования) | Источник и таблица отдельно |
| TestPlanStage | `<h3>Тест план</h3>` | markdown-контент |
| TestCasesStage | `<h3>Тест-кейсы (N)</h3>` + фильтры (статус, тип, REQ) | список кейсов |
| CoverageStage | `<h3>Покрытие</h3>` | coverage-gaps, таблица покрытия |
| ReviewStage | `<h3>` + `.stats-grid` | отчёт, вопросы |
| DryRunStage | `<h3>Dry Run</h3>` | JSON |
| PublishedStage | `<h3>Публикация</h3>` | статус, действия |

### FeatureDetailView — родительский CSS

`.stage-panel` **не** имеет `overflow-y: auto` на уровне родителя — скролл управляется внутри каждого компонента через `.panel-body`.

---

## CoverageStage

### Таблица покрытия

Вместо markdown-матрицы от LLM используется кастомная Vue-таблица с разделением тест-кейсов по типу:

| Требование | Статус | Позитивные | Негативные | Остальные |
|------------|--------|------------|------------|-----------|

- **Позитивные** — `#2da160`, только `type === 'positive'`
- **Негативные** — `#c62828`, только `type === 'negative'`
- **Остальные** — `#7b1fa2`, все остальные типы (validation, boundary, permission, integration, regression, smoke, other)

Маппинг TC ID → тип выполняется через проп `testcasesArtifact` (передаётся из `FeatureDetailView`). Markdown-матрица (`coverage_matrix_markdown`) больше не отображается.

### Coverage Gaps

Блок `coverage-gaps` — первый элемент в `panel-body` (перед таблицей):

```
┌─────────────────────────────────────────────┐
│  Пробелы в покрытии                          │
│  • REQ-016: нет проверки...                  │
│                              [🔧 Дополнить]  │  ← кнопка в правом нижнем углу
└─────────────────────────────────────────────┘
```

- `display: flex; flex-direction: column`
- Кнопка `align-self: flex-end` в правом нижнем углу
- `margin-bottom: 16px` для отступа от таблицы

---

## TestCasesStage — Фильтры

В `panel-header` левой панели добавлены три фильтра в одной строке справа от заголовка:

```
┌──────────────────────────────────────────────────────────┐
│ Тест-кейсы (12)  [Все статусы▾] [Все типы▾] [Все треб...│
├──────────────────────────────────────────────────────────┤
```

- `.panel-header` — `display: flex; align-items: center`, заголовок `flex-shrink: 0`
- `.filter-row` — `flex: 1; justify-content: flex-end`
- Каждый `.filter-select` — `max-width: 130px`, `font-size: 0.75em`

**Фильтры:**
1. **Статус** — `draft`, `reviewed`, `approved`, `needs_clarification`
2. **Тип** — все 9 типов
3. **REQ** — выпадающий список из `requirementsArtifact?.content?.requirements`

Состояние фильтров сохраняется при переключении этапов через `composables/useTestCasesFilters.ts` (module-level refs, сбрасываются только при обновлении страницы).

`filteredCases` — computed с AND-логикой. `selectByFiltered(id)` маппит ID на индекс в оригинальном массиве `cases`.

---

## Pipeline Error в Stage-компонентах

`pipeline.error` отображается внутри `panel-body` stage-компонента вместо стандартного текста-заглушки.

**Механизм:**
1. `FeatureDetailView.vue` передаёт `:error="pipeline.error"` во все stage-компоненты
2. В каждом компоненте проверка: `v-if="error"` → отображается `.pipeline-error` (красный текст)
3. Если данных нет и ошибки нет → показывается стандартная заглушка (`.empty`)
4. Если данные есть → они отображаются, ошибка игнорируется

**Затронутые компоненты:**
| Компонент | Заглушка (empty) | Замена при ошибке |
|-----------|-----------------|-------------------|
| RequirementsStage (левая панель) | Нет данных источника | `pipeline-error` |
| RequirementsStage (правая панель) | Нет требований | `pipeline-error` |
| TestPlanStage | Тест план не сформирован | `pipeline-error` |
| TestCasesStage | Нет тест-кейсов | `pipeline-error` |
| CoverageStage | Нет данных покрытия | `pipeline-error` |
| ReviewStage | Нет данных | `pipeline-error` |
| DryRunStage | Dry run не выполнялся | `pipeline-error` |

`.pipeline-error` ранее отображался в `.pipeline-section` (над stage компонентами) — удалён оттуда.

---

## Stage-компоненты (все)

- `.stage-panel` → `display: flex`, `flex-direction: column`, `min-height: 0`, `overflow: hidden`, `width: 100%`
- `.empty` → `flex: 1`, центрирование через flex
- `.pipeline-error` → `flex: 1`, центрирование, `color: #dd2b0e`

### `RequirementsStage.vue`

- `.split-container` → `width: 100%`, `max-width: 100%`, `overflow-x: hidden`
- `.split-panel` → `min-height: 0`
- `ResizeObserver` на контейнере — пересчитывает `leftWidth`/`rightWidth` при изменении ширины

### `TestCasesStage.vue`

- `.cases-table` → `flex: 1`, `min-width: 0`, `min-height: 0`, `overflow-x: auto`
- Фильтры в `.panel-header`: статус, тип, REQ (из `requirementsArtifact`)
- `useTestCasesFilters` — singleton-состояние фильтров

### `TestPlanStage.vue`

- `.markdown-rendered` → `width: 100%`

### `CoverageStage.vue`

- Таблица с колонками: Требование, Статус, Позитивные, Негативные, Остальные
- `testcasesArtifact` — проп для маппинга TC ID → тип
- `coverage-gaps` — первый элемент `panel-body`, кнопка в правом нижнем углу
- Markdown-матрица не отображается

### `DryRunStage.vue`

- `.dryrun-content` → `width: 100%`
- `.json-view` → `width: 100%`

### `PublishedStage.vue`

- `.publish-status`, `.publish-actions` → `width: 100%`
- `.status-text` → `flex: 1`

### `ReviewStage.vue`

- `stats-grid` в `.panel-header` (sticky вместе с заголовком)
- `.report-section:last-child` → `margin-bottom: 0`
- `.table-wrapper` → `overflow-x: auto`

## Результат

- Все этапы заполняют всё доступное пространство справа от sidebar
- Заголовки зафиксированы при скролле контента
- Вертикальный скролл внутри каждого stage-компонента
- Нет горизонтального скролла на уровне страницы
- Контент не уходит под сайдбар
- Сплит-экран (Requirements) работает корректно
