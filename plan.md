# QA-РїР»Р°С‚С„РѕСЂРјР° РґР»СЏ Р°РІС‚РѕРјР°С‚РёР·РёСЂРѕРІР°РЅРЅРѕРіРѕ С‚РµСЃС‚РёСЂРѕРІР°РЅРёСЏ С‚СЂРµР±РѕРІР°РЅРёР№: РџРѕР»РЅС‹Р№ РїР»Р°РЅ РјРёРіСЂР°С†РёРё Рё РїРѕСЃС‚СЂРѕРµРЅРёСЏ

**Р”Р°С‚Р°**: 2026-06-21
**РџСЂРѕРµРєС‚**: `C:\Users\Admin\Documents\Codex\QA-engineer`
**РСЃС‚РѕС‡РЅРёРє**: TestCasesProject (РЅРµС‚СЂРѕРЅСѓС‚)
**РЎС‚РµРє**: Nest.js 11 + Vue 3 + PostgreSQL + Redis (РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ) + Docker + Helm

---

## Р РµС€РµРЅРёСЏ

| # | РџСѓРЅРєС‚ | Р РµС€РµРЅРёРµ |
|---|-------|---------|
| 1 | DB | PostgreSQL (shared, schema-per-tenant) |
| 2 | Real-time | SSE (pipeline РІ UI, interactive РІ С‚РµСЂРјРёРЅР°Р»Рµ) |
| 3 | РђСЂС…РёС‚РµРєС‚СѓСЂР° | Р’СЃС‘ РІ backend (Р±РµР· packages, Р±РµР· CLI) |
| 4 | K8s | Helm chart |
| 5 | TestRail | TypeScript (РїРµСЂРµРїРёСЃР°С‚СЊ Python) |
| 6 | Logging | Pino в†’ stdout в†’ K8s fluentd в†’ Elasticsearch |
| 7 | CLI | РџСЂРѕРїСѓС‰РµРЅРѕ |
| 8 | РњРёРіСЂР°С†РёСЏ РґР°РЅРЅС‹С… | РўРѕР»СЊРєРѕ source requirements, РЅРµ Р°СЂС‚РµС„Р°РєС‚С‹ |
| 9 | РўРµСЃС‚С‹ | Unit + Integration + Golden Master + Schema Validation |
| 10 | Schema validation | РќР° РіСЂР°РЅРёС†Рµ LLM в†’ MySQL |
| 11 | Agent config | Env vars (connection) + MySQL (per-stage model) |
| 12 | AI-РёРЅСЃС‚СЂСѓРјРµРЅС‚ | РўРѕР»СЊРєРѕ AGENTS.md (СѓРЅРёРІРµСЂСЃР°Р»СЊРЅРѕ) |
| 13 | Docs | docs/sub-agents.md (Р±РµР· РїСѓС‚Р°РЅРёС†С‹ СЃ AGENTS.md) |
| 14 | Health | 3 СЌРЅРґРїРѕРёРЅС‚Р° (/api/health, /ready, /live) |
| 15 | LDAP | Mock-auth РґР»СЏ dev, СЂРµР°Р»СЊРЅС‹Р№ LDAP РїРѕРґРєР»СЋС‡РёС‚СЃСЏ РїРѕР·Р¶Рµ |
| 16 | LLM | Mock РґР»СЏ dev, СЂРµР°Р»СЊРЅС‹Р№ СЌРЅРґРїРѕРёРЅС‚ РІРїРёС€РµС‚Рµ РєРѕРіРґР° Р±СѓРґРµС‚ РіРѕС‚РѕРІ |
| 17 | TestRail | РРЅС‚РµСЂС„РµР№СЃ РіРѕС‚РѕРІ, РёРЅС‚РµРіСЂР°С†РёСЏ РѕС‚Р»РѕР¶РµРЅР° |
| 18 | Multi-tenant | Schema-per-tenant (РѕРґРёРЅ instance РЅР° РєРѕРјР°РЅРґСѓ) |
| 19 | Redis | РћРїС†РёРѕРЅР°Р»СЊРЅРѕ (in-memory fallback) |

---

## РђСЂС…РёС‚РµРєС‚СѓСЂР°

