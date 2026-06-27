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
  overflow: hidden;    /* clip, скролл только внутри panel-body */
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
| TestCasesStage | `<h3>Тест-кейсы (N)</h3>` | таблица кейсов |
| CoverageStage | `<h3>Покрытие</h3>` | матрица, отчёт, gaps |
| ReviewStage | `<h3>` + `.stats-grid` | отчёт, вопросы |
| DryRunStage | `<h3>Dry Run</h3>` | JSON |
| PublishedStage | `<h3>Публикация</h3>` | статус, действия |

### FeatureDetailView — родительский CSS

`.stage-panel` **не** имеет `overflow-y: auto` на уровне родителя — скролл управляется внутри каждого компонента через `.panel-body`.

## История исправлений

### Исправление горизонтального скролла (первоначальное)

**Проблема**: окно feature-detail имело горизонтальный скролл, контент уходил под сайдбар.

**Причины**: `#app` без `width: 100%`, `transform: scale(1.1)` на PipelineBar, отсутствие `overflow-x: hidden`.

**Решение**: цепочка flex layout, `overflow: hidden` на `.main-content` и `.feature-detail`, `min-width: 0` на контейнерах.

### Stage-компоненты (все)

- `.stage-panel` → `display: flex`, `flex-direction: column`, `min-height: 0`, `overflow: hidden`, `width: 100%`
- `.empty` → `flex: 1`, центрирование через flex

### `RequirementsStage.vue`

- `.split-container` → `width: 100%`, `max-width: 100%`, `overflow-x: hidden`
- `.split-panel` → `min-height: 0`
- `ResizeObserver` на контейнере — пересчитывает `leftWidth`/`rightWidth` при изменении ширины

### `TestCasesStage.vue`

- `.cases-table` → `flex: 1`, `min-width: 0`, `min-height: 0`, `overflow-x: auto`

### `TestPlanStage.vue`

- `.markdown-rendered` → `width: 100%`

### `CoverageStage.vue`

- `.coverage-matrix`, `.coverage-report` → `width: 100%`
- `.table-wrapper` → `width: 100%`, `overflow-x: auto`

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
