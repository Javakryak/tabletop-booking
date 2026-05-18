# TASKS.md

Backlog задач для разработки приложения бронирования игровых столов клуба настольных игр и варгеймов.

Документ предназначен для разбиения проекта на GitHub Issues и небольшие PR-задачи для Codex/coding agents.

## Current implementation status

Статусы ниже отражают текущую ветку `main`.

Legend:

- `Done` — implemented and covered by the current repo state.
- `Partial` — meaningful implementation exists, but acceptance criteria are not fully met or some behavior is still demo/fallback-only.
- `Open` — not implemented yet.

Completed or effectively completed task groups:

- `TASK-0001`–`TASK-0005`: monorepo, workspace, shared TypeScript config, lint/format, env examples.
- `TASK-0101`–`TASK-0104`: local Docker Compose, Prisma/database package, initial schema, deterministic seed data.
- `TASK-0201`–`TASK-0204`: NestJS API foundation, Swagger, healthcheck, structured logging.
- `TASK-0301`–`TASK-0305`: roles/guards, Telegram auth verification, profile/privacy endpoints, legal consent flow, account deletion request.
- `TASK-0401`–`TASK-0405`: rooms, tables, working hours, schedule exceptions, room/table closures.
- `TASK-0501`–`TASK-0509`: booking availability, create request, transitions, admin confirm/cancel, admin queue listing, admin move/reschedule, cancellation rules, active booking limit, concurrency test.
- `TASK-0601`–`TASK-0703`: Next.js web app, public pages, auth UI, dashboard, booking components, booking creation/history UI.
- `TASK-0801` and `TASK-0803`: admin route shell and owner resources UI.
- `TASK-1201`–`TASK-1203`: test framework, booking domain tests, API integration tests.

Partial task groups needing follow-up:

- `TASK-0802`: admin booking queue UI exists; backend emergency full-phone reveal endpoint with audit logging still needs completion.
- `TASK-0804`: user blocking UI exists; owner block/unblock backend endpoint and audit behavior still need completion.
- `TASK-0805`: audit-log UI exists; owner audit-log listing API still needs completion.
- `TASK-0901`: `apps/bot` package exists; grammY runtime is not implemented.
- `TASK-1101`: booking flows emit notification-request signals; real notification service and Telegram delivery are not implemented.
- `TASK-1301`: GitHub Actions CI exists for lint/typecheck/unit/API integration tests; production build checks are not yet included.
- `TASK-1402`: audit events are written for several booking/resource actions; dedicated full-phone reveal audit flow and owner audit API are still incomplete.
- `TASK-1404`: structured log redaction exists and UI masking is present in places; shared masking/redaction utilities and API-wide masked contact DTOs need hardening.

Highest-priority open work:

1. Complete backend endpoints used by admin/owner UI fallbacks: audit-log listing, emergency contact reveal, and user block/unblock.
2. Implement Telegram bot runtime, `/start` account linking, and notification delivery.
3. Add production Dockerfiles, deployment guide, backups, reverse proxy/HTTPS, and uptime monitoring.
4. Add Playwright smoke tests and bot tests after the bot runtime exists.

---

## 1. Общие правила работы с задачами

### 1.1. Формат задачи

Каждая задача должна быть достаточно маленькой, чтобы её можно было выполнить отдельным PR.

Рекомендуемый формат GitHub Issue:

```md
## Goal
Что нужно сделать и зачем.

## Scope
Что входит в задачу.

## Out of scope
Что не входит в задачу.

## Implementation notes
Технические замечания и ограничения.

## Acceptance criteria
- [ ] Критерий 1
- [ ] Критерий 2
- [ ] Критерий 3

## Tests
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E/API tests

## Docs
- [ ] README/docs updated if needed
```

### 1.2. Правила для PR

Каждый PR должен:

- решать одну понятную задачу;
- содержать описание изменений;
- содержать тесты или объяснение, почему тесты не требуются;
- не смешивать refactoring и feature work без необходимости;
- не добавлять секреты, токены или реальные персональные данные;
- обновлять документацию, если меняется поведение системы;
- проходить lint, typecheck, tests и build.

### 1.3. Labels для GitHub Issues

Рекомендуемые labels:

```text
area:repo
area:api
area:web
area:bot
area:database
area:infra
area:auth
area:booking
area:admin
area:meetups
area:games
area:legal
area:docs
area:tests
area:portfolio
priority:p0
priority:p1
priority:p2
priority:p3
type:feature
type:bug
type:refactor
type:docs
type:test
type:chore
good-first-codex-task
needs-design
blocked
```

### 1.4. Приоритеты

```text
P0 — блокирует MVP или безопасность
P1 — необходимо для MVP
P2 — важно, но можно после MVP
P3 — улучшение или polish
```

---

## 2. Epic 0 — Project foundation

Цель: подготовить репозиторий, структуру проекта, базовые инструменты и документацию для AI-assisted разработки.

---

### TASK-0001 — Create monorepo structure

**Priority:** P0  
**Labels:** `area:repo`, `type:chore`, `good-first-codex-task`
**Status:** Done

#### Goal
Создать базовую структуру монорепозитория.

#### Scope

Создать директории:

```text
apps/web
apps/api
apps/bot
packages/shared
packages/config
packages/database
packages/ui
docs/adr
docs/architecture
docs/product
docs/codex
docs/legal
scripts
docker
.github/workflows
```

#### Acceptance criteria

- [ ] Создана структура директорий.
- [ ] Добавлены `.gitkeep` там, где директории временно пустые.
- [ ] Корень репозитория содержит README, ROADMAP, AGENTS, ARCHITECTURE, DATABASE, API_SPEC, TASKS.

---

### TASK-0002 — Configure package manager and workspace

**Priority:** P0  
**Labels:** `area:repo`, `type:chore`
**Status:** Done

#### Goal
Настроить pnpm workspace для монорепозитория.

#### Scope

- `package.json` в корне.
- `pnpm-workspace.yaml`.
- Базовые scripts:
  - `dev`
  - `build`
  - `lint`
  - `typecheck`
  - `test`
  - `format`

#### Acceptance criteria

- [ ] `pnpm install` проходит успешно.
- [ ] Workspace видит `apps/*` и `packages/*`.
- [ ] Базовые команды существуют.

---

### TASK-0003 — Add shared TypeScript config

**Priority:** P0  
**Labels:** `area:repo`, `type:chore`
**Status:** Done

#### Goal
Настроить единый TypeScript config.

#### Scope

- Добавить `packages/config/tsconfig`.
- Подключить shared config в apps/packages.
- Включить strict mode.

#### Acceptance criteria

- [ ] Все приложения используют общий TypeScript config.
- [ ] Включён `strict`.
- [ ] `pnpm typecheck` запускается.

---

### TASK-0004 — Add linting and formatting