```
в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ
в”‚                    Kubernetes Cluster                        в”‚
в”‚               (namespace: qa-platform)                       в”‚
в”‚                                                              в”‚
в”‚  в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ   в”‚
в”‚  в”‚              Ingress (nginx)                          в”‚   в”‚
в”‚  в”‚  qa.corp.example.com/* в†’ backend:80                   в”‚   в”‚
в”‚  в””в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”¬в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”   в”‚
в”‚                  в”‚                                           в”‚
в”‚  в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв–јв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ   в”‚
в”‚  в”‚         Backend (Nest.js Monolith)                    в”‚   в”‚
в”‚  в”‚  в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ  в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ  в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ    в”‚   в”‚
в”‚  в”‚  в”‚ Web API в”‚  в”‚ Worker   в”‚  в”‚ SSE Events       в”‚    в”‚   в”‚
в”‚  в”‚  в”‚ (HTTP)  в”‚  в”‚ (BullMQ) в”‚  в”‚ (Real-time)      в”‚    в”‚   в”‚
в”‚  в”‚  в””в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”  в””в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”  в””в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”    в”‚   в”‚
в”‚  в””в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”¬в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”   в”‚
в”‚         в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ґв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ                                  в”‚
в”‚  в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв–јв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ  в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв–јв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ                         в”‚
в”‚  в”‚  PostgreSQL  в”‚  в”‚    Redis      в”‚                         в”‚
в”‚  в”‚  (Data +     в”‚  в”‚  (BullMQ +    в”‚                         в”‚
в”‚  в”‚  Artifacts)  в”‚  в”‚   Pub/Sub)    в”‚                         в”‚
в”‚  в””в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”  в””в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”                         в”‚
в”‚                                                              в”‚
в”‚  в”Њв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”ђ   в”‚
в”‚  в”‚           PVC: logs/ (ephemeral)                      в”‚   в”‚
в”‚  в””в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”   в”‚
в””в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”
```

---

## РЎС‚СЂСѓРєС‚СѓСЂР° РїСЂРѕРµРєС‚Р°

```
QA-engineer/
в”њв”Ђв”Ђ apps/
в”‚   в”њв”Ђв”Ђ backend/src/
в”‚   в”‚   в”њв”Ђв”Ђ main.ts
в”‚   в”‚   в”њв”Ђв”Ђ app.module.ts
в”‚   в”‚   в”њв”Ђв”Ђ auth/              # LDAP + JWT auth
в”‚   в”‚   в”њв”Ђв”Ђ users/             # User CRUD
в”‚   в”‚   в”њв”Ђв”Ђ features/          # Feature + Artifacts (MySQL)
в”‚   в”‚   в”њв”Ђв”Ђ agents/            # Agent config + LLM runtime
в”‚   в”‚   в”њв”Ђв”Ђ pipeline/          # Pipeline orchestration
в”‚   в”‚   в”њв”Ђв”Ђ queue/             # BullMQ
в”‚   в”‚   в”њв”Ђв”Ђ testrail/          # TestRail sync (TS)
в”‚   в”‚   в”њв”Ђв”Ђ events/            # SSE
в”‚   в”‚   в”њв”Ђв”Ђ health/            # Health endpoints
в”‚   в”‚   в””в”Ђв”Ђ database/          # TypeORM
в”‚   в”њв”Ђв”Ђ package.json
в”‚   в””в”Ђв”Ђ tsconfig.json
в”њв”Ђв”Ђ apps/
в”‚   в””в”Ђв”Ђ frontend/src/          # Vue 3 SPA
в”њв”Ђв”Ђ qa-ai-agents/              # РР· TestCasesProject (Р±РµР· web-ui/)
в”њв”Ђв”Ђ requirements-source/       # Source requirements
в”њв”Ђв”Ђ work/                      # РђСЂС‚РµС„Р°РєС‚С‹ (РЅРµ РјРёРіСЂРёСЂСѓРµРј)
в”њв”Ђв”Ђ helm/                      # Helm chart
в”њв”Ђв”Ђ docker/                    # Docker
в”њв”Ђв”Ђ docs/                      # Р”РѕРєСѓРјРµРЅС‚Р°С†РёСЏ
в”њв”Ђв”Ђ test/
в”‚   в”њв”Ђв”Ђ unit/                  # Unit С‚РµСЃС‚С‹
в”‚   в”њв”Ђв”Ђ integration/           # Integration С‚РµСЃС‚С‹
в”‚   в””в”Ђв”Ђ fixtures/golden-master/ # Golden master fixtures
в”њв”Ђв”Ђ test-fixtures/golden-master/ # Golden master data
в”њв”Ђв”Ђ scripts/
в”њв”Ђв”Ђ package.json               # Root package.json (workspaces)
в”њв”Ђв”Ђ .gitignore
в”њв”Ђв”Ђ .env
в”њв”Ђв”Ђ AGENTS.md
в””в”Ђв”Ђ README.md
```

