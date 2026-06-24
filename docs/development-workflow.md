# Процесс доработки: пример добавления фичи

## Пример: Добавление сущности "TestSuite"

**Задача**: Добавить возможность группировать тесткейсы в тестовые наборы (TestSuite).

---

## Шаг 1: Планирование

### 1.1 Определяем scope

- Новая сущность: `TestSuiteEntity`
- Связь: TestSuite → Feature (один ко многим)
- API: CRUD для тестовых наборов
- Фронт: страница управления наборами

### 1.2 Создаём задачу в AGENTS.md

Добавляем в `AGENTS.md`:
```
## TestSuite Module
- Сущность: TestSuiteEntity (id, name, description, featureId, createdAt, updatedAt)
- API: /api/features/:slug/suites, /api/suites/:id
- Тесты: unit + integration + golden master
```

---

## Шаг 2: Реализация

### 2.1 Создаём сущность

```typescript
// apps/backend/src/features/entities/test-suite.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { FeatureEntity } from './feature.entity';

@Entity('test_suites')
export class TestSuiteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  featureId: number;

  @ManyToOne(() => FeatureEntity, feature => feature.suites)
  @JoinColumn({ name: 'featureId' })
  feature: FeatureEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2.2 Создаём сервис

```typescript
// apps/backend/src/features/test-suite.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestSuiteEntity } from './entities/test-suite.entity';

@Injectable()
export class TestSuiteService {
  constructor(
    @InjectRepository(TestSuiteEntity)
    private readonly suiteRepository: Repository<TestSuiteEntity>,
  ) {}

  async findAll(featureId: number): Promise<TestSuiteEntity[]> {
    return this.suiteRepository.find({ where: { featureId } });
  }

  async findOne(id: number): Promise<TestSuiteEntity> {
    const suite = await this.suiteRepository.findOne({ where: { id } });
    if (!suite) {
      throw new NotFoundException(`TestSuite with ID ${id} not found`);
    }
    return suite;
  }

  async create(featureId: number, data: Partial<TestSuiteEntity>): Promise<TestSuiteEntity> {
    const suite = this.suiteRepository.create({ ...data, featureId });
    return this.suiteRepository.save(suite);
  }

  async update(id: number, data: Partial<TestSuiteEntity>): Promise<TestSuiteEntity> {
    const suite = await this.findOne(id);
    Object.assign(suite, data);
    return this.suiteRepository.save(suite);
  }

  async delete(id: number): Promise<void> {
    const suite = await this.findOne(id);
    await this.suiteRepository.remove(suite);
  }
}
```

### 2.3 Создаём контроллер

```typescript
// apps/backend/src/features/test-suite.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TestSuiteService } from './test-suite.service';

@Controller('features/:slug/suites')
@UseGuards(JwtAuthGuard)
export class TestSuiteController {
  constructor(private readonly suiteService: TestSuiteService) {}

  @Get()
  async findAll(@Param('slug') slug: string) {
    // featureId из slug
    return this.suiteService.findAll(featureId);
  }

  @Post()
  async create(@Param('slug') slug: string, @Body() data) {
    return this.suiteService.create(featureId, data);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data) {
    return this.suiteService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.suiteService.delete(id);
  }
}
```

### 2.4 Регистрируем модуль

```typescript
// apps/backend/src/features/features.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureEntity } from './entities/feature.entity';
import { TestSuiteEntity } from './entities/test-suite.entity';
import { TestSuiteService } from './test-suite.service';
import { TestSuiteController } from './test-suite.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureEntity, TestSuiteEntity])],
  providers: [TestSuiteService],
  controllers: [TestSuiteController],
  exports: [TestSuiteService],
})
export class FeaturesModule {}
```

---

## Шаг 3: Тесты

### 3.1 Unit тест

```typescript
// test/unit/test-suite.service.test.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TestSuiteService } from '../../apps/backend/src/features/test-suite.service';
import { TestSuiteEntity } from '../../apps/backend/src/features/entities/test-suite.entity';

describe('TestSuiteService', () => {
  let service: TestSuiteService;
  let repository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestSuiteService,
        {
          provide: getRepositoryToken(TestSuiteEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TestSuiteService>(TestSuiteService);
    repository = module.get(getRepositoryToken(TestSuiteEntity));
  });

  it('should return all suites for a feature', async () => {
    const suites = [{ id: 1, name: 'Login Tests' }];
    repository.find.mockResolvedValue(suites);

    const result = await service.findAll(1);
    expect(result).toEqual(suites);
    expect(repository.find).toHaveBeenCalledWith({ where: { featureId: 1 } });
  });

  it('should throw NotFoundException if suite not found', async () => {
    repository.findOne.mockResolvedValue(undefined);

    await expect(service.findOne(999)).rejects.toThrow('TestSuite with ID 999 not found');
  });
});
```

### 3.2 Integration тест

```typescript
// test/integration/test-suite-api.test.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../apps/backend/src/app.module';