**Priority:** P0  
**Labels:** `area:repo`, `type:chore`
**Status:** Done

#### Goal
Настроить ESLint и Prettier.

#### Scope

- ESLint config.
- Prettier config.
- Ignore files.
- Root scripts.

#### Acceptance criteria

- [ ] `pnpm lint` работает.
- [ ] `pnpm format` работает.
- [ ] Конфигурация применяется ко всем apps/packages.

---

### TASK-0005 — Add environment examples

**Priority:** P0  
**Labels:** `area:repo`, `area:infra`, `type:chore`
**Status:** Done

#### Goal
Подготовить `.env.example` для всех приложений.

#### Scope

Создать:

```text
.env.example
apps/api/.env.example
apps/web/.env.example
apps/bot/.env.example
```

#### Acceptance criteria

- [ ] В examples нет реальных секретов.
- [ ] Описаны `DATABASE_URL`, `REDIS_URL`, `TELEGRAM_BOT_TOKEN`, `APP_BASE_URL`, `API_BASE_URL`.
- [ ] README содержит краткую инструкцию по env.

---

## 3. Epic 1 — Local infrastructure

Цель: подготовить локальную инфраструктуру для разработки, тестов и будущего деплоя.

---

### TASK-0101 — Add Docker Compose for PostgreSQL and Redis

**Priority:** P0  
**Labels:** `area:infra`, `area:database`, `type:chore`
**Status:** Done

#### Goal
Поднять PostgreSQL и Redis локально.

#### Scope

- `docker-compose.yml` или `docker-compose.dev.yml`.
- PostgreSQL service.
- Redis service.
- Named volumes.
- Healthchecks.

#### Acceptance criteria

- [ ] `docker compose up -d postgres redis` работает.
- [ ] PostgreSQL доступен по `DATABASE_URL`.
- [ ] Redis доступен по `REDIS_URL`.
- [ ] Нет реальных паролей в репозитории.

---

### TASK-0102 — Add database package with Prisma

**Priority:** P0  
**Labels:** `area:database`, `type:feature`
**Status:** Done

#### Goal
Настроить Prisma как единый database layer.

#### Scope

- `packages/database`.
- Prisma schema.
- Prisma client export.
- Базовые команды:
  - `db:generate`
  - `db:migrate`
  - `db:seed`
  - `db:studio`

#### Acceptance criteria

- [ ] Prisma client генерируется.
- [ ] Миграции запускаются локально.
- [ ] API может импортировать database package.

---

### TASK-0103 — Create initial database schema

**Priority:** P0  
**Labels:** `area:database`, `type:feature`
**Status:** Done

#### Goal
Создать начальную схему БД для пользователей, ролей, помещений, столов и бронирований.

#### Scope

Сущности:

- users;
- user_profiles;
- roles;
- user_roles;
- rooms;
- club_tables;
- club_working_hours;
- schedule_exceptions;
- booking_rules;
- bookings;
- booking_status_history;
- audit_logs;
- legal_documents;
- consents.

#### Acceptance criteria

- [ ] Создана миграция.
- [ ] Есть enum для ролей и статусов брони.
- [ ] Есть индексы для проверки бронирований по table/date/time.
- [ ] Schema соответствует DATABASE.md.

---

### TASK-0104 — Add seed demo data

**Priority:** P1  
**Labels:** `area:database`, `type:feature`, `area:portfolio`
**Status:** Done

#### Goal
Добавить seed данные для локального запуска и demo mode.

#### Scope

Создать:

- demo owner;
- demo admin;
- demo user;
- rooms;
- tables;
- working hours;
- booking rules;
- sample bookings;
- sample games later if games schema exists.

#### Acceptance criteria

- [ ] `pnpm db:seed` создаёт воспроизводимое состояние.
- [ ] Seed можно запускать повторно без дублей или с clean reset.
- [ ] Нет реальных персональных данных.

---

## 4. Epic 2 — Backend foundation

Цель: создать базовый NestJS API с healthcheck, Swagger, конфигурацией и общими паттернами.

---

### TASK-0201 — Create NestJS API app

**Priority:** P0  
**Labels:** `area:api`, `type:feature`
**Status:** Done

#### Goal
Создать приложение `apps/api`.

#### Scope

- NestJS app.
- Config module.
- Validation pipe.
- Global error handling.
- Request logging.
- `/api/v1` prefix.

#### Acceptance criteria

- [ ] API запускается локально.
- [ ] Есть prefix `/api/v1`.
- [ ] Валидация DTO включена глобально.
- [ ] Ошибки возвращаются в едином формате.

---

### TASK-0202 — Add Swagger/OpenAPI

**Priority:** P0  
**Labels:** `area:api`, `type:feature`, `area:docs`
**Status:** Done

#### Goal
Добавить Swagger-документацию.

#### Scope

- Swagger setup.
- `/api/docs` endpoint.
- Auth scheme placeholder.
- Tags for modules.

#### Acceptance criteria

- [ ] Swagger доступен локально.
- [ ] API version указан.
- [ ] DTO отображаются в Swagger.
- [ ] Production доступ можно ограничить env-флагом.

---

### TASK-0203 — Add healthcheck endpoint

**Priority:** P0  
**Labels:** `area:api`, `area:infra`, `type:feature`
**Status:** Done

#### Goal
Добавить endpoint для мониторинга.

#### Scope

```text
GET /api/v1/health
```

Проверки:

- API alive;
- database connection;
- Redis connection.

#### Acceptance criteria

- [ ] Endpoint возвращает статус API.
- [ ] При недоступной БД healthcheck сообщает ошибку.
- [ ] При недоступном Redis healthcheck сообщает degraded/error.

---

### TASK-0204 — Add structured logging

**Priority:** P1  
**Labels:** `area:api`, `area:infra`, `type:feature`
**Status:** Done

#### Goal
Настроить структурированные логи.

#### Scope

- JSON-like logs.
- Request id/correlation id.
- Error logs.
- Redaction sensitive fields.

#### Acceptance criteria

- [ ] Логи содержат timestamp, level, requestId.
- [ ] Не логируются phone, email, tokens, Telegram init data.
- [ ] Ошибки логируются без утечки секретов.

---

## 5. Epic 3 — Auth and users

Цель: реализовать Telegram-first регистрацию, профиль пользователя, роли и базовую privacy-модель.

---

### TASK-0301 — Implement roles and permissions foundation

**Priority:** P0  
**Labels:** `area:auth`, `area:api`, `type:feature`
**Status:** Done

#### Goal
Реализовать роли и guards.

#### Scope

Роли:

- guest;
- user;
- admin;
- owner.

#### Acceptance criteria

- [ ] Есть role enum.
- [ ] Есть guards/decorators для ограничения endpoint.
- [ ] Тесты проверяют доступ по ролям.

---