---

## Р¤Р°Р·Р° 0: РРЅС„СЂР°СЃС‚СЂСѓРєС‚СѓСЂР° РїСЂРѕРµРєС‚Р°

### 0.1 РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ

```bash
mkdir C:\Users\Admin\Documents\Codex\QA-engineer
cd C:\Users\Admin\Documents\Codex\QA-engineer
git init
npm init
```

### 0.2 РЎС‚СЂСѓРєС‚СѓСЂР° РґРёСЂРµРєС‚РѕСЂРёР№

РЎРѕР·РґР°С‚СЊ РІСЃРµ РґРёСЂРµРєС‚РѕСЂРёРё РїРѕ СЃС‚СЂСѓРєС‚СѓСЂРµ РІС‹С€Рµ.

### 0.3 РљРѕРїРёСЂРѕРІР°РЅРёРµ РёР· TestCasesProject

- `qa-ai-agents/` в†’ `QA-engineer/qa-ai-agents/` (Р±РµР· web-ui/)
- `requirements-source/` в†’ `QA-engineer/requirements-source/`
- `work/` в†’ `QA-engineer/work/` (Р°СЂС‚РµС„Р°РєС‚С‹ РґР»СЏ reference)

### 0.4 РЎРѕР·РґР°РЅРёРµ С„Р°Р№Р»РѕРІ

- `package.json` (root, workspaces)
- `.gitignore`
- `.env`
- `AGENTS.md`
- `README.md`

---

## Р¤Р°Р·Р° 1: Auth (Authentik OIDC + JWT)

### 1.1 РРЅС‚РµРіСЂР°С†РёСЏ СЃ Authentik (OIDC)

**РњРѕРґСѓР»Рё**:
- `auth/oidc/oidc.strategy.ts` вЂ” Passport OIDC strategy (passport-openidconnect)
- `auth/oidc/oidc.controller.ts` вЂ” Callback handlers
- `auth/jwt.strategy.ts` вЂ” JWT validation (РёР· OIDC С‚РѕРєРµРЅР°)
- `auth/auth.guard.ts` вЂ” Guard (authenticated / roles)
- `auth/auth.service.ts` вЂ” User provisioning РёР· OIDC claims

**OIDC Flow**:
```
1. Frontend в†’ Redirect to Authentik (/application/o/qa-platform/authorize)
2. User в†’ Login РІ Authentik UI
3. Authentik в†’ Callback в†’ /api/auth/callback
4. Backend в†’ Validate OIDC tokens
5. Backend в†’ Extract claims (sub, email, name, groups)
6. Backend в†’ Find or create user in PostgreSQL (auto-provision)
7. Backend в†’ Issue internal JWT {sub, email, roles}
8. Frontend в†’ Store JWT, use for API calls
```

### 1.2 Env vars

```env
# Authentik OIDC
AUTHENTIK_ISSUER=https://authentik.corp.example.com/application/o/qa-platform/
AUTHENTIK_AUTHORIZE_URL=https://authentik.corp.example.com/application/o/qa-platform/authorize/
AUTHENTIK_TOKEN_URL=https://authentik.corp.example.com/application/o/qa-platform/token/
AUTHENTIK_USERINFO_URL=https://authentik.corp.example.com/application/o/qa-platform/userinfo/
AUTHENTIK_CLIENT_ID=qa-platform
AUTHENTIK_CLIENT_SECRET=your-client-secret
AUTHENTIK_LOGOUT_URL=https://authentik.corp.example.com/application/o/qa-platform/end-session/

# JWT (РґР»СЏ РІРЅСѓС‚СЂРµРЅРЅРёС… С‚РѕРєРµРЅРѕРІ)
JWT_SECRET=random_64_char_hex
JWT_EXPIRATION=24h

# Admin group name in Authentik
AUTHENTIK_ADMIN_GROUP=QA-Platform-Admins
```

---

## Р¤Р°Р·Р° 2: Users

### 2.1 РЎСѓС‰РЅРѕСЃС‚Рё

- `UserEntity` вЂ” id, login, email, displayName, role (admin/user), ldapDn, createdAt, updatedAt

### 2.2 API