describe('TestSuite API (Integration)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Получаем JWT токен
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/ldap/login')
      .send({ username: 'admin', password: 'admin' });
    token = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/features/:slug/suites', () => {
    it('should create a new test suite', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/features/test-feature/suites')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Login Tests', description: 'Tests for login functionality' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Login Tests');
    });
  });

  describe('GET /api/features/:slug/suites', () => {
    it('should return all suites for a feature', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/features/test-feature/suites')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
```

### 3.3 Schema Validation

Добавляем схему для TestSuite:

```json
// test/fixtures/schemas/test-suite.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TestSuite",
  "type": "object",
  "required": ["name", "featureId"],
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string", "minLength": 1, "maxLength": 255 },
    "description": { "type": ["string", "null"] },
    "featureId": { "type": "integer" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```

### 3.4 Golden Master

Создаём fixture:

```json
// test-fixtures/golden-master/test-suite-create.json
{
  "request": {
    "method": "POST",
    "path": "/api/features/login-feature/suites",
    "body": {
      "name": "Authentication Tests",
      "description": "Test cases for user authentication"
    }
  },
  "response": {
    "status": 201,
    "body": {
      "id": 1,
      "name": "Authentication Tests",
      "description": "Test cases for user authentication",
      "featureId": 1,
      "createdAt": "2026-06-21T12:00:00.000Z",
      "updatedAt": "2026-06-21T12:00:00.000Z"
    }
  }
}
```

---

## Шаг 4: Документация

### 4.1 Обновляем docs-maintainer

Запускаем subagent для обновления документации:

```typescript
subagent({
  agent: "docs-maintainer",
  task: "Обнови документацию после добавления TestSuite модуля: обнови docs/areas/backend-api-structure.md и docs/sub-agents.md"
})
```

### 4.2 Обновляем AGENTS.md

Добавляем в корневой `AGENTS.md`:

```markdown
## TestSuite Module

### Сущности
- TestSuiteEntity: id, name, description, featureId, createdAt, updatedAt

### API Endpoints
| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | /api/features/:slug/suites | JWT | Список наборов |
| POST | /api/features/:slug/suites | JWT | Создать набор |
| PATCH | /api/suites/:id | JWT | Обновить набор |
| DELETE | /api/suites/:id | JWT + Admin | Удалить набор |

### Тесты
- Unit: test/unit/test-suite.service.test.ts
- Integration: test/integration/test-suite-api.test.ts
- Schema: test/fixtures/schemas/test-suite.schema.json
- Golden Master: test-fixtures/golden-master/test-suite-*.json
```

---

## Шаг 5: Валидация

### 5.1 Запускаем тесты

```bash
npm run test
```

### 5.2 Запускаем валидацию схем

```bash
node scripts/validate-schemas.mjs
```

### 5.3 Проверяем покрытие

```bash
npm run test:cov
```

---

## Шаг 6: Деплой

### 6.1 Собираем Docker image

```bash
docker build -t qa-engineer:latest .
```

### 6.2 Обновляем Helm values

```yaml
# helm/values.yaml
image:
  tag: latest  # или specific version
```

### 6.3 Деплоим

```bash
helm upgrade qa-engineer ./helm -n qa-platform
```

---

## Итого

| Шаг | Действие | Время |
|-----|----------|-------|
| 1 | Планирование | 15 мин |
| 2 | Реализация (entity + service + controller) | 2-3 часа |
| 3 | Тесты (unit + integration + schema + golden master) | 2-3 часа |
| 4 | Документация | 30 мин |
| 5 | Валидация | 15 мин |
| 6 | Деплой | 15 мин |
| **Итого** | | **5-7 часов** |

---

## Ключевые моменты

1. **AGENTS.md** — единая точка входа для всех агентов
2. **docs-maintainer** — автоматически обновляет документацию
3. **Schema validation** — гарантирует соответствие API контрактам
4. **Golden Master** — регрессионное тестирование на fixtures
5. **Helm** — единообразный деплой в K8s
6. **Тесты** — покрывают все слои (unit → integration → golden master)
