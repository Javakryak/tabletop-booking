# ROADMAP.md

> Roadmap проекта приложения бронирования игровых столов для клуба настольных игр и варгеймов.
>
> Проект создаётся для реального использования клубом и как портфолио-кейс AI-assisted development с публичной демонстрацией процесса работы через Codex.

---

## 1. Цели проекта

### 1.1. Продуктовая цель

Создать рабочее приложение для одного клуба настольных игр и варгеймов, которое позволяет:

- пользователям бронировать игровые столы;
- администраторам подтверждать и управлять бронями;
- владельцу клуба управлять помещениями, столами, расписанием и правилами;
- пользователям создавать открытые встречи по конкретным играм;
- участникам получать уведомления через Telegram;
- клубу использовать систему без платной коммерческой логики.

### 1.2. Портфолио-цель

Показать работодателю полный цикл AI-assisted разработки:

- сбор и уточнение требований;
- архитектурное проектирование;
- декомпозиция на задачи;
- разработка через Codex и PR;
- тестирование критичных сценариев;
- деплой staging/production;
- документация решений;
- prompt log и dev diary;
- демонстрация работающего продукта.

---

## 2. Принятые ключевые решения

| Область | Решение |
|---|---|
| Тип продукта | Приложение для одного клуба, не SaaS |
| Основной стек | TypeScript monorepo |
| Frontend | Next.js |
| Backend | NestJS |
| Telegram bot | grammY |
| База данных | PostgreSQL |
| ORM | Prisma |
| Очереди / напоминания | Redis + BullMQ |
| UI | Tailwind CSS + shadcn/ui |
| API | REST API |
| Документация API | OpenAPI / Swagger |
| Версионирование API | `/api/v1` |
| Auth | Telegram-first |
| Email | Опционально, для альтернативного входа и восстановления доступа |
| Телефон | Обязателен для экстренной связи |
| Telegram Mini App | Нужен, но не в первой итерации; архитектуру готовить сразу |
| Бронь встречи | Стол резервируется только после набора участников |
| Чат | Простая лента сообщений в MVP, без realtime |
| Оплаты | Нет |
| Деплой | Российский VPS / Selectel / Timeweb / Яндекс Cloud |
| Окружения | staging и production |
| Мониторинг MVP | structured logs, healthcheck, uptime monitoring, backups |
| Privacy | Минимизация данных, согласия, удаление/выгрузка данных |

---

## 3. Границы MVP

## 3.1. MVP 1 — Core Booking System

Главная цель: надёжное бронирование столов с подтверждением администратором.

Входит:

- регистрация и вход через Telegram;
- профиль пользователя;
- телефон для экстренной связи: nullable в БД, но обязательный для создания реальной брони;
- email как опциональное поле;
- роли: гость, пользователь, администратор, владелец;
- помещения клуба;
- игровые столы;
- расписание клуба;
- исключения расписания;
- блокировки помещений и столов;
- правила бронирования;
- создание заявки на бронь;
- подтверждение / отмена / перенос брони администратором;
- история броней пользователя;
- Telegram-уведомления;
- базовая админская панель;
- панель владельца;
- Swagger/OpenAPI;
- PostgreSQL + Prisma;
- Docker Compose;
- seed demo-data;
- базовые тесты;
- staging и production;
- healthcheck;
- structured logs;
- базовый audit log для admin/owner actions и просмотра экстренного контакта;
- backups.

## 3.2. MVP 2 — Meetups & Game Catalog

Главная цель: добавить поиск игроков и встречи по играм.

Входит:

- каталог игр клуба;
- создание открытой встречи;
- выбор игры из каталога или указание своей игры;
- теги встреч;
- присоединение к встрече;
- простая лента сообщений;
- создание заявки на бронь после набора участников;
- Telegram-уведомления по встречам;
- минимальная функция друзей;
- приглашение друзей во встречу.

## 3.3. MVP 3 — Portfolio Polish