- `GET /api/users` вЂ” РІСЃРµ РїРѕР»СЊР·РѕРІР°С‚РµР»Рё (admin)
- `GET /api/users/me` вЂ” С‚РµРєСѓС‰РёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ
- `PATCH /api/users/:id` вЂ” РѕР±РЅРѕРІРёС‚СЊ СЂРѕР»СЊ (admin)
- `DELETE /api/users/:id` вЂ” СѓРґР°Р»РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ (admin)

---

## Р¤Р°Р·Р° 3: Features + PostgreSQL

### 3.1 РЎСѓС‰РЅРѕСЃС‚Рё

- `FeatureEntity` вЂ” id, slug, title, status (enum), createdAt, updatedAt
- `FeatureArtifactEntity` вЂ” id, featureId FK, type (enum), content (JSONB), createdAt, updatedAt

### 3.2 РђСЂС‚РµС„Р°РєС‚С‹ С…СЂР°РЅСЏС‚СЃСЏ РІ PostgreSQL

- `source_bundle.json` в†’ `FeatureArtifactEntity {type: 'source', content: JSONB}`
- `requirements_map.json` в†’ `FeatureArtifactEntity {type: 'requirements', content: JSONB}`
- `test_cases.json` в†’ `FeatureArtifactEntity {type: 'testcases', content: JSONB}`
- Рё С‚.Рґ.

### 3.3 API

- `GET /api/features` вЂ” СЃРїРёСЃРѕРє С„РёС‡ (СЃ РїР°РіРёРЅР°С†РёРµР№)
- `POST /api/features` вЂ” СЃРѕР·РґР°С‚СЊ С„РёС‡Сѓ (РёРјРїРѕСЂС‚ РёСЃС‚РѕС‡РЅРёРєР°)
- `GET /api/features/:slug` вЂ” РїРѕР»РЅС‹Р№ payload С„РёС‡Рё
- `DELETE /api/features/:slug` вЂ” СѓРґР°Р»РёС‚СЊ С„РёС‡Сѓ
- `GET /api/features/:slug/artifacts` вЂ” РїРѕР»СѓС‡РёС‚СЊ Р°СЂС‚РµС„Р°РєС‚
- `POST /api/features/:slug/artifacts` вЂ” СЃРѕС…СЂР°РЅРёС‚СЊ Р°СЂС‚РµС„Р°РєС‚

---

## Р¤Р°Р·Р° 4: Agents Config

### 4.1 РЎСѓС‰РЅРѕСЃС‚Рё

- `AgentConfigEntity` вЂ” id, stage (enum), provider, model, temperature, maxTokens, enabled

### 4.2 РљРѕРЅС„РёРіСѓСЂР°С†РёСЏ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ

РЎРѕР·РґР°С‘С‚СЃСЏ РїСЂРё СЃС‚Р°СЂС‚Рµ РІ Р‘Р”.

### 4.3 API

- `GET /api/agents/config` вЂ” С‚РµРєСѓС‰Р°СЏ РєРѕРЅС„РёРіСѓСЂР°С†РёСЏ
- `PATCH /api/agents/config` вЂ” РѕР±РЅРѕРІРёС‚СЊ РєРѕРЅС„РёРіСѓСЂР°С†РёСЋ (admin)
- `GET /api/agents/providers` вЂ” РґРѕСЃС‚СѓРїРЅС‹Рµ РїСЂРѕРІР°Р№РґРµСЂС‹

### 4.4 Env vars

```env
# LLM
LLM_BASE_URL=http://llm.corp.example.com/v1
LLM_API_KEY=your-api-key
LLM_SMART_MODEL=qwen-72b
LLM_FAST_MODEL=qwen-7b
LLM_MOCK=true  # true РґР»СЏ dev
```

---

## Р¤Р°Р·Р° 5: Pipeline (Orchestration)

### 5.1 Workflow Stages

```
new в†’ source_ingested в†’ requirements_extracted в†’ draft_created в†’
coverage_audited в†’ review в†’ dry_run_completed в†’ published
```

### 5.2 Per-stage model config

| Stage | Model | Temperature |
|-------|-------|-------------|
| requirements_extracted | qwen-72b (smart) | 0.1 |
| draft_created | qwen-7b (fast) | 0.2 |
| coverage_audited | qwen-7b (fast) | 0.2 |

### 5.3 API

