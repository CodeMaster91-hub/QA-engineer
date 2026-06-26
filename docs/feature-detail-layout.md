# Feature-Detail Layout Fix

## Проблема

Окно feature-detail имело горизонтальный скролл, контент уходил под сайдбар. Причины:

1. `.main-content` в `App.vue` не имел `overflow-x: hidden` — любой переполненный контент вызывал горизонтальный скролл страницы
2. `transform: scale(1.1)` на PipelineBar растягивал элемент на 110%, переполняя контейнер
3. `.feature-detail` не имел ограничений `overflow-x`
4. Спит-панели в `RequirementsStage` могли превышать ширину контейнера
5. Таблицы в `CoverageStage` и `ReviewStage` не были обернуты в `overflow-x: auto`

## Решение

### `App.vue`

Добавлен `overflow-x: hidden` к `.main-content` — горизонтальный скролл больше не появляется на уровне страницы.

### `FeatureDetailView.vue`

- `.feature-detail` — добавлены `max-width: 100%` и `overflow-x: hidden`
- `.pipeline-bar-wrapper` — убран `transform: scale(1.1)`, заменён на `overflow-x: auto` для внутреннего скролла пайплайн-бара при необходимости

### `RequirementsStage.vue`

`.split-container` — добавлены `max-width: 100%` и `overflow-x: hidden`, чтобы сплит-панели не выходили за границы.

### `CoverageStage.vue`

Таблица покрытия обернута в `.table-wrapper` с `overflow-x: auto` для внутреннего горизонтального скролла при необходимости.

### `ReviewStage.vue`

Таблица требований обернута в `.table-wrapper` с `overflow-x: auto` аналогично CoverageStage.

## Результат

- Единое зафиксированное окно feature-detail для всех этапов
- Вертикальный скролл внутри контента
- Нет горизонтального скролла на уровне страницы
- Контент не уходит под сайдбар
- Сплит-экран работает корректно, панели не превышают доступную ширину