### TASK-0302 — Implement Telegram auth verification

**Priority:** P0  
**Labels:** `area:auth`, `area:api`, `area:bot`, `type:feature`
**Status:** Done

#### Goal
Реализовать проверку Telegram login/init data.

#### Scope

- Проверка подписи Telegram данных.
- Создание пользователя при первом входе.
- Поиск пользователя при повторном входе.
- Issue app session/JWT.

#### Acceptance criteria

- [ ] Невалидная подпись отклоняется.
- [ ] Валидный Telegram user создаёт аккаунт.
- [ ] Повторный login не создаёт дубль.
- [ ] Есть unit tests для verification logic.

---

### TASK-0303 — Implement user profile endpoints

**Priority:** P1  
**Labels:** `area:auth`, `area:api`, `type:feature`
**Status:** Done

#### Goal
Дать пользователю возможность читать и обновлять профиль.

#### Endpoints

```text
GET /api/v1/me
PATCH /api/v1/me/profile
PATCH /api/v1/me/privacy
```

#### Acceptance criteria

- [ ] Пользователь видит свой профиль.
- [ ] Можно обновить display name.
- [ ] Можно добавить телефон для экстренной связи.
- [ ] Можно добавить email опционально.
- [ ] Телефон и email валидируются.
- [ ] Чувствительные поля не возвращаются лишним ролям.

---

### TASK-0304 — Implement legal consent acceptance

**Priority:** P1  
**Labels:** `area:legal`, `area:auth`, `area:api`, `type:feature`
**Status:** Done

#### Goal
Сохранять согласия пользователя с legal documents.

#### Scope

- Legal document versions.
- Consent records.
- Acceptance during registration/profile completion.

#### Acceptance criteria

- [ ] Пользователь не может завершить регистрацию без обязательных согласий.
- [ ] Хранится document type, version, accepted_at, IP, user-agent.
- [ ] Есть endpoint для получения актуальных документов.

---

### TASK-0305 — Implement account deletion request

**Priority:** P2  
**Labels:** `area:legal`, `area:auth`, `type:feature`
**Status:** Done

#### Goal
Добавить заявку на удаление аккаунта.

#### Scope

- Request deletion endpoint.
- Soft-delete flag.
- Admin/owner visibility.

#### Acceptance criteria

- [ ] Пользователь может запросить удаление аккаунта.
- [ ] Аккаунт не удаляется мгновенно.
- [ ] Владелец видит pending deletion requests.

---

## 6. Epic 4 — Club resources and schedule

Цель: реализовать помещения, столы, расписание клуба и исключения.

---

### TASK-0401 — Implement rooms CRUD

**Priority:** P1  
**Labels:** `area:api`, `area:admin`, `area:booking`, `type:feature`
**Status:** Done

#### Goal
Владелец может управлять помещениями.

#### Endpoints

```text
GET /api/v1/rooms
POST /api/v1/admin/rooms
PATCH /api/v1/admin/rooms/:id
DELETE /api/v1/admin/rooms/:id
```

#### Acceptance criteria

- [ ] Гости/пользователи могут смотреть активные помещения.
- [ ] Только owner может создавать/изменять/удалять помещения.
- [ ] Удаление не ломает существующие брони.

---

### TASK-0402 — Implement tables CRUD

**Priority:** P1  
**Labels:** `area:api`, `area:admin`, `area:booking`, `type:feature`
**Status:** Done

#### Goal
Владелец может управлять столами.

#### Scope

Стол содержит:

- number/name;
- room_id;
- capacity;
- active/blocked status.

#### Acceptance criteria

- [ ] Owner может создавать столы.
- [ ] Owner может менять помещение и вместимость.
- [ ] Заблокированный стол недоступен для новых броней.
- [ ] Существующие брони сохраняются.

---

### TASK-0403 — Implement working hours

**Priority:** P1  
**Labels:** `area:api`, `area:admin`, `area:booking`, `type:feature`
**Status:** Done

#### Goal
Реализовать базовое недельное расписание клуба.

#### Scope

- Day of week.
- Open time.
- Close time.
- Closed flag.

#### Acceptance criteria

- [ ] Owner/admin может смотреть расписание.
- [ ] Owner может редактировать расписание.
- [ ] Booking availability учитывает расписание.

---

### TASK-0404 — Implement schedule exceptions

**Priority:** P1  
**Labels:** `area:api`, `area:admin`, `area:booking`, `type:feature`
**Status:** Done

#### Goal
Добавить праздники, выходные и сокращённые дни.

#### Scope

- Date-specific exception.
- Closed full day.
- Custom open/close time.
- Reason/comment.

#### Acceptance criteria

- [ ] Исключения переопределяют недельное расписание.
- [ ] Закрытый день недоступен для брони.
- [ ] Сокращённый день ограничивает доступные слоты.

---

### TASK-0405 — Implement room/table closures

**Priority:** P2  
**Labels:** `area:api`, `area:admin`, `area:booking`, `type:feature`
**Status:** Done

#### Goal
Позволить блокировать конкретные помещения и столы на период.

#### Acceptance criteria

- [ ] Можно заблокировать помещение на интервал.
- [ ] Можно заблокировать стол на интервал.
- [ ] Availability учитывает блокировки.

---

## 7. Epic 5 — Booking core

Цель: реализовать надёжное бронирование столов с подтверждением администратором.

---

### TASK-0501 — Implement booking availability service

**Priority:** P0  
**Labels:** `area:booking`, `area:api`, `type:feature`
**Status:** Done

#### Goal
Рассчитывать доступные слоты для бронирования.

#### Scope

- Учитывать рабочие часы.
- Учитывать исключения расписания.
- Учитывать существующие брони.
- Учитывать блокировки столов/помещений.
- Шаг слота: 30 минут.

#### Acceptance criteria

- [ ] Endpoint возвращает доступные слоты по дате.
- [ ] Недоступные столы не возвращаются.
- [ ] Закрытые дни не возвращают слоты.
- [ ] Есть unit tests для расчёта доступности.

---

### TASK-0502 — Implement create booking request

**Priority:** P0  
**Labels:** `area:booking`, `area:api`, `type:feature`
**Status:** Done

#### Goal
Пользователь может создать заявку на бронь.

#### Endpoint

```text
POST /api/v1/bookings
```

#### Acceptance criteria

- [ ] Создаётся бронь со статусом `pending`.
- [ ] Время соответствует 30-минутной сетке.
- [ ] Проверяются рабочие часы.
- [ ] Проверяются ограничения пользователя.
- [ ] Проверяются конфликты с другими бронями.
- [ ] Админ получает notification event.

---

### TASK-0503 — Implement booking status transitions

**Priority:** P0  
**Labels:** `area:booking`, `area:api`, `area:admin`, `type:feature`
**Status:** Done

#### Goal
Реализовать корректные переходы статусов брони.