- `POST /api/pipeline/:slug/run` вЂ” Р·Р°РїСѓСЃС‚РёС‚СЊ РїР°Р№РїР»Р°Р№РЅ
- `POST /api/pipeline/:slug/restart` вЂ” РїРµСЂРµР·Р°РїСѓСЃС‚РёС‚СЊ СЃ СЌС‚Р°РїР°
- `POST /api/pipeline/:slug/continue` вЂ” РїСЂРѕРґРѕР»Р¶РёС‚СЊ СЃ С‚РµРєСѓС‰РµРіРѕ СЌС‚Р°РїР°
- `POST /api/pipeline/:slug/cancel` вЂ” РѕС‚РјРµРЅРёС‚СЊ РІС‹РїРѕР»РЅРµРЅРёРµ
- `GET /api/pipeline/:slug/status` вЂ” СЃС‚Р°С‚СѓСЃ РїР°Р№РїР»Р°Р№РЅР°

---

## Р¤Р°Р·Р° 6: Queue (BullMQ)

### 6.1 РћС‡РµСЂРµРґРё

- `pipeline` вЂ” LLM pipeline jobs
- `testrail-sync` вЂ” TestRail publish jobs

### 6.2 Retry

Exponential backoff, 3 РїРѕРїС‹С‚РєРё РґР»СЏ LLM, 5 РґР»СЏ TestRail.

---

## Р¤Р°Р·Р° 7: TestRail (TypeScript)

### 7.1 РњРѕРґСѓР»Рё

- `testrail/testrail.module.ts`
- `testrail/testrail.service.ts` вЂ” API calls Рє TestRail
- `testrail/testrail.processor.ts` вЂ” BullMQ worker

### 7.2 Р—Р°РјРµРЅР° Python РЅР° TypeScript

РџРµСЂРµРїРёСЃР°С‚СЊ `testrail_publish.py` РЅР° TypeScript.

### 7.3 Env vars

```env
TESTRAIL_URL=https://yourcompany.testrail.io
TESTRAIL_API_KEY=your-api-key
TESTRAIL_MOCK=true  # true РґР»СЏ dev
```

---

## Р¤Р°Р·Р° 8: SSE Events

### 8.1 РњРѕРґСѓР»Рё

- `events/events.module.ts`
- `events/events.controller.ts` вЂ” `GET /api/events/stream`
- `events/events.service.ts` вЂ” push events

### 8.2 Events

- `pipeline:progress` вЂ” {featureId, stage, total, status}
- `pipeline:completed` вЂ” {featureId, result}
- `pipeline:failed` вЂ” {featureId, error}
- `pipeline:log` вЂ” {featureId, message, timestamp}
- `testrail:progress` вЂ” {featureId, status}

### 8.3 Multi-pod

Redis Pub/Sub РґР»СЏ broadcast РјРµР¶РґСѓ pod'Р°РјРё.

---

## Р¤Р°Р·Р° 9: Health

### 9.1 Endpoints

- `GET /api/health` вЂ” basic alive check
- `GET /api/health/ready` вЂ” DB + Redis connectivity
- `GET /api/health/live` вЂ” liveness (not deadlocked)

---

## Р¤Р°Р·Р° 10: Frontend (Vue 3)

### 10.1 РЎС‚СЂСѓРєС‚СѓСЂР°

```
apps/frontend/src/
в”њв”Ђв”Ђ api/
в”‚   в”њв”Ђв”Ђ auth.ts
в”‚   в”њв”Ђв”Ђ users.ts
в”‚   в”њв”Ђв”Ђ features.ts
в”‚   в”њв”Ђв”Ђ pipeline.ts
в”‚   в”њв”Ђв”Ђ agents.ts
в”‚   в””в”Ђв”Ђ testrail.ts
в”њв”Ђв”Ђ composables/
в”‚   в”њв”Ђв”Ђ useAuth.ts
в”‚   в”њв”Ђв”Ђ useSse.ts
в”‚   в””в”Ђв”Ђ useFeature.ts
в”њв”Ђв”Ђ views/
в”‚   в”њв”Ђв”Ђ LoginView.vue
в”‚   в”њв”Ђв”Ђ FeaturesView.vue
в”‚   в”њв”Ђв”Ђ FeatureDetailView.vue
в”‚   в”њв”Ђв”Ђ PipelineView.vue
в”‚   в””в”Ђв”Ђ admin/
в”‚       в”њв”Ђв”Ђ UsersView.vue
в”‚       в”њв”Ђв”Ђ AgentsConfigView.vue
в”‚       в””в”Ђв”Ђ SettingsView.vue
в”њв”Ђв”Ђ components/
в”‚   в”њв”Ђв”Ђ PipelineProgress.vue
в”‚   в”њв”Ђв”Ђ TestCaseCard.vue
в”‚   в”њв”Ђв”Ђ CoverageMatrix.vue
в”‚   в””в”Ђв”Ђ TestRailStatus.vue
в””в”Ђв”Ђ router/index.ts
```

