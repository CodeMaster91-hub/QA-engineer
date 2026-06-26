# Feature-Detail Layout Fix

## Проблема

Окно feature-detail имело горизонтальный скролл, контент уходил под сайдбар. Разные этапы заполняли экран по-разному: Review и TestPlan — полностью, остальные — нет.

### Причины

1. `.main-content` в `App.vue` не имел `overflow-x: hidden` — горизонтальный скролл на уровне страницы
2. `transform: scale(1.1)` на PipelineBar растягивал элемент на 110%, переполняя контейнер
3. `.feature-detail` не имел ограничений `overflow-x`
4. Сплит-панели в `RequirementsStage` могли превышать ширину контейнера
5. Таблицы в `CoverageStage` и `ReviewStage` не были обернуты в `overflow-x: auto`
6. Stage-компоненты не имели единого flex-layout, контент определял ширину панели

## Решение

### Цепочка layout

```
.main-content (flex, overflow: hidden, padding: 20px)
  → .feature-detail (flex: 1, flex-col, overflow: hidden)
    → .detail-header (flex-shrink: 0)
    → .pipeline-section (flex-shrink: 0)
    → .stage-content (flex: 1, flex-col, align-items: stretch)
      → stage-компонент (flex: 1, width: 100%, overflow-y: auto)
```

### `App.vue`

- `.main-content` → `display: flex`, `overflow: hidden` (вместо `overflow-y: auto`)
- Скролл перенесён внутрь `.feature-detail`

### `FeatureDetailView.vue`

- `.feature-detail` → `display: flex`, `flex-direction: column`, `flex: 1`, `overflow: hidden`
- `.detail-header`, `.pipeline-section` → `flex-shrink: 0`
- `.stage-content` → `flex: 1`, `align-items: stretch`
- `:deep(.stage-panel), :deep(.split-container)` → `flex: 1`, `width: 100%`, `min-width: 0`, `overflow-y: auto`
- `.pipeline-bar-wrapper` → убран `transform: scale(1.1)`, `overflow-x: auto`
- Убран `width: 100%` у `.detail-header`, `.pipeline-section`, `.logs-section` (растягиваются как flex-дети)

### Stage-компоненты (все)

- `.stage-panel` → `display: flex`, `flex-direction: column`, `min-height: 0`, `overflow-y: auto`, `width: 100%`
- `.empty` → `flex: 1`, центрирование через flex

### `RequirementsStage.vue`

- `.split-container` → `width: 100%`, `max-width: 100%`, `overflow-x: hidden`
- `.split-panel` → `min-height: 0`

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

- `.report-section:last-child` → `margin-bottom: 0`
- `.table-wrapper` → `overflow-x: auto`

## Результат

- Все этапы заполняют всё доступное пространство справа от sidebar
- Отступы одинаковые: 20px (padding `.main-content`)
- Вертикальный скролл внутри каждого stage-компонента
- Нет горизонтального скролла на уровне страницы
- Контент не уходит под сайдбар
- Сплит-экран (Requirements) работает корректно
- Размеры независимы от контента