#### Transitions

```text
pending -> confirmed
pending -> cancelled_by_user
pending -> cancelled_by_admin
confirmed -> cancelled_by_user
confirmed -> cancelled_by_admin
confirmed -> completed
pending -> expired
```

#### Acceptance criteria

- [ ] Недопустимые переходы запрещены.
- [ ] История статусов сохраняется.
- [ ] Переходы покрыты unit tests.

---

### TASK-0504 — Implement admin booking confirmation

**Priority:** P0  
**Labels:** `area:booking`, `area:api`, `area:admin`, `type:feature`
**Status:** Done

#### Goal
Администратор подтверждает или отменяет заявку.

#### Endpoints

```text
POST /api/v1/admin/bookings/:id/confirm
POST /api/v1/admin/bookings/:id/cancel
```

#### Acceptance criteria

- [ ] Admin может подтвердить pending бронь.
- [ ] Admin может отменить pending/confirmed бронь.
- [ ] User получает notification event.
- [ ] Audit log фиксирует действие.

---

### TASK-0505 — Implement booking cancellation rules

**Priority:** P1  
**Labels:** `area:booking`, `area:api`, `type:feature`
**Status:** Done

#### Goal
Ограничить отмену брони по правилам клуба.

#### Scope

- Minimum cancellation time.
- User can cancel only own bookings.
- Admin can cancel operationally.

#### Acceptance criteria

- [ ] Пользователь не может отменить слишком поздно, если правило запрещает.
- [ ] Admin/owner могут отменять по своим правам.
- [ ] Правило покрыто unit tests.

---

### TASK-0506 — Implement active bookings limit

**Priority:** P1  
**Labels:** `area:booking`, `area:api`, `type:feature`
**Status:** Done

#### Goal
Ограничить количество активных броней пользователя.

#### Acceptance criteria

- [ ] Owner может настроить лимит.
- [ ] User не может превысить лимит active bookings.
- [ ] Pending и confirmed учитываются как active.

---

### TASK-0507 — Add concurrent booking integration test

**Priority:** P0  
**Labels:** `area:booking`, `area:tests`, `type:test`
**Status:** Done

#### Goal
Проверить защиту от двойного бронирования.

#### Scenario

Два пользователя одновременно создают бронь одного стола на пересекающееся время.

#### Acceptance criteria

- [ ] Только одна заявка успешно создаётся или подтверждается согласно выбранной бизнес-логике.
- [ ] Вторая получает conflict error.
- [ ] Тест воспроизводим.
- [ ] Тест описан в README/документации как ключевой quality case.

---

### TASK-0508 — Booking gap: admin booking listing and move/reschedule API