### 10.2 SSE Composable

```typescript
// composables/useSse.ts
export function useSse(token: string) {
  const eventSource = new EventSource(
    `/api/events/stream?token=${token}`
  );

  eventSource.addEventListener('pipeline:progress', (e) => {
    const data = JSON.parse(e.data);
    // Update UI: progress bar, stage info
  });

  eventSource.addEventListener('pipeline:completed', (e) => {
    const data = JSON.parse(e.data);
    // Refresh feature data, show success
  });

  eventSource.addEventListener('pipeline:log', (e) => {
    const data = JSON.parse(e.data);
    // Append to log viewer
  });

  return { eventSource };
}
```

### 10.3 Pipeline UI

- **Progress bar**: СЌС‚Р°Рї + РїСЂРѕС†РµРЅС‚
- **Stage timeline**: РІРёР·СѓР°Р»СЊРЅРѕРµ РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ СЌС‚Р°РїРѕРІ (active/completed/failed/pending)
- **Log viewer**: СЂРµР°Р»С‚Р°Р№Рј Р»РѕРіРё С‡РµСЂРµР· SSE
- **Cancel button**: `POST /api/pipeline/:slug/cancel`
- **Config panel**: РІС‹Р±РѕСЂ РјРѕРґРµР»Рё РґР»СЏ РєР°Р¶РґРѕРіРѕ СЌС‚Р°РїР°

---

## Р¤Р°Р·Р° 11: Docker

### 11.1 Dockerfile (multi-stage)

- Stage 1: Dependencies
- Stage 2: Build
- Stage 3: Runtime (node:22-bookworm-slim)

### 11.2 .dockerignore

```
node_modules
.git
.env
*.log
logs/
work/
docs/
scripts/
```

---

## Р¤Р°Р·Р° 12: Helm

### 12.1 РЎС‚СЂСѓРєС‚СѓСЂР°

```
helm/
в”њв”Ђв”Ђ Chart.yaml
в”њв”Ђв”Ђ values.yaml
в”њв”Ђв”Ђ values-dev.yaml
в”њв”Ђв”Ђ values-prod.yaml
в””в”Ђв”Ђ templates/
    в”њв”Ђв”Ђ _helpers.tpl
    в”њв”Ђв”Ђ deployment-backend.yaml
    в”њв”Ђв”Ђ service-backend.yaml
    в”њв”Ђв”Ђ statefulset-postgres.yaml
    в”њв”Ђв”Ђ service-postgres.yaml
    в”њв”Ђв”Ђ deployment-redis.yaml
    в”њв”Ђв”Ђ service-redis.yaml
    в”њв”Ђв”Ђ ingress.yaml
    в”њв”Ђв”Ђ hpa.yaml
    в”њв”Ђв”Ђ configmap.yaml
    в”њв”Ђв”Ђ secret.yaml
    в””в”Ђв”Ђ pvc.yaml
```

### 12.2 Values

```yaml
# values.yaml
image:
  repository: your-registry/qa-engineer
  tag: latest

replicaCount:
  backend: 2

postgresql:
  enabled: true
  primary:
    persistence:
      size: 20Gi

redis:
  enabled: true
  persistence:
    size: 1Gi

ingress:
  enabled: true
  className: nginx
  host: qa.corp.example.com
```

---

## Р¤Р°Р·Р° 13: РўРµСЃС‚С‹

### 13.1 Unit С‚РµСЃС‚С‹

- `test/unit/agent-runtime.test.ts`
- `test/unit/workflow-engine.test.ts`
- `test/unit/features.service.test.ts`

### 13.2 Integration С‚РµСЃС‚С‹

- `test/integration/pipeline-api.test.ts`
- `test/integration/auth.test.ts`
- `test/integration/features.test.ts`

### 13.3 Golden Master

- `test-fixtures/golden-master/` вЂ” fixtures
- `test/integration/golden-master.test.ts`

### 13.4 Schema Validation

- `scripts/validate-schemas.mjs`

---

## Р¤Р°Р·Р° 14: Docs

