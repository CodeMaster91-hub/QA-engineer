# Multi-tenant архитектура

## Overview

QA Platform поддерживает multi-tenant архитектуру для изоляции данных между командами.

## Модель: Schema-per-tenant

Каждая команда имеет свой PostgreSQL schema:
- `public` — Auth, Users (общие данные)
- `team1` — Features, Artifacts для команды 1
- `team2` — Features, Artifacts для команды 2
- и т.д.

## Конфигурация

### ENV vars

```env
# Tenant identifier
DB_SCHEMA=team1

# Database (shared)
DB_HOST=postgres-shared
DB_PORT=5432
DB_DATABASE=qa_platform
DB_USERNAME=qa_user
DB_PASSWORD=strong_password
```

### Docker Compose

```bash
# Для команды "team1"
TEAM_NAME=team1 docker-compose -f docker-compose.team.yml up
```

## Изоляция данных

| Данные | Изоляция |
|--------|----------|
| Features | Schema (team1, team2, ...) |
| Artifacts | Schema |
| Agent Configs | Schema |
| Users | Public (общие) |
| Auth | Public (общие) |

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL (shared)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │   public    │ │   team1     │ │   team2     │  ...   │
│  │  (Auth,     │ │ (Features,  │ │ (Features,  │        │
│  │   Users)    │ │  Artifacts) │ │  Artifacts) │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────┘
              ↑               ↑               ↑
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Backend    │ │  Backend    │ │  Backend    │
│  (team1)    │ │  (team2)    │ │  (team3)    │
│  Port 3001  │ │  Port 3002  │ │  Port 3003  │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Деплой для команды

### 1. Клонирование репозитория

```bash
git clone <repo-url> qa-engineer-team1
cd qa-engineer-team1
```

### 2. Настройка конфигурации

```bash
# Создать .env.team для команды
cp .env.team .env

# Изменить TEAM_NAME
sed -i 's/TEAM_NAME=team1/TEAM_NAME=team1/' .env
```

### 3. Запуск

```bash
# Использовать Docker Compose
docker-compose -f docker-compose.team.yml up -d
```

### 4. Проверка

```bash
# Health check
curl http://localhost:3000/api/health
```

## Порты для команд

| Команда | Backend | Frontend | Redis |
|---------|---------|----------|-------|
| team1 | 3001 | 8081 | 6381 |
| team2 | 3002 | 8082 | 6382 |
| team3 | 3003 | 8083 | 6383 |
| ... | ... | ... | ... |

## Миграции

### Создание schema для новой команды

```sql
-- Подключиться к PostgreSQL
psql -U qa_user -d qa_platform

-- Создать schema
CREATE SCHEMA team1;

-- Создать таблицы (автоматически при запуске backend)
```

### Ручное создание schema

```sql
-- Создать schema
CREATE SCHEMA IF NOT EXISTS team1;

-- Установить search_path
SET search_path TO team1;

-- Создать таблицы
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'new',
  tenant_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE feature_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  tenant_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage VARCHAR(100) UNIQUE NOT NULL,
  alias VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.1,
  max_tokens INTEGER DEFAULT 4096,
  enabled BOOLEAN DEFAULT true,
  tenant_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Безопасность

### Изоляция данных

- Каждая команда видит только свои Features/Artifacts
- Нет cross-tenant доступа
- Schema-level isolation

### Аудит

- Логи содержат tenant_id
- Мониторинг использования per team

## Проблемы и решения

### Проблема: Connection pooling

**Решение:** Использовать PgBouncer с tenant-aware routing.

### Проблема: Миграции

**Решение:** Автоматические миграции при запуске backend.

### Проблема: Backup/Restore

**Решение:** Отдельные backup/restore per schema.

## Мониторинг

### Health Check

```bash
# Проверка health
curl http://localhost:3000/api/health

# Проверка ready
curl http://localhost:3000/api/health/ready
```

### Логи

```bash
# Логи backend
docker logs qa-engineer-backend

# Логи с tenant
grep "tenant:team1" /var/log/qa-platform/backend.log
```
