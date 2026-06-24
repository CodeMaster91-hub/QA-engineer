# Users API

Управление пользователями QA-платформы.

## Модель

### User

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Идентификатор |
| externalId | string | ID из Authentik (unique) |
| email | string | Email (unique) |
| displayName | string | Отображаемое имя |
| login | string | Логин (unique) |
| roles | string[] | Роли (default: ['user']) |
| createdAt | Date | Дата создания |
| updatedAt | Date | Дата обновления |

**Роли:**
- `admin` - Администратор (полный доступ)
- `user` - Обычный пользователь

### UserSetting

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Идентификатор |
| userId | uuid | FK на User |
| key | string | Ключ настройки |
| value | JSONB | Значение |
| createdAt | Date | Дата создания |
| updatedAt | Date | Дата обновления |

## Endpoints

### Users

#### GET /api/users

Получить всех пользователей. Требуется роль `admin`.

**Response:** User[]

#### GET /api/users/me

Получить текущего пользователя.

**Response:** User object

#### PATCH /api/users/:id

Обновить пользователя. Требуется роль `admin`.

**Request Body:**
```json
{
  "displayName": "Новое имя",
  "roles": ["admin"]
}
```

**Response:** User object

#### DELETE /api/users/:id

Удалить пользователя. Требуется роль `admin`.

**Response:** 200 OK

### Settings

#### GET /api/users/settings

Получить все настройки текущего пользователя.

**Response:**
```json
{
  "testrail_project_id": 1,
  "testrail_suite_id": 1
}
```

#### GET /api/users/settings/:key

Получить настройку по ключу.

**Response:**
```json
{
  "key": "testrail_project_id",
  "value": 1
}
```

#### PATCH /api/users/settings

Обновить несколько настроек.

**Request Body:**
```json
{
  "testrail_project_id": 1,
  "testrail_suite_id": 2
}
```

**Response:**
```json
{
  "message": "Settings updated"
}
```

#### PATCH /api/users/settings/:key

Обновить одну настройку.

**Request Body:**
```json
{
  "value": 1
}
```

**Response:**
```json
{
  "key": "testrail_project_id",
  "value": 1
}
```

#### DELETE /api/users/settings/:key

Удалить настройку.

**Response:**
```json
{
  "message": "Setting deleted"
}
```

## Использование

### Запоминание Project/Suite

```typescript
// Сохранить выбор пользователя
await api.patch('/users/settings', {
  testrail_project_id: 1,
  testrail_suite_id: 2,
});

// Получить сохраненные настройки
const settings = await api.get('/users/settings');
// { testrail_project_id: 1, testrail_suite_id: 2 }
```

## Авторизация

Все эндпоинты требуют JWT токен в заголовке:
```
Authorization: Bearer <jwt_token>
```

Эндпоинты с пометкой `Admin` дополнительно требуют роль `admin` в JWT.