- `AGENTS.md` вЂ” СѓРЅРёРІРµСЂСЃР°Р»СЊРЅС‹Рµ РёРЅСЃС‚СЂСѓРєС†РёРё
- `README.md` вЂ” РѕР±Р·РѕСЂ
- `docs/GETTING_STARTED.md` вЂ” Р·Р°РїСѓСЃРє
- `docs/project-overview.md` вЂ” Р°СЂС…РёС‚РµРєС‚СѓСЂР°
- `docs/deployment.md` вЂ” Docker + Helm
- `docs/sub-agents.md` вЂ” СЃСѓР±Р°РіРµРЅС‚С‹
- `docs/context-index.md` вЂ” РЅР°РІРёРіР°С†РёСЏ

---

## API Endpoints (СЃРІРѕРґРєР°)

### Auth
| Method | Endpoint | Auth | РћРїРёСЃР°РЅРёРµ |
|--------|----------|------|----------|
| GET | /api/auth/login | вЂ” | Redirect to Authentik |
| GET | /api/auth/callback | вЂ” | OIDC callback |
| GET | /api/auth/me | JWT | РўРµРєСѓС‰РёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ |
| POST | /api/auth/logout | JWT | Logout (redirect to Authentik) |

### Users
| Method | Endpoint | Auth | РћРїРёСЃР°РЅРёРµ |
|--------|----------|------|----------|
| GET | /api/users | JWT + Admin | Р’СЃРµ РїРѕР»СЊР·РѕРІР°С‚РµР»Рё |
| GET | /api/users/me | JWT | РўРµРєСѓС‰РёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ |
| PATCH | /api/users/:id | JWT + Admin | РћР±РЅРѕРІРёС‚СЊ СЂРѕР»СЊ |
| DELETE | /api/users/:id | JWT + Admin | РЈРґР°Р»РёС‚СЊ |

### Features
| Method | Endpoint | Auth | РћРїРёСЃР°РЅРёРµ |
|--------|----------|------|----------|
| GET | /api/features | JWT | РЎРїРёСЃРѕРє С„РёС‡ |
| POST | /api/features | JWT | РЎРѕР·РґР°С‚СЊ С„РёС‡Сѓ |
| GET | /api/features/:slug | JWT | Payload С„РёС‡Рё |
| DELETE | /api/features/:slug | JWT + Admin | РЈРґР°Р»РёС‚СЊ |
| GET | /api/features/:slug/artifacts/:type | JWT | РђСЂС‚РµС„Р°РєС‚ |
| POST | /api/features/:slug/artifacts | JWT | РЎРѕС…СЂР°РЅРёС‚СЊ Р°СЂС‚РµС„Р°РєС‚ |

### Agents
| Method | Endpoint | Auth | РћРїРёСЃР°РЅРёРµ |
|--------|----------|------|----------|
| GET | /api/agents/config | JWT | РљРѕРЅС„РёРіСѓСЂР°С†РёСЏ |
| PATCH | /api/agents/config | JWT + Admin | РћР±РЅРѕРІРёС‚СЊ |
| GET | /api/agents/providers | JWT | РџСЂРѕРІР°Р№РґРµСЂС‹ |

### Pipeline
| Method | Endpoint | Auth | РћРїРёСЃР°РЅРёРµ |
|--------|----------|------|----------|
| POST | /api/pipeline/:slug/run | JWT | Р—Р°РїСѓСЃС‚РёС‚СЊ |
| POST | /api/pipeline/:slug/restart | JWT | РџРµСЂРµР·Р°РїСѓСЃС‚РёС‚СЊ |
| POST | /api/pipeline/:slug/continue | JWT | РџСЂРѕРґРѕР»Р¶РёС‚СЊ |
| POST | /api/pipeline/:slug/cancel | JWT | РћС‚РјРµРЅРёС‚СЊ |
| GET | /api/pipeline/:slug/status | JWT | РЎС‚Р°С‚СѓСЃ |

### TestRail
| Method | Endpoint | Auth | РћРїРёСЃР°РЅРёРµ |
|--------|----------|------|----------|
| POST | /api/testrail/:slug/dry-run | JWT | Dry-run |
| POST | /api/testrail/:slug/publish | JWT | РџСѓР±Р»РёРєР°С†РёСЏ |
| GET | /api/testrail/:slug/status | JWT | РЎС‚Р°С‚СѓСЃ |

### Jobs
| Method | Endpoint | Auth | РћРїРёСЃР°РЅРёРµ |
|--------|----------|------|----------|
| GET | /api/jobs/:id/status | JWT | РЎС‚Р°С‚СѓСЃ job |

