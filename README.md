# QA-Engineer

QA-платформа для автоматизированного тестирования требований с использованием AI.

## Стек

- **Backend**: Nest.js 11 + TypeORM
- **Frontend**: Vue 3 + TypeScript
- **База данных**: PostgreSQL
- **Очереди**: BullMQ (production) / In-memory (dev)
- **Аутентификация**: Authentik (OIDC)
- **Деплой**: Docker + Kubernetes (Helm)

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск backend
npm run dev:backend

# Запуск frontend
npm run dev:frontend
```

## Конфигурация

Скопируйте `.env.example` в `.env` и заполните секреты:

```bash
cp .env.example .env
# Отредактируйте .env, вставив реальные ключи
```

## Структура проекта

```
apps/
├── backend/          # Nest.js API
│   └── src/
│       ├── auth/     # Authentik OIDC + JWT
│       ├── users/    # Управление пользователями
│       ├── features/ # Фичи и артефакты
│       ├── agents/   # AI-агенты и конфигурация
│       ├── pipeline/ # Оркестрация пайплайнов
│       ├── testrail/ # Интеграция с TestRail
│       ├── tms/      # TMS адаптеры (TestRail, Zephyr, TestIT, TestLink)
│       ├── events/   # SSE события
│       ├── health/   # Health check endpoints
│       └── common/   # InMemoryQueue, Tenant, FileProcessor, UrlFetcher
└── frontend/         # Vue 3 SPA
```

## API Endpoints

### Auth (Authentik OIDC)
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | /api/auth/login | Redirect to Authentik |
| GET | /api/auth/callback | OIDC callback |
| GET | /api/auth/me | Текущий пользователь |
| POST | /api/auth/logout | Logout |

### Users
| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | /api/users | Admin | Все пользователи |
| GET | /api/users/me | JWT | Текущий пользователь |
| GET | /api/users/:id | Admin | Получить пользователя |
| PATCH | /api/users/:id | Admin | Обновить пользователя |
| DELETE | /api/users/:id | Admin | Удалить пользователя |
| GET | /api/users/settings | JWT | Настройки пользователя |
| PATCH | /api/users/settings | JWT | Сохранить настройки |

### Features
| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | /api/features | JWT | Список фич (пагинация) |
| POST | /api/features | Admin | Создать фичу |
| POST | /api/features/create-with-source | Public | Создать с источником |
| GET | /api/features/:slug | JWT | Детали фичи |
| DELETE | /api/features/:slug | Admin | Удалить фичу |
| GET | /api/features/:slug/artifacts | JWT | Все артефакты |
| GET | /api/features/:slug/artifacts/:type | JWT | Артефакт по типу |
| POST | /api/features/:slug/artifacts | JWT | Создать/обновить артефакт |

### Pipeline
| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| POST | /api/pipeline/:slug/run | JWT | Запустить |
| POST | /api/pipeline/:slug/restart | JWT | Перезапустить |
| POST | /api/pipeline/:slug/continue | JWT | Продолжить (после паузы) |
| POST | /api/pipeline/:slug/cancel | JWT | Отменить |
| GET | /api/pipeline/:slug/status | JWT | Статус |
| POST | /api/pipeline/:slug/approve | JWT | Одобрить gate |
| POST | /api/pipeline/:slug/answer | JWT | Ответить на вопросы |
| POST | /api/pipeline/:slug/restart-stage | JWT | Перезапустить этап |
| POST | /api/pipeline/:slug/fill-gaps | JWT | Дополнить тест-кейсы для пробелов покрытия |

### Pipeline Stages (UI) — 7 этапов (без `new` и `source_ingested`)
| # | Stage | Backend Stage | Рендер |
|---|-------|---------------|--------|
| 1 | Требования | requirements_extracted | Split-screen: источник + таблица |
| 2 | Тест-план | test_plan_created | markdown → HTML |
| 3 | Тест-кейсы | test_cases_created | JSON → таблица |
| 4 | Покрытие | coverage_audited | JSON + markdown |
| 5 | Ревью | review (hard stop) | JSON + approval |
| 6 | Пробный запуск | dry_run_completed (hard stop) | JSON + approval |
| 7 | Опубликовано | published | Текст + publish |

### Agents
| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | /api/agents/config | JWT | Конфигурация всех этапов |
| PATCH | /api/agents/config/:stage | Admin | Обновить конфиг этапа |
| GET | /api/agents/providers | JWT | Доступные провайдеры |

### TestRail
| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | /api/testrail/config | JWT | Настройки по умолчанию |
| GET | /api/testrail/projects | JWT | Список проектов |
| GET | /api/testrail/projects/:id/suites | JWT | Список свитов |
| GET | /api/testrail/projects/:id/suites/:id/sections | JWT | Список секций |
| POST | /api/testrail/projects/:id/suites/:id/sections | Admin | Создать секцию |
| POST | /api/testrail/:slug/dry-run | Admin | Пробный publish |
| POST | /api/testrail/:slug/publish | Admin | Публикация в TestRail |
| GET | /api/testrail/jobs/:id/status | JWT | Статус задачи |

### TMS
| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | /api/tms/schema | JWT | Схема TMS |
| GET | /api/tms/providers | JWT | Список провайдеров |
| GET | /api/tms/projects | JWT | Список проектов |
| GET | /api/tms/tree/:projectId | JWT | Дерево проекта |
| POST | /api/tms/publish | Admin | Публикация тест-кейсов |

### Events (SSE)
| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| SSE | /api/events/stream/:featureId | Public | SSE-поток событий |
| GET | /api/events/health | Public | Health check SSE |

### Health
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | /api/health | Alive check |
| GET | /api/health/ready | Readiness |
| GET | /api/health/live | Liveness |

## Переменные окружения

См. `.env.example` для полного списка. Основные:

- `DB_*` — Настройки PostgreSQL
- `REDIS_*` — Настройки Redis (опционально)
- `AUTHENTIK_*` — Authentik OIDC настройки
- `JWT_SECRET` — Секрет для JWT токенов
- `LLM_*` — Настройки AI-моделей (`LLM_MOCK=true` для dev)
- `TESTRAIL_*` — Настройки TestRail

## Документация

- [Auth API](docs/auth.md) — Аутентификация (Authentik OIDC)
- [Users API](docs/users.md) — Управление пользователями
- [Features API](docs/features.md) — Управление фичами и артефактами
- [LLM Config](docs/llm-config.md) — Конфигурация AI-моделей
- [Pipeline API](docs/pipeline.md) — Оркестрация пайплайна
- [TMS API](docs/tms.md) — Интеграция с Test Management System
- [SSE Events](docs/sse-events.md) — Real-time события
- [Redis Optional](docs/redis-optional.md) — Конфигурация Redis (опционально)
- [Multi-tenant](docs/multi-tenant.md) — Multi-tenant архитектура

## Деплой

```bash
# Docker
docker build -t qa-engineer .

# Kubernetes (Helm)
helm install qa-platform ./helm
```
