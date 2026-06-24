# Auth API

Аутентификация через Authentik (OIDC).

## Flow

```
1. GET /api/auth/login → Redirect to Authentik
2. User → Login в Authentik UI
3. Authentik → /api/auth/callback?code=xxx
4. Backend → Exchange code → Get tokens → Get userinfo
5. Backend → Auto-provision user → Issue JWT
6. Frontend → Store JWT, use for API calls
```

## Endpoints

### GET /api/auth/login

Redirect к Authentik для авторизации.

**Response:** 302 Redirect to Authentik

### GET /api/auth/callback

OIDC callback от Authentik.

**Query Parameters:**
- `code` - Authorization code от Authentik

**Response:** Redirect to frontend с JWT токеном

### GET /api/auth/me

Получить текущего аутентифицированного пользователя.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@corp.example.com",
  "name": "Иван Иванов",
  "login": "ivanov",
  "roles": ["user"],
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### POST /api/auth/logout

Logout с redirect на Authentik logout.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:** 302 Redirect

## ENV переменные

```env
AUTHENTIK_ISSUER=https://authentik.corp.example.com/application/o/qa-platform/
AUTHENTIK_AUTHORIZE_URL=https://authentik.corp.example.com/application/o/qa-platform/authorize/
AUTHENTIK_TOKEN_URL=https://authentik.corp.example.com/application/o/qa-platform/token/
AUTHENTIK_USERINFO_URL=https://authentik.corp.example.com/application/o/qa-platform/userinfo/
AUTHENTIK_CLIENT_ID=qa-platform
AUTHENTIK_CLIENT_SECRET=your-client-secret
AUTHENTIK_LOGOUT_URL=https://authentik.corp.example.com/application/o/qa-platform/end-session/
AUTHENTIK_ADMIN_GROUP=QA-Platform-Admins
JWT_SECRET=random_64_char_hex
JWT_EXPIRATION=24h
```