### SSE
| Method | Endpoint | Auth | РћРїРёСЃР°РЅРёРµ |
|--------|----------|------|----------|
| GET | /api/events/stream | JWT | SSE stream |

### Health
| Method | Endpoint | Auth | РћРїРёСЃР°РЅРёРµ |
|--------|----------|------|----------|
| GET | /api/health | вЂ” | Alive check |
| GET | /api/health/ready | вЂ” | Readiness |
| GET | /api/health/live | вЂ” | Liveness |

---

## Multi-tenant Р°СЂС…РёС‚РµРєС‚СѓСЂР°

### РџСЂРёРЅС†РёРї

РљР°Р¶РґР°СЏ РєРѕРјР°РЅРґР° РїРѕРґРЅРёРјР°РµС‚ СЃРІРѕР№ instance QA-engineer:
- РР·РѕР»СЏС†РёСЏ РґР°РЅРЅС‹С… (features, artifacts, agents)
- РќРµР·Р°РІРёСЃРёРјРѕСЃС‚СЊ РѕС‚ РґСЂСѓРіРёС… РєРѕРјР°РЅРґ
- РџСЂРѕСЃС‚РѕРµ СѓРїСЂР°РІР»РµРЅРёРµ

### Р РµР°Р»РёР·Р°С†РёСЏ: Schema-per-tenant

```
PostgreSQL (shared)
в”њв”Ђв”Ђ public          # Auth, Users (РѕР±С‰РёРµ)
в”њв”Ђв”Ђ schema_team1    # Features, Artifacts РґР»СЏ team1
в”њв”Ђв”Ђ schema_team2    # Features, Artifacts РґР»СЏ team2
в””в”Ђв”Ђ schema_team3    # Features, Artifacts РґР»СЏ team3
```

### РљРѕРЅС„РёРіСѓСЂР°С†РёСЏ

```env
# Р”Р»СЏ РєРѕРјР°РЅРґС‹ "team1"
DB_SCHEMA=team1
REDIS_ENABLED=false  # РёР»Рё true РµСЃР»Рё Redis РґРѕСЃС‚СѓРїРµРЅ
PORT=3000
```

### Docker Compose (per team)

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres-shared
      - DB_SCHEMA=team1
      - REDIS_ENABLED=false
      - LLM_ENDPOINT=http://corporate-llm:8080

  redis:  # РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ
    image: redis:7-alpine
```

---

## Env vars (СЃРІРѕРґРєР°)

```env
# Database
DB_TYPE=postgres
DB_HOST=postgres-shared
DB_PORT=5432
DB_DATABASE=qa_platform
DB_USERNAME=qa_user
DB_PASSWORD=strong_password
DB_SCHEMA=team1  # в†ђ tenant identifier

# Redis (optional)
REDIS_ENABLED=false
REDIS_HOST=redis
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=random_64_char_hex

# Authentik OIDC
AUTHENTIK_ISSUER=https://authentik.corp.example.com/application/o/qa-platform/
AUTHENTIK_CLIENT_ID=qa-platform
AUTHENTIK_CLIENT_SECRET=your-client-secret

# LLM (corporate)
LLM_BASE_URL=http://corporate-llm:8080/v1
LLM_API_KEY=your-api-key
LLM_MOCK=true

# TMS
TMS_PROVIDER=testrail
TESTRAIL_URL=https://yourcompany.testrail.io
TESTRAIL_API_KEY=your-api-key
TESTRAIL_MOCK=true
```

---

## РџРѕСЂСЏРґРѕРє СЂРµР°Р»РёР·Р°С†РёРё

| # | Р¤Р°Р·Р° | РћРїРёСЃР°РЅРёРµ |
|---|------|----------|
| 1 | 0 | РРЅС„СЂР°СЃС‚СЂСѓРєС‚СѓСЂР° РїСЂРѕРµРєС‚Р° |
| 2 | 1 | Auth (LDAP + JWT + Mock) |
| 3 | 2 | Users |
| 4 | 3 | Features + PostgreSQL |
| 5 | 4 | Agents config |
| 6 | 5-6 | Pipeline + Queue (BullMQ) |
| 7 | 7 | TestRail (TypeScript) |
| 8 | 8 | SSE |
| 9 | 9 | Health |
| 10 | 10 | Frontend |
| 11 | 11 | Docker |
| 12 | 12 | Helm |
| 13 | 13 | РўРµСЃС‚С‹ |
| 14 | 14 | Docs |

**РС‚РѕРіРѕ: ~30-40 С‡Р°СЃРѕРІ**