Главная цель: довести проект до сильного портфолио-кейса.

Входит:

- `/demo` режим без реальных персональных данных;
- демо-аккаунты пользователя, администратора и владельца;
- качественный README;
- архитектурная документация;
- ERD-диаграмма;
- prompt log;
- dev diary;
- видео или GIF-сценарии;
- CI/CD;
- расширенные e2e-тесты;
- concurrency test;
- CSV/Excel export;
- статистика.

Примечание: базовый audit log не относится к portfolio polish — он обязателен уже в MVP 1.

## 3.4. Не входит в MVP

- онлайн-платежи;
- VK ID;
- Яндекс ID;
- SMS OTP;
- полноценный realtime-чат;
- сложная социальная сеть;
- маркетинговая аналитика;
- рекламные пиксели;
- SaaS / multi-club;
- кассовая или коммерческая логика;
- Storybook в первой версии.

---

# 3.5. Current Implementation Snapshot

Статус на текущей ветке `main`:

- [x] Foundation, monorepo, workspace scripts, env examples, lint/format/typecheck setup.
- [x] Local PostgreSQL/Redis Docker Compose.
- [x] Prisma schema, migrations, database package, seed demo-data.
- [x] NestJS API foundation: `/api/v1`, Swagger, validation, error handling, structured logs, request/correlation id, healthcheck.
- [x] Auth/user/legal backend: Telegram web login verification, Telegram Mini App init data verification, JWT sessions, roles/guards, profile/privacy endpoints, legal consent acceptance, account deletion request.
- [x] Core resources and booking backend: rooms, tables, working hours, schedule exceptions, closures, booking availability, create request, cancellation rules, active booking limits, admin confirmation/cancellation, status history, audit events, concurrency protection.
- [x] Web MVP foundation: public pages, auth/profile flow, dashboard, booking creation/history UI, admin layout, admin booking queue, owner resource screens, user blocking UI, audit-log UI foundation.
- [x] Test foundation, booking domain tests, API integration tests, and CI for lint/typecheck/tests.
- [~] Admin/privacy backend integration is partial: some web screens still have demo/fallback behavior until audit-log listing, emergency full-phone reveal, and user block/unblock APIs are complete.
- [~] Notification events are represented by audit/log signals, but real notification delivery is not implemented.
- [ ] Telegram bot runtime, `/start`, commands, webhooks, and Telegram notifications.
- [ ] Production deployment, Dockerfiles, reverse proxy/HTTPS, backups, uptime monitoring, and runbooks.
- [ ] MVP 2 game catalog and meetups.
- [ ] Portfolio demo mode, prompt log, dev diary, diagrams, and media assets.

---

# 4. Фазы реализации

---

## Phase 0 — Project Definition

**Цель:** зафиксировать требования, архитектурные решения и правила разработки.

### Deliverables

- [ ] `README.md` с кратким описанием проекта;
- [ ] `ROADMAP.md`;
- [ ] `AGENTS.md`;
- [ ] `CONTRIBUTING.md`;
- [ ] `docs/product/requirements.md`;
- [ ] `docs/codex/prompt-log.md`;
- [ ] `docs/codex/dev-diary.md`;
- [ ] `docs/codex/review-checklist.md`;
- [ ] GitHub repository;
- [ ] GitHub Issues / Milestones.

### Acceptance Criteria

- Документы описывают MVP и не-MVP функции.
- Codex может брать задачи из issues без дополнительного контекста.
- В репозитории есть правила веток, PR и тестирования.

---

## Phase 1 — Repository & Local Infrastructure

**Цель:** подготовить монорепозиторий и локальное окружение разработки.

### Tasks

- [x] Инициализировать monorepo.
- [x] Настроить `pnpm workspaces` или Turborepo.
- [x] Создать базовую структуру:

```text
apps/
  web/
  api/
  bot/
packages/
  shared/
  config/
  database/
  ui/
docs/
prisma/
scripts/
docker/
.github/
```