**Priority:** P0
**Labels:** `area:booking`, `area:api`, `area:admin`, `type:feature`
**Status:** Done
**GitHub Issue:** [#108](https://github.com/Javakryak/tabletop-booking/issues/108), hardening follow-up [#114](https://github.com/Javakryak/tabletop-booking/issues/114)

#### Goal

Закрыть backend gap для админской очереди броней и переноса брони.

#### Scope

- `GET /api/v1/admin/bookings` для admin/owner с фильтром `status=pending`.
- Безопасный формат очереди с masked phone/email.
- `POST /api/v1/admin/bookings/:bookingId/move` для переноса pending/confirmed брони.
- Переиспользование валидаций слотов, расписания, закрытий и конфликтов.
- Запись history/audit intent и notification signal для move action.

#### Acceptance criteria

- [x] Admin/owner can list pending bookings for the admin queue.
- [x] Unauthorized and regular user roles cannot access admin booking listing.
- [x] Listing response contains masked contact data and does not expose full phone/email.
- [x] Admin/owner can move/reschedule a pending or confirmed booking when the target slot is valid.
- [x] Move/reschedule rejects unavailable tables, closed intervals, invalid slot alignment, and overlapping confirmed bookings.
- [x] Move/reschedule writes booking history and audit event.
- [x] Existing confirm/cancel behavior remains unchanged.

#### Tests

- [x] Unit tests for listing mapping and masked contact data.
- [x] Unit tests for move/reschedule validation and conflict handling.
- [x] Controller/guard tests for admin/owner access.
- [x] API integration test for admin queue + move flow.

---

### TASK-0509 — Admin queue listing integration cleanup (real API only)

**Priority:** P0
**Labels:** `area:booking`, `area:api`, `area:web`, `area:admin`, `type:feature`
**Status:** Done
**GitHub Issue:** [#111](https://github.com/Javakryak/tabletop-booking/issues/111)

#### Goal

Довести интеграцию очереди броней до real API path без локального demo fallback для списка заявок.

#### Scope

- Использовать `GET /api/v1/admin/bookings?status=pending` как основной и единственный источник списка заявок в web admin queue.
- Убрать локальный demo fallback списка заявок при `404`.
- Обновить smoke test для admin queue на реальный ответ listing endpoint.

#### Acceptance criteria

- [x] Admin queue list loads from real API endpoint `/api/v1/admin/bookings?status=pending`.
- [x] No local demo fallback is used for queue listing.
- [x] Existing confirm/cancel flows remain compatible with loaded queue items.
- [x] Smoke test covers real listing + confirm flow.

#### Tests

- [x] Web smoke test for admin queue listing and confirm flow.

---

## 8. Epic 6 — Web app foundation

Цель: создать Next.js приложение с базовым UI, темой, layout и публичными страницами.

---

### TASK-0601 — Create Next.js web app

**Priority:** P0  
**Labels:** `area:web`, `type:feature`
**Status:** Done

#### Goal
Создать `apps/web`.

#### Scope

- Next.js app.
- Tailwind CSS.
- shadcn/ui setup.
- Dark theme by default.
- Base layout.

#### Acceptance criteria

- [ ] Web app запускается локально.
- [ ] Тёмная тема включена по умолчанию.
- [ ] Есть базовая навигация.
- [ ] UI responsive.

---

### TASK-0602 — Build public landing pages

**Priority:** P1  
**Labels:** `area:web`, `type:feature`
**Status:** Done

#### Scope

Страницы:

- `/`;
- `/schedule`;
- `/games`;
- `/rules`;
- `/contacts`.

#### Acceptance criteria

- [ ] Все публичные страницы доступны без логина.
- [ ] Навигация работает.
- [ ] Страницы адаптированы под mobile.
- [ ] Контент можно заменить на реальные данные клуба.

---

### TASK-0603 — Add auth UI

**Priority:** P1  
**Labels:** `area:web`, `area:auth`, `type:feature`
**Status:** Done

#### Goal
Добавить UI входа через Telegram.

#### Scope

- Login page/modal.
- Telegram login entrypoint.
- Profile completion screen.
- Legal consent checkboxes.

#### Acceptance criteria

- [ ] Пользователь может начать Telegram login.
- [ ] После входа попадает в профиль или dashboard.
- [ ] Без обязательных согласий нельзя завершить регистрацию.

---

### TASK-0604 — Add user dashboard

**Priority:** P1  
**Labels:** `area:web`, `type:feature`
**Status:** Done

#### Scope

- Мои брони.
- Мои встречи.
- Профиль.
- Настройки приватности.

#### Acceptance criteria

- [ ] User видит свои активные брони.
- [ ] User видит историю броней.
- [ ] User может обновить профиль.

---

## 9. Epic 7 — Booking UI

Цель: реализовать пользовательский интерфейс бронирования.

---

### TASK-0701 — Build booking calendar components

**Priority:** P1  
**Labels:** `area:web`, `area:booking`, `type:feature`
**Status:** Done

#### Components

```text
BookingCalendar
RoomSelector
TableSelector
SlotPicker
BookingSummary
```

#### Acceptance criteria

- [ ] Components reusable for web and future Mini App.
- [ ] Mobile-first layout.
- [ ] Components do not contain business rules that belong to API.

---

### TASK-0702 — Implement booking creation flow

**Priority:** P1  
**Labels:** `area:web`, `area:booking`, `type:feature`
**Status:** Done

#### Flow

1. Select date.
2. Select room/table.
3. Select slots.
4. Review summary.
5. Submit booking request.
6. See pending status.

#### Acceptance criteria

- [ ] User can create pending booking.
- [ ] Validation errors are shown clearly.
- [ ] Conflict error is handled.
- [ ] Success state explains that admin confirmation is required.

---

### TASK-0703 — Implement booking history UI

**Priority:** P2  
**Labels:** `area:web`, `area:booking`, `type:feature`
**Status:** Done

#### Acceptance criteria

- [ ] User can see active bookings.
- [ ] User can see past bookings.
- [ ] Status labels are clear.
- [ ] User can cancel eligible bookings.

---

## 10. Epic 8 — Admin and owner UI

Цель: создать админскую панель и панель владельца.

---

### TASK-0801 — Build admin layout and route protection

**Priority:** P1  
**Labels:** `area:web`, `area:admin`, `type:feature`
**Status:** Done

#### Acceptance criteria

- [ ] Admin routes require admin/owner role.
- [ ] Unauthorized users cannot access admin pages.
- [ ] Admin navigation exists.

---

### TASK-0802 — Build admin bookings queue

**Priority:** P1  
**Labels:** `area:web`, `area:admin`, `area:booking`, `type:feature`
**Status:** Partial — UI exists; emergency full-phone reveal still needs backend/audit completion.

#### Scope

- Pending bookings list.
- Confirm action.
- Cancel action.
- Booking details.
- Minimal contact info.

#### Acceptance criteria

- [ ] Admin can confirm booking.
- [ ] Admin can cancel booking.
- [ ] Phone/email are hidden or masked unless explicitly needed.
- [ ] Full phone reveal is available only through an explicit emergency contact action.
- [ ] Full phone reveal writes an audit event.
- [ ] Actions update status in UI.

---

### TASK-0803 — Build owner resources management UI

**Priority:** P2  
**Labels:** `area:web`, `area:admin`, `type:feature`
**Status:** Done

#### Scope

- Rooms CRUD.
- Tables CRUD.
- Working hours.
- Schedule exceptions.

#### Acceptance criteria

- [ ] Owner can manage rooms.
- [ ] Owner can manage tables.
- [ ] Owner can edit schedule.
- [ ] Owner can add schedule exceptions.

---

### TASK-0804 — Build user blocking UI

**Priority:** P2  
**Labels:** `area:web`, `area:admin`, `area:auth`, `type:feature`
**Status:** Partial — UI exists; owner block/unblock API and audit behavior still need completion.

#### Acceptance criteria

- [ ] Owner can block user.
- [ ] Blocked user cannot create bookings or meetups.
- [ ] Block action is written to audit log.

---

### TASK-0805 — Build audit log UI

**Priority:** P1  
**Labels:** `area:web`, `area:admin`, `type:feature`
**Status:** Done — UI exists and owner audit-log API is available.

#### Acceptance criteria

- [x] Owner can see audit events.
- [x] Audit log can be filtered by actor/action/date.
- [x] Emergency full-phone reveal events are visible.
- [x] Sensitive data is not exposed unnecessarily.

---

## 11. Epic 9 — Telegram bot

Цель: реализовать Telegram-бота для уведомлений и быстрых действий.

---

### TASK-0901 — Create bot app

**Priority:** P1  
**Labels:** `area:bot`, `type:feature`
**Status:** Partial — package scaffold exists; grammY runtime is still open.

#### Goal
Создать `apps/bot` на grammY.

#### Acceptance criteria

- [ ] Bot запускается локально.
- [ ] Поддерживает polling в dev.
- [ ] Конфиг читает env.
- [ ] Нет токена в репозитории.

---

### TASK-0902 — Implement /start and account linking

**Priority:** P1  
**Labels:** `area:bot`, `area:auth`, `type:feature`
**Status:** Open

#### Acceptance criteria

- [ ] `/start` приветствует пользователя.
- [ ] Telegram user связывается с app user.
- [ ] Повторный `/start` не создаёт дубликат.
- [ ] Есть кнопка открыть сайт/Mini App entrypoint.

---

### TASK-0903 — Implement user bot commands

**Priority:** P2  
**Labels:** `area:bot`, `type:feature`
**Status:** Open

#### Commands

```text
/help
/book
/my_bookings
/my_meetups
/find_game
/cancel
/settings
```

#### Acceptance criteria

- [ ] Commands registered.
- [ ] Responses use buttons where possible.
- [ ] Unsupported states handled gracefully.

---

### TASK-0904 — Implement admin bot commands

**Priority:** P2  
**Labels:** `area:bot`, `area:admin`, `type:feature`
**Status:** Open

#### Commands

```text
/admin
/pending
/today
```

#### Acceptance criteria

- [ ] Only admins/owners can use admin commands.
- [ ] Pending bookings can be viewed.
- [ ] Admin gets clear action buttons.

---

### TASK-0905 — Implement booking notifications

**Priority:** P1  
**Labels:** `area:bot`, `area:booking`, `type:feature`
**Status:** Open — booking backend emits notification-request signals, but delivery is not implemented.

#### Events

- New booking request to admins.
- Booking confirmed to user.
- Booking cancelled to user.
- Booking reminder before game.

#### Acceptance criteria

- [ ] Notifications are queued or safely retried.
- [ ] Failed notification does not break booking transaction.
- [ ] Notification content does not leak unnecessary personal data.

---

### TASK-0906 — Configure Telegram webhooks for staging/production

**Priority:** P2  
**Labels:** `area:bot`, `area:infra`, `type:feature`
**Status:** Open

#### Acceptance criteria

- [ ] Dev uses polling.
- [ ] Staging/production can use webhook.
- [ ] Webhook secret is validated.
- [ ] Setup documented.

---

## 12. Epic 10 — Games and meetups

Цель: реализовать каталог игр и открытые встречи.

---

### TASK-1001 — Add games schema and API

**Priority:** P2  
**Labels:** `area:games`, `area:api`, `area:database`, `type:feature`
**Status:** Open

#### Scope

Game fields:

- title;
- genre;
- duration;
- recommended players;
- complexity;
- photo URL;
- description.

#### Acceptance criteria

- [ ] Users can view active games.
- [ ] Owner/admin can manage games.
- [ ] Games can be used in meetup creation.

---

### TASK-1002 — Build games catalog UI

**Priority:** P2  
**Labels:** `area:games`, `area:web`, `type:feature`
**Status:** Open — public `/games` placeholder page exists, but catalog data/model/filtering is not implemented.

#### Acceptance criteria

- [ ] Public games catalog exists.
- [ ] Game cards are mobile-friendly.
- [ ] Basic filters/search exist or are planned.

---

### TASK-1003 — Add meetups schema and API

**Priority:** P2  
**Labels:** `area:meetups`, `area:api`, `area:database`, `type:feature`
**Status:** Open

#### Scope

Entities:

- meetups;
- meetup_participants;
- meetup_tags;
- meetup_messages.

#### Acceptance criteria

- [ ] User can create open meetup.
- [ ] User can select catalog game or custom game title.
- [ ] User can set player count and date/time.
- [ ] Meetup statuses are enforced.

---

### TASK-1004 — Implement meetup participation

**Priority:** P2  
**Labels:** `area:meetups`, `area:api`, `type:feature`
**Status:** Open

#### Acceptance criteria

- [ ] User can join open meetup.
- [ ] User can leave meetup if rules allow.
- [ ] Duplicate participation is impossible.
- [ ] When enough players join, meetup becomes `ready_to_book`.

---

### TASK-1005 — Implement meetup-to-booking flow

**Priority:** P2  
**Labels:** `area:meetups`, `area:booking`, `area:api`, `type:feature`
**Status:** Open

#### Goal
После набора игроков встреча создаёт заявку на бронь.

#### Acceptance criteria

- [ ] Meetup does not reserve table before enough players join.
- [ ] Ready meetup can create booking request.
- [ ] Booking request has link to meetup.
- [ ] If no table is available, user sees clear error.

---

### TASK-1006 — Implement meetup message feed

**Priority:** P2  
**Labels:** `area:meetups`, `area:api`, `area:web`, `type:feature`
**Status:** Open

#### Goal
Добавить простую ленту сообщений без realtime.

#### Acceptance criteria

- [ ] Only participants can read/write messages.
- [ ] Messages are paginated.
- [ ] Messages are not logged in application logs.
- [ ] Basic moderation/deletion path is planned or implemented.

---

### TASK-1007 — Implement minimal friends feature

**Priority:** P3  
**Labels:** `area:meetups`, `area:web`, `area:api`, `type:feature`
**Status:** Open

#### Scope

- Add friend.
- List friends.
- Invite friend to meetup.

#### Acceptance criteria

- [ ] User can send friend request or add friend according to chosen model.
- [ ] User can see friends list.
- [ ] User can invite friend to meetup.

---

## 13. Epic 11 — Notifications and jobs

Цель: сделать уведомления и отложенные задачи надёжными.

---

### TASK-1101 — Add notification service

**Priority:** P1  
**Labels:** `area:api`, `area:bot`, `type:feature`
**Status:** Partial — booking flows create notification-request audit signals; durable delivery service is open.

#### Goal
Создать единый notification layer.

#### Scope

- Notification events.
- Delivery channels.
- Telegram delivery.
- Delivery status.

#### Acceptance criteria

- [ ] API может создавать notification event.
- [ ] Bot/service доставляет Telegram notification.
- [ ] Failed deliveries are recorded.

---

### TASK-1102 — Add Redis/BullMQ queue

**Priority:** P2  
**Labels:** `area:infra`, `area:api`, `area:bot`, `type:feature`
**Status:** Open

#### Goal
Использовать очередь для уведомлений и напоминаний.

#### Acceptance criteria

- [ ] Notification jobs go through queue.
- [ ] Retry policy exists.
- [ ] Failed jobs are visible in logs.

---

### TASK-1103 — Add booking reminders

**Priority:** P2  
**Labels:** `area:booking`, `area:bot`, `type:feature`
**Status:** Open

#### Goal
Напоминать пользователям перед игрой.

#### Acceptance criteria

- [ ] Reminder is scheduled after booking confirmation.
- [ ] Reminder is cancelled if booking cancelled.
- [ ] Reminder time is configurable or documented.

---

## 14. Epic 12 — Testing and quality

Цель: обеспечить качество проекта и показать зрелый AI-assisted workflow.

---

### TASK-1201 — Configure test framework

**Priority:** P0  
**Labels:** `area:tests`, `type:chore`
**Status:** Done

#### Scope

- Unit test setup.
- Integration test setup.
- Test database configuration.
- Test scripts.

#### Acceptance criteria

- [ ] `pnpm test` works.
- [ ] API tests can use isolated test DB.
- [ ] Tests run in CI.

---

### TASK-1202 — Add booking domain unit tests

**Priority:** P1  
**Labels:** `area:tests`, `area:booking`, `type:test`
**Status:** Done

#### Acceptance criteria

- [ ] Availability rules tested.
- [ ] Status transitions tested.
- [ ] Cancellation rules tested.
- [ ] Active booking limit tested.

---

### TASK-1203 — Add API integration tests

**Priority:** P1  
**Labels:** `area:tests`, `area:api`, `type:test`
**Status:** Done

#### Scenarios

- User registration.
- Create booking.
- Confirm booking.
- Cancel booking.
- Unauthorized access.

#### Acceptance criteria

- [ ] Critical API flows are covered.
- [ ] Tests use test DB.
- [ ] Tests are deterministic.

---

### TASK-1204 — Add Playwright smoke tests

**Priority:** P2  
**Labels:** `area:tests`, `area:web`, `type:test`
**Status:** Open

#### Scenarios

- Open landing page.
- Login/demo mode.
- Create booking request.
- Admin confirms booking.

#### Acceptance criteria

- [ ] Smoke tests run locally.
- [ ] Smoke tests can run in CI or documented manual mode.

---

### TASK-1205 — Add bot tests

**Priority:** P2  
**Labels:** `area:tests`, `area:bot`, `type:test`
**Status:** Open

#### Acceptance criteria

- [ ] `/start` tested.
- [ ] User commands tested.
- [ ] Admin command authorization tested.
- [ ] Notification formatting tested.

---

### TASK-1206 — Add security and privacy tests

**Priority:** P2  
**Labels:** `area:tests`, `area:legal`, `area:auth`, `type:test`
**Status:** Partial — role/auth and booking privacy tests exist; focused privacy/security suite still needs hardening.

#### Acceptance criteria

- [ ] User cannot access another user's bookings.
- [ ] Admin cannot access owner-only endpoints.
- [ ] Sensitive fields are not returned to unauthorized roles.
- [ ] Blocked user cannot create bookings.

---

## 15. Epic 13 — CI/CD and deployment

Цель: подготовить staging, production и минимальный production monitoring.

---

### TASK-1301 — Add GitHub Actions CI

**Priority:** P1  
**Labels:** `area:infra`, `type:chore`
**Status:** Partial — GitHub Actions runs lint, typecheck, unit tests, and API integration tests; build job is still open.

#### Pipeline

- install;
- lint;
- typecheck;
- test;
- build.

#### Acceptance criteria

- [ ] CI запускается на PR.
- [ ] CI блокирует merge при ошибках.
- [ ] Cache настроен для pnpm.

---

### TASK-1302 — Add Dockerfiles

**Priority:** P1  
**Labels:** `area:infra`, `type:chore`
**Status:** Open

#### Scope

- Dockerfile for API.
- Dockerfile for Web.
- Dockerfile for Bot.
- Production compose file.

#### Acceptance criteria

- [ ] Images build successfully.
- [ ] Production compose can start services.
- [ ] Images do not include unnecessary dev files.

---

### TASK-1303 — Add reverse proxy and HTTPS config

**Priority:** P1  
**Labels:** `area:infra`, `type:feature`
**Status:** Open

#### Scope

Use Caddy or nginx.

#### Acceptance criteria

- [ ] Web is served over HTTPS.
- [ ] API is reachable over HTTPS.
- [ ] Telegram webhook endpoint can be exposed.
- [ ] Config documented.

---

### TASK-1304 — Add backup scripts

**Priority:** P1  
**Labels:** `area:infra`, `area:database`, `type:feature`
**Status:** Open

#### Goal
Настроить PostgreSQL backups.

#### Acceptance criteria

- [ ] Backup script exists.
- [ ] Restore script or instructions exist.
- [ ] Backup schedule documented.
- [ ] Sensitive backup handling documented.

---

### TASK-1305 — Add production deployment guide

**Priority:** P1  
**Labels:** `area:docs`, `area:infra`, `type:docs`
**Status:** Open

#### Acceptance criteria

- [ ] Документ описывает staging deployment.
- [ ] Документ описывает production deployment.
- [ ] Описаны env variables.
- [ ] Описаны Telegram webhook setup.
- [ ] Описаны backups and restore.

---

### TASK-1306 — Add uptime monitoring instructions

**Priority:** P2  
**Labels:** `area:infra`, `area:docs`, `type:docs`
**Status:** Open

#### Acceptance criteria

- [ ] Healthcheck URL documented.
- [ ] Recommended uptime monitoring setup documented.
- [ ] Alerting contacts documented without committing private data.

---

## 16. Epic 14 — Privacy, legal and audit

Цель: реализовать минимально необходимую privacy/legal инфраструктуру для реального использования клубом.

---

### TASK-1401 — Add legal documents pages

**Priority:** P1  
**Labels:** `area:legal`, `area:web`, `type:feature`
**Status:** Partial — rules page exists; dedicated legal document pages are open.

#### Pages

- privacy policy;
- user agreement;
- personal data consent;
- club rules.

#### Acceptance criteria

- [ ] Pages are accessible publicly.
- [ ] Versions are displayed or stored.
- [ ] Text is marked as template/pending legal review if not final.

---

### TASK-1402 — Implement audit logging service

**Priority:** P1  
**Labels:** `area:api`, `area:admin`, `area:legal`, `type:feature`
**Status:** Partial — audit events exist for several critical actions; full-phone reveal flow and owner audit API are still incomplete.

#### Events

- booking created;
- booking confirmed;
- booking cancelled;
- user blocked;
- schedule changed;
- room/table changed;
- role changed;
- emergency full-phone reveal.

#### Acceptance criteria

- [ ] Audit events are written for critical admin/owner actions.
- [x] Emergency full-phone reveal is audit-logged.
- [x] Audit log does not store sensitive values unnecessarily.
- [x] Owner can view audit log via UI/API.

---

### TASK-1403 — Implement personal data export placeholder

**Priority:** P2  
**Labels:** `area:legal`, `area:api`, `type:feature`
**Status:** Open

#### Goal
Добавить основу для выгрузки данных пользователя.

#### Acceptance criteria

- [ ] User can request export.
- [ ] System can produce JSON export or queued request.
- [ ] Scope of exported data is documented.

---

### TASK-1404 — Add sensitive data redaction utilities

**Priority:** P1  
**Labels:** `area:legal`, `area:api`, `type:feature`
**Status:** Partial — log redaction exists; shared API masking utilities need completion.

#### Acceptance criteria

- [ ] Phone/email masking utility exists.
- [ ] Admin UI/API uses masked values by default.
- [ ] Logs redact sensitive fields.

---

## 17. Epic 15 — Portfolio packaging

Цель: оформить проект как сильный портфолио-кейс AI-assisted developer.

---

### TASK-1501 — Improve README for portfolio

**Priority:** P2  
**Labels:** `area:portfolio`, `area:docs`, `type:docs`
**Status:** Partial — README is updated for current implementation; screenshots/GIF placeholders and demo packaging remain open.

#### README sections

- Project overview.
- Business context.
- Features.
- Tech stack.
- Architecture.
- Local setup.
- Tests.
- AI-assisted workflow.
- Demo accounts.
- Roadmap.

#### Acceptance criteria

- [ ] README understandable in 2–3 minutes.
- [ ] Contains screenshots/GIF placeholders.
- [ ] Explains Codex workflow.

---

### TASK-1502 — Add demo mode

**Priority:** P2  
**Labels:** `area:portfolio`, `area:web`, `area:api`, `type:feature`
**Status:** Open — demo seed data exists, but `/demo` mode does not.

#### Goal
Позволить работодателю посмотреть проект без реальных данных.

#### Scope

- Demo user.
- Demo admin.
- Demo owner.
- Safe seeded data.

#### Acceptance criteria

- [ ] `/demo` explains available demo roles.
- [ ] Demo mode does not expose real personal data.
- [ ] Demo reset strategy documented.

---

### TASK-1503 — Add prompt log

**Priority:** P2  
**Labels:** `area:portfolio`, `area:docs`, `type:docs`
**Status:** Open

#### Goal
Показать AI-assisted development process.

#### Acceptance criteria

- [ ] `docs/codex/prompt-log.md` exists.
- [ ] Logs are summarized, not raw sensitive conversations.
- [ ] Each major feature links to prompts/tasks where appropriate.

---

### TASK-1504 — Add dev diary

**Priority:** P2  
**Labels:** `area:portfolio`, `area:docs`, `type:docs`
**Status:** Open

#### Acceptance criteria

- [ ] `docs/codex/dev-diary.md` exists.
- [ ] Describes decisions, trade-offs, AI usage, review process.
- [ ] Does not include secrets or private data.

---

### TASK-1505 — Add architecture diagrams

**Priority:** P2  
**Labels:** `area:portfolio`, `area:docs`, `type:docs`
**Status:** Open

#### Diagrams

- System context.
- Components.
- Database ERD.
- Booking flow.
- Telegram flow.

#### Acceptance criteria

- [ ] Diagrams are stored in docs.
- [ ] README links to diagrams.
- [ ] Diagrams match current implementation.

---


### TASK-1507 — Build owner statistics dashboard

**Priority:** P2  
**Labels:** `area:web`, `area:admin`, `type:feature`, `scope:portfolio-polish`
**Status:** Open

#### Scope

- Booking counts.
- Table utilization.
- Popular games.
- Cancellations.
- Meetup activity.

#### Acceptance criteria

- [ ] Owner can view aggregate statistics.
- [ ] No unnecessary personal data is shown.
- [ ] Queries are documented and tested.

---

### TASK-1508 — Implement CSV/Excel exports

**Priority:** P2  
**Labels:** `area:api`, `area:web`, `area:admin`, `type:feature`, `scope:portfolio-polish`
**Status:** Open

#### Scope

- Bookings export.
- Users export with minimal necessary fields.
- Audit logging for export actions.

#### Acceptance criteria

- [ ] Owner can export CSV.
- [ ] Excel export is implemented or explicitly documented as deferred.
- [ ] Exporting personal data writes an audit event.
- [ ] Exports do not include Telegram ID or sensitive fields unless explicitly required.

---

### TASK-1506 — Add GIF/video demo assets

**Priority:** P3  
**Labels:** `area:portfolio`, `area:docs`, `type:docs`
**Status:** Open

#### Scenarios

- User creates booking.
- Admin confirms booking.
- Telegram notification.
- User creates meetup.

#### Acceptance criteria

- [ ] README contains demo links or placeholders.
- [ ] Demo does not show real personal data.

---

## 18. Suggested milestone order

### Milestone 1 — Repository and local foundation

Tasks:

- TASK-0001
- TASK-0002
- TASK-0003
- TASK-0004
- TASK-0005
- TASK-0101
- TASK-0102
- TASK-0201
- TASK-0202
- TASK-0203
- TASK-1201

### Milestone 2 — Database and auth

Tasks:

- TASK-0103
- TASK-0104
- TASK-0301
- TASK-0302
- TASK-0303
- TASK-0304

### Milestone 3 — Booking backend

Tasks:

- TASK-0401
- TASK-0402
- TASK-0403
- TASK-0404
- TASK-0501
- TASK-0502
- TASK-0503
- TASK-0504
- TASK-0505
- TASK-0506
- TASK-0507

### Milestone 4 — Web MVP

Tasks:

- TASK-0601
- TASK-0602
- TASK-0603
- TASK-0604
- TASK-0701
- TASK-0702
- TASK-0703
- TASK-0801
- TASK-0802
- TASK-0803
- TASK-0805

### Milestone 5 — Telegram MVP

Tasks:

- TASK-0901
- TASK-0902
- TASK-0903
- TASK-0904
- TASK-0905
- TASK-0906
- TASK-1101

### Milestone 6 — Meetups MVP

Tasks:

- TASK-1001
- TASK-1002
- TASK-1003
- TASK-1004
- TASK-1005
- TASK-1006

### Milestone 7 — Production readiness

Tasks:

- TASK-0204
- TASK-1102
- TASK-1103
- TASK-1202
- TASK-1203
- TASK-1204
- TASK-1205
- TASK-1206
- TASK-1301
- TASK-1302
- TASK-1303
- TASK-1304
- TASK-1305
- TASK-1306
- TASK-1401
- TASK-1402
- TASK-1404

### Milestone 8 — Portfolio polish

Tasks:

- TASK-1501
- TASK-1502
- TASK-1503
- TASK-1504
- TASK-1505
- TASK-1506
- TASK-1507
- TASK-1508

---

## 19. Next 10 tasks for Codex

Рекомендуемый следующий набор задач после текущего состояния `main`:

1. Finish backend endpoint for owner audit-log listing used by `/admin/audit-logs`.
2. Finish emergency full-phone reveal endpoint with required audit event and reason payload.
3. Finish owner user block/unblock endpoint and audit behavior used by `/admin/users`.
4. TASK-0901 — Create real grammY bot app runtime.
5. TASK-0902 — Implement `/start` and account linking.
6. TASK-1101 — Add notification service for booking events.
7. TASK-0905 — Implement Telegram booking notifications.
8. TASK-1302 — Add Dockerfiles and production compose.
9. TASK-1305 — Add production deployment guide, including Telegram webhook setup.
10. TASK-1204 — Add Playwright smoke tests for critical web flows.

---

## 20. Definition of MVP done

MVP можно считать готовым, когда выполнены условия:

- [x] Пользователь может зарегистрироваться через Telegram web auth payload.
- [x] Пользователь может заполнить профиль, включая телефон для экстренной связи.
- [x] Телефон nullable в БД, но обязателен для создания реальной брони.
- [x] Пользователь может создать заявку на бронь стола.
- [x] Администратор может подтвердить или отменить бронь.
- [ ] Пользователь получает Telegram-уведомление.
- [x] Владелец может управлять помещениями, столами и расписанием.
- [~] Владелец может просматривать audit log — UI foundation exists; backend listing endpoint still needs completion.
- [x] Система предотвращает двойное бронирование одного стола.
- [x] Есть базовые тесты ключевой бизнес-логики.
- [x] Есть Swagger/OpenAPI.
- [x] Есть seed demo-data.
- [x] Есть Docker-based local setup.
- [ ] Есть staging и production deployment plan.
- [ ] Есть бэкапы БД.
- [x] Есть healthcheck.
- [ ] Нет реальных секретов и персональных данных в репозитории.
- [x] README объясняет проект как AI-assisted portfolio case.

---

## 21. Out of scope until after MVP

Не начинать до завершения основного MVP:

- VK ID;
- Yandex ID;
- SMS OTP;
- онлайн-платежи;
- полноценный realtime chat;
- сложная социальная сеть;
- SaaS/multi-club;
- маркетинговая аналитика;
- рекламные пиксели;
- Kubernetes;
- mobile native apps;
- сложная BI-аналитика;
- статистика и CSV/Excel export до MVP 3, если для них нет отдельного приоритетного issue.
