# QA-Engineer

QA-платформа для автоматизированного тестирования требований с использованием AI.

## Стек

- **Backend**: Nest.js 11 + TypeORM + BullMQ
- **Frontend**: Vue 3 + TypeScript
- **База данных**: PostgreSQL
- **Очереди**: Redis (опционально) / In-memory
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
│       ├── queue/    # BullMQ очереди
│       ├── testrail/ # Интеграция с TestRail
│       ├── events/   # SSE события
│       └── health/   # Health check endpoints
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

### Pipeline Stages (UI)
| # | Stage | Описание | Рендер |
|---|-------|----------|--------|
| 1 | New | Фича создана | — |
| 2 | Source | Исходный бандл | markdown → HTML |
| 3 | Requirements | Требования | JSON → таблица |
| 4 | Test Plan | Тест план | markdown → HTML |
| 5 | Test Cases | Тест-кейсы | JSON → таблица |
| 6 | Coverage | Аудит покрытия | JSON + markdown |
| 7 | Review | Ревью (hard stop) | JSON + approval |
| 8 | Dry Run | Пробный запуск | JSON + approval |
| 9 | Published | Опубликовано | Текст + publish |

### Health
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | /api/health | Alive check |
| GET | /api/health/ready | Readiness |
| GET | /api/health/live | Liveness |

## Переменные окружения

См. `.env` для полного списка. Основные:

- `DB_*` - Настройки PostgreSQL
- `REDIS_*` - Настройки Redis (опционально, см. [redis-optional.md](docs/redis-optional.md))
- `AUTHENTIK_*` - Authentik OIDC настройки
- `JWT_SECRET` - Секрет для JWT токенов
- `LLM_*` - Настройки AI-моделей (LLM_MOCK=true для dev)
- `TESTRAIL_*` - Настройки TestRail

## Документация

- [Auth API](docs/auth.md) - Аутентификация (Authentik OIDC)
- [Users API](docs/users.md) - Управление пользователями
- [Features API](docs/features.md) - Управление фичами и артефактами
- [LLM Config](docs/llm-config.md) - Конфигурация AI-моделей
- [Pipeline API](docs/pipeline.md) - Оркестрация пайплайна
- [TMS API](docs/tms.md) - Интеграция с Test Management System
- [SSE Events](docs/sse-events.md) - Real-time события
- [Redis Optional](docs/redis-optional.md) - Конфигурация Redis (опционально)
- [Multi-tenant](docs/multi-tenant.md) - Multi-tenant архитектура

## Деплой

```bash
# Docker
docker build -t qa-engineer .

# Kubernetes (Helm)
helm install qa-platform ./helm
```