- [x] Создать Next.js приложение `apps/web`.
- [x] Создать NestJS приложение `apps/api`.
- [~] Создать Telegram bot приложение `apps/bot` — package scaffold exists, grammY runtime is not implemented.
- [x] Настроить TypeScript config.
- [x] Настроить ESLint.
- [x] Настроить Prettier.
- [x] Настроить `.env.example`.
- [x] Добавить Docker Compose для PostgreSQL и Redis.
- [x] Добавить базовый CI: lint, typecheck, test.

### Deliverables

- [x] Рабочий monorepo.
- [x] Локально поднимаются PostgreSQL и Redis.
- [~] Все приложения стартуют в dev-режиме — web/API are implemented; bot runtime is still pending.
- [x] CI проходит для реализованных workspace checks.

### Acceptance Criteria

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
```

Все команды выполняются без ошибок.

---

## Phase 2 — Database & Domain Foundation

**Цель:** создать базовую модель данных и миграции.

### Tasks

- [x] Настроить Prisma.
- [x] Подключить PostgreSQL.
- [x] Создать начальную схему БД.
- [x] Добавить миграции.
- [x] Добавить seed demo-data.
- [x] Создать database package.
- [x] Добавить enum статусов брони.
- [ ] Добавить enum статусов встречи.
- [x] Добавить базовые роли.

### Core Entities

- [x] `User`;
- [x] `UserProfile`;
- [x] `Role` / role enum;
- [x] `UserRole`;
- [x] `Room`;
- [x] `GameTable`;
- [x] `ClubWorkingHours`;
- [x] `ScheduleException`;
- [x] `RoomClosure`;
- [x] `TableClosure`;
- [x] `BookingRule`;
- [x] `Booking`;
- [x] `BookingStatusHistory`;
- [ ] `Game`;
- [ ] `Meetup`;
- [ ] `MeetupParticipant`;
- [ ] `MeetupMessage`;
- [ ] `Friendship`;
- [ ] `Notification`;
- [x] `AuditLog`;
- [x] `LegalDocument`;
- [x] `Consent`.

### Acceptance Criteria

- Миграции применяются на чистую БД.
- Seed создаёт тестовый клуб, помещения, столы, пользователей и роли.
- Есть минимум три demo-пользователя:
  - `demo-user`;
  - `demo-admin`;
  - `demo-owner`.

---

## Phase 3 — Backend Foundation

**Цель:** поднять NestJS API с базовой структурой, Swagger и healthcheck.

### Tasks

- [x] Настроить глобальный префикс `/api/v1`.
- [x] Настроить Swagger/OpenAPI.
- [x] Настроить validation pipe.
- [x] Настроить error handling.
- [x] Настроить structured logging.
- [x] Добавить request id / correlation id.
- [x] Добавить healthcheck endpoint.
- [x] Подключить Prisma/database package.
- [~] Подключить Redis service — healthcheck verifies Redis connectivity; queue/service layer is pending.

### Modules

- [x] Health/system endpoints;
- [x] `AuthModule`;
- [x] User/profile endpoints;
- [x] `RoomsModule`;
- [x] `TablesModule`;
- [x] `ScheduleModule`;
- [x] `BookingsModule`;
- [ ] `GamesModule`;
- [ ] `MeetupsModule`;
- [ ] `NotificationsModule`;
- [~] Admin/owner endpoints;
- [x] Audit logging exists; owner audit-log listing and emergency reveal APIs are implemented.
- [x] `LegalModule`.

### Acceptance Criteria

- `GET /api/v1/health` возвращает состояние API, PostgreSQL и Redis.
- Swagger доступен локально.
- Ошибки возвращаются в едином формате.
- Логи не содержат секретов и персональных данных.

---

## Phase 4 — Authentication, Users & Roles

**Цель:** реализовать Telegram-first авторизацию, профили и роли.

### Tasks

- [x] Реализовать модель пользователя.
- [x] Реализовать роли и guards.
- [x] Реализовать Telegram login flow для web.
- [ ] Реализовать связку аккаунта через Telegram bot `/start`.
- [x] Добавить профиль пользователя.
- [x] Добавить телефон для экстренной связи.
- [x] Добавить опциональный email.
- [x] Добавить настройки приватности.
- [~] Добавить блокировку пользователя владельцем — UI exists; backend endpoint still needs completion.
- [x] Добавить acceptance of legal documents.

### Role Matrix

| Действие | Гость | Пользователь | Админ | Владелец |
|---|---:|---:|---:|---:|
| Смотреть публичные страницы | Да | Да | Да | Да |
| Создать бронь | Нет | Да | Да | Да |
| Подтвердить бронь | Нет | Нет | Да | Да |
| Управлять столами | Нет | Нет | Нет | Да |
| Управлять расписанием | Нет | Нет | Да | Да |
| Блокировать пользователей | Нет | Нет | Нет | Да |
| Смотреть audit log | Нет | Нет | Нет | Да |

### Acceptance Criteria

- Пользователь может войти через Telegram.
- Пользователь не может бронировать без принятия обязательных документов.
- Заблокированный пользователь не может создавать брони и встречи.
- Администратор не видит лишние персональные данные.

---

## Phase 5 — Rooms, Tables & Schedule

**Цель:** реализовать управление помещениями, столами и расписанием клуба.

### Tasks

- [x] CRUD помещений.
- [x] CRUD столов.
- [x] Настройка вместимости стола.
- [x] Блокировка помещения.
- [x] Блокировка стола.
- [x] Базовое недельное расписание.
- [x] Исключения расписания по датам.
- [x] Сокращённые дни.
- [x] Выходные и праздники.
- [x] API получения доступных слотов.

### Acceptance Criteria

- Владелец может создать помещение и столы.
- Администратор и владелец могут управлять расписанием.
- Пользователь видит только доступные для бронирования слоты.
- Заблокированные помещения и столы недоступны для новых броней.

---

## Phase 6 — Booking Core

**Цель:** реализовать основной сценарий бронирования столов.

### Booking Statuses

```text
pending
confirmed
cancelled_by_user
cancelled_by_admin
completed
expired
```

### Tasks

- [x] Создание заявки на бронь.
- [x] Проверка рабочего времени клуба.
- [x] Проверка исключений расписания.
- [x] Проверка блокировок помещения и стола.
- [x] Проверка лимита активных броней.
- [x] Проверка права пользователя бронировать.
- [x] Подтверждение брони администратором.
- [x] Отмена брони пользователем.
- [x] Отмена брони администратором.
- [ ] Перенос брони администратором.
- [x] История броней пользователя.
- [x] История статусов брони.
- [ ] Завершение прошедших броней.
- [ ] Expiration для неподтверждённых заявок.

### Critical Constraint

Нельзя допустить двойное бронирование одного стола на пересекающееся время.

Проверка пересечения:

```text
existing.start_at < requested.end_at
AND
existing.end_at > requested.start_at
```

### Acceptance Criteria

- Пользователь может создать заявку на бронь.
- Администратор может подтвердить заявку.
- Пользователь получает актуальный статус брони.
- Нельзя создать две подтверждённые брони на один стол и пересекающееся время.
- Есть integration test для race condition.

---

## Phase 7 — Admin & Owner UI

**Цель:** создать интерфейсы для операционной работы клуба.

### Admin Panel Tasks

- [x] Список заявок на подтверждение.
- [ ] Календарь броней на день.
- [x] Подтверждение брони.
- [x] Отмена брони.
- [ ] Перенос брони.
- [x] Просмотр минимальных контактов пользователя.
- [x] Управление расписанием.

### Owner Panel Tasks

- [x] Управление помещениями.
- [x] Управление столами.
- [x] Управление правилами бронирования.
- [~] Управление пользователями — UI foundation exists; backend user-management actions are partial.
- [~] Блокировка пользователей — UI foundation exists; backend endpoint still needs completion.
- [~] Просмотр audit log — UI foundation exists; owner audit-log API still needs completion.

### Owner Panel Tasks — Portfolio Polish / MVP 3

- [ ] Базовая статистика.
- [ ] Экспорт CSV/Excel.

### Acceptance Criteria

- Админ может обработать заявку без доступа к лишним персональным данным.
- Полный телефон доступен администратору только через явное break-glass действие для экстренной связи.
- Просмотр полного телефона пишется в audit log.
- Владелец может настроить клуб без изменения кода.
- Все административные действия пишутся в audit log.

---

## Phase 8 — Public Website & User UI

**Цель:** создать публичный сайт и пользовательский интерфейс бронирования.

### Public Pages

- [x] Главная.
- [x] Расписание.
- [x] Игры.
- [x] Правила.
- [x] Контакты.

### User App

- [x] Профиль.
- [x] Мои брони.
- [x] Создание брони.
- [x] История броней.
- [x] Настройки приватности.
- [x] Legal documents acceptance.

### Design Requirements

- [x] Mobile-first.
- [x] Тёмная тема по умолчанию.
- [~] Доступность базового уровня.
- [x] UI на основе Tailwind CSS + shadcn/ui.

### Acceptance Criteria

- Пользователь может пройти сценарий бронирования с мобильного устройства.
- Публичные страницы доступны без авторизации.
- Приватные страницы требуют авторизации.
- Интерфейс готов к переиспользованию в Telegram Mini App.

---

## Phase 9 — Telegram Bot

**Цель:** реализовать Telegram-бота как канал уведомлений и альтернативный интерфейс.

### User Commands

```text
/start
/help
/book
/my_bookings
/my_meetups
/find_game
/cancel
/settings
```

### Admin Commands

```text
/admin
/pending
/today
```

### Tasks

- [ ] Настроить grammY.
- [ ] Реализовать `/start`.
- [ ] Реализовать связку Telegram-аккаунта.
- [ ] Реализовать уведомления о создании заявки.
- [ ] Реализовать уведомления о подтверждении брони.
- [ ] Реализовать уведомления об отмене.
- [ ] Реализовать напоминания перед игрой.
- [ ] Реализовать уведомления администраторам.
- [ ] Реализовать inline-кнопки для быстрых действий.
- [ ] Подготовить кнопку запуска Mini App.

### Runtime Modes

| Среда | Mode |
|---|---|
| local | polling |
| staging | webhook |
| production | webhook |

### Acceptance Criteria

- Пользователь получает уведомление о статусе брони.
- Администратор получает уведомление о новой заявке.
- Пользователь может открыть бронирование из бота.
- Bot tests покрывают основные команды и callback-кнопки.

---

## Phase 10 — Game Catalog & Meetups

**Цель:** добавить сценарий поиска игроков и открытых встреч.

### Game Catalog Tasks

- [ ] CRUD игр владельцем.
- [ ] Публичный список игр.
- [ ] Фильтрация по жанру, длительности, сложности.
- [ ] Фото игры.
- [ ] Рекомендуемое количество игроков.

### Meetup Tasks

- [ ] Создание открытой встречи.
- [ ] Выбор игры из каталога.
- [ ] Указание своей игры.
- [ ] Указание даты и времени.
- [ ] Указание нужного количества игроков.
- [ ] Теги встречи.
- [ ] Присоединение к встрече.
- [ ] Выход из встречи.
- [ ] Простая лента сообщений.
- [ ] Перевод встречи в `ready_to_book` после набора игроков.
- [ ] Создание заявки на бронь после набора игроков.
- [ ] Уведомления участникам.

### Meetup Statuses

```text
draft
open
ready_to_book
booking_pending
booked
cancelled
expired
completed
```

### Acceptance Criteria

- Пользователь может создать открытую встречу.
- Другие пользователи могут присоединиться.
- Если нужное количество участников не набрано, бронь не создаётся.
- После набора участников можно создать заявку на бронь.
- Лента сообщений доступна только участникам встречи.

---

## Phase 11 — Telegram Mini App Preparation

**Цель:** подготовить архитектуру к Mini App и реализовать первый entrypoint.

### Tasks

- [x] Выделить переиспользуемые компоненты бронирования.
- [x] Выделить mobile-first layout.
- [ ] Подготовить route для Mini App.
- [x] Реализовать проверку Telegram init data.
- [ ] Подготовить кнопку открытия Mini App из бота.
- [ ] Проверить базовый сценарий открытия приложения внутри Telegram.

### Acceptance Criteria

- Бронирование можно открыть из Telegram.
- UI корректно отображается в мобильном Telegram WebView.
- Auth flow для Mini App спроектирован и задокументирован.

---

## Phase 12 — Legal & Privacy

**Цель:** реализовать техническую поддержку privacy/legal требований.

### Tasks

- [x] Добавить legal documents model.
- [x] Добавить consent records.
- [x] Добавить обязательное принятие документов при регистрации.
- [x] Добавить версионирование документов.
- [ ] Добавить страницу privacy policy.
- [ ] Добавить страницу user agreement.
- [ ] Добавить страницу согласия на обработку ПДн.
- [x] Добавить запрос на удаление аккаунта.
- [ ] Добавить экспорт данных пользователя.
- [ ] Добавить анонимизацию персональных данных.

### Privacy Rules

Не логировать:

- Telegram bot token;
- JWT/session token;
- телефон;
- email;
- Telegram init data;
- cookies;
- содержимое приватных сообщений.

### Acceptance Criteria

- Пользователь не может пользоваться приватными функциями без принятия документов.
- Согласия сохраняются с датой, версией документа, IP и user-agent.
- Пользователь может запросить удаление аккаунта.
- Персональные данные можно экспортировать.

---

## Phase 13 — Testing & Quality

**Цель:** обеспечить надёжность критичных сценариев и показать зрелый engineering process.

### Unit Tests

- [x] Правила бронирования.
- [x] Проверка пересечений.
- [x] Лимит активных броней.
- [x] Права доступа.
- [x] Статусы брони.
- [ ] Статусы встречи.

### Integration Tests

- [x] Создание пользователя.
- [x] Создание заявки на бронь.
- [x] Подтверждение брони.
- [x] Отмена брони.
- [x] Конфликт бронирования.
- [ ] Создание встречи.
- [ ] Набор участников.

### API E2E Tests

- [x] User creates booking request.
- [x] Admin confirms booking.
- [x] User cancels booking.
- [x] Owner blocks table.
- [~] Blocked user cannot book — backend rejects inactive/blocked user state, owner block endpoint still needs completion.

### UI E2E Tests

- [ ] Открыть главную страницу.
- [ ] Войти в demo mode.
- [ ] Создать бронь.
- [ ] Открыть админку.
- [ ] Подтвердить бронь.

### Bot Tests

- [ ] `/start`.
- [ ] `/my_bookings`.
- [ ] booking notification.
- [ ] admin notification.
- [ ] callback buttons.

### Critical Test

- [x] Два пользователя одновременно пытаются забронировать один стол на пересекающееся время.
- [x] Система создаёт или подтверждает только одну бронь.
- [x] Вторая попытка получает понятную ошибку.

### Acceptance Criteria

- CI запускает lint, typecheck и тесты.
- Критичный concurrency test проходит стабильно.
- Есть понятная инструкция запуска тестов.

---

## Phase 14 — Deployment & Operations

**Цель:** развернуть staging и production окружения.

### Infrastructure

- [ ] VPS в РФ.
- [ ] Docker Compose.
- [ ] PostgreSQL.
- [ ] Redis.
- [ ] API service.
- [ ] Web service.
- [ ] Bot service.
- [ ] Caddy или nginx.
- [ ] HTTPS через Let's Encrypt.
- [ ] Domain configuration.

### Environments

- [ ] staging;
- [ ] production.

### Operations

- [x] Healthcheck endpoint.
- [ ] Uptime monitoring.
- [x] Structured logs.
- [ ] Log rotation.
- [ ] PostgreSQL backups.
- [ ] Backup restore instruction.
- [ ] Deployment runbook.

### Acceptance Criteria

- Staging доступен по отдельному URL.
- Production доступен по основному домену.
- Telegram webhook работает на staging и production.
- HTTPS включён.
- Есть ежедневный backup БД.
- Есть инструкция восстановления из backup.

---

## Phase 15 — Portfolio Packaging

**Цель:** оформить проект как сильный публичный кейс.

### Tasks

- [ ] Обновить README.
- [ ] Добавить архитектурный обзор.
- [ ] Добавить ERD.
- [ ] Добавить API overview.
- [ ] Добавить prompt log.
- [ ] Добавить dev diary.
- [ ] Добавить Codex workflow description.
- [ ] Добавить GIF/video demo.
- [ ] Добавить `/demo` режим.
- [ ] Добавить demo accounts.
- [ ] Добавить список компромиссов.
- [ ] Добавить future roadmap.

### README Must Explain

- Что это за проект.
- Для кого он сделан.
- Какие задачи решает.
- Какой стек используется.
- Как запустить локально.
- Как запустить тесты.
- Как устроена архитектура.
- Как использовался Codex.
- Какие trade-offs приняты.
- Что планируется дальше.

### Demo Scenarios

- [ ] Пользователь создаёт заявку на бронь.
- [ ] Администратор подтверждает бронь.
- [ ] Пользователь создаёт открытую встречу.
- [ ] Участники присоединяются.
- [ ] Telegram-бот отправляет уведомление.
- [ ] Владелец меняет расписание или блокирует стол.

### Acceptance Criteria

- Работодатель может понять ценность проекта за 2–3 минуты.
- README содержит ссылки на demo, docs, API и workflow.
- Проект можно запустить локально по инструкции.
- Нет реальных персональных данных в demo mode.

---

# 5. Рекомендуемый порядок Milestones

## Milestone 1 — Project Foundation

Includes:

- Phase 0;
- Phase 1;
- базовая документация;
- пустые приложения;
- Docker Compose;
- CI.

## Milestone 2 — Auth & Domain Model

Includes:

- Phase 2;
- Phase 3;
- Phase 4.

## Milestone 3 — Booking MVP

Includes:

- Phase 5;
- Phase 6;
- базовый пользовательский UI;
- базовая админка.

## Milestone 4 — Telegram & Notifications

Includes:

- Phase 9;
- Redis/BullMQ jobs;
- reminders;
- admin notifications.

## Milestone 5 — Meetups

Includes:

- Phase 10;
- catalog;
- meetups;
- message feed.

## Milestone 6 — Production Readiness

Includes:

- Phase 12;
- Phase 13;
- Phase 14.

## Milestone 7 — Portfolio Release

Includes:

- Phase 15;
- demo mode;
- docs;
- video/GIF;
- final README.

---

# 6. Definition of Done

## Для задачи

Задача считается готовой, если:

- [ ] реализована требуемая функциональность;
- [ ] добавлены или обновлены тесты;
- [ ] обновлена документация, если изменилось поведение;
- [ ] нет ошибок lint/typecheck;
- [ ] нет секретов в коде;
- [ ] нет лишнего логирования персональных данных;
- [ ] PR содержит описание изменений;
- [ ] PR содержит инструкцию проверки.

## Для фичи

Фича считается готовой, если:

- [ ] покрыт основной happy path;
- [ ] покрыты основные error cases;
- [ ] проверены права доступа;
- [ ] добавлены API docs;
- [ ] добавлены UI states: loading, empty, error;
- [ ] проверен mobile layout;
- [ ] добавлен audit log для admin/owner actions и просмотра экстренного телефона;
- [ ] добавлены seed/demo данные, если это нужно для демонстрации.

## Для MVP 1

MVP 1 готов, если:

- [x] пользователь может зарегистрироваться через Telegram web auth payload;
- [x] пользователь может заполнить телефон для экстренной связи;
- [x] пользователь может создать заявку на бронь;
- [x] администратор может подтвердить бронь;
- [ ] пользователь получает уведомление;
- [x] владелец может управлять помещениями, столами и расписанием;
- [x] нельзя создать конфликтующую бронь;
- [ ] есть staging;
- [ ] есть production;
- [ ] есть backup БД;
- [x] есть README с запуском проекта.

---

# 7. Риски и способы снижения

| Риск | Вероятность | Влияние | Что сделать |
|---|---:|---:|---|
| Слишком широкий MVP | Высокая | Высокое | Жёстко разделять MVP 1, MVP 2, Portfolio polish |
| Сложная auth-интеграция с Telegram | Средняя | Высокое | Сначала реализовать один Telegram flow, Mini App позже |
| Двойное бронирование | Средняя | Высокое | Транзакции, constraint, concurrency test |
| Privacy-проблемы из-за телефона и Telegram | Средняя | Высокое | Минимизация данных, маскирование, запрет логирования ПДн |
| Чат разрастётся в отдельный продукт | Высокая | Среднее | В MVP только простая лента сообщений |
| Деплой станет слишком сложным | Средняя | Среднее | Docker Compose на VPS, без Kubernetes |
| Codex будет делать слишком крупные изменения | Высокая | Среднее | Маленькие issues, AGENTS.md, PR checklist |
| README не покажет ценность проекта | Средняя | Высокое | Делать portfolio docs параллельно, не в самом конце |

---

# 8. Backlog после MVP

Возможные улучшения после первой публичной версии:

- realtime-чат через WebSocket или SSE;
- полноценная Telegram Mini App;
- waitlist для занятых столов;
- расширенная статистика;
- self-hosted analytics;
- Storybook;
- расширенная система друзей;
- приглашения по ссылке;
- календарные интеграции;
- push-уведомления в браузере;
- PWA;
- модерация сообщений;
- жалобы на пользователей;
- advanced audit log;
- import/export каталога игр.

---

# 9. Suggested Next Issues

1. `feat(api): add owner audit log listing endpoint`
2. `feat(api): add emergency contact reveal with audit log`
3. `feat(api): add owner user block and unblock endpoint`
4. `feat(bot): create grammY runtime`
5. `feat(bot): implement start command and account linking`
6. `feat(notifications): add notification service`
7. `feat(bot): send booking status notifications`
8. `test(web): add Playwright booking smoke tests`
9. `chore(infra): add production Dockerfiles`
10. `docs(infra): add deployment and backup guide`

---

# 10. Notes for Codex Workflow

Codex should work in small, reviewable PRs.

Preferred task size:

- one module;
- one endpoint group;
- one migration;
- one UI flow;
- one test scenario;
- one documentation update.

Codex should not:

- introduce new dependencies without explanation;
- change public API without updating Swagger/docs;
- log secrets or personal data;
- mix unrelated changes in one PR;
- skip tests for booking, auth, roles, or admin actions;
- implement non-MVP features without issue approval.

Every PR should answer:

1. What was implemented?
2. Why was it implemented this way?
3. How was it tested?
4. What risks or trade-offs exist?
5. What documentation was updated?

---

# 11. Current Status

Project status: **Repository foundation in progress**.

Next recommended task: `TASK-0101 — Add Docker Compose for PostgreSQL and Redis`.
