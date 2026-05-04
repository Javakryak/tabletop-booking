# Board Club Booking

> AI-assisted fullstack booking system for a real board game and wargame club.
>
> Приложение для бронирования игровых столов, организации встреч по настольным играм и варгеймам, Telegram-уведомлений и администрирования клуба.

---

## Project status

**Status:** planning and documentation ready; implementation is expected to start from repository foundation tasks.

This project is designed for two goals:

1. **Real product goal:** provide a working booking system for one board game and wargame club.
2. **Portfolio goal:** demonstrate a complete AI-assisted development workflow using Codex, small PRs, tests, documentation, architecture decisions, and deployment.

The project is not intended to be a generic SaaS platform in MVP. It is built for one real club.

---

## Table of contents

- [Product overview](#product-overview)
- [Core features](#core-features)
- [MVP scope](#mvp-scope)
- [Tech stack](#tech-stack)
- [Architecture overview](#architecture-overview)
- [Repository structure](#repository-structure)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Testing strategy](#testing-strategy)
- [Telegram integration](#telegram-integration)
- [Privacy and personal data](#privacy-and-personal-data)
- [AI-assisted development workflow](#ai-assisted-development-workflow)
- [Project documentation](#project-documentation)
- [Roadmap](#roadmap)
- [License](#license)

---

## Product overview

Board Club Booking helps a club manage:

- rooms and gaming tables;
- table booking requests;
- administrator approval workflow;
- club working hours and schedule exceptions;
- open game meetups;
- game catalog;
- Telegram notifications;
- user profiles and emergency contacts;
- owner and administrator workflows;
- audit logs and privacy-related records.

The application is built for Russian-speaking users and for real club operations, but the repository and documentation are structured as a portfolio-grade engineering project.

---

## Core features

### Public website

Guests can view:

- club home page;
- schedule;
- game catalog;
- rules;
- contacts.

### User account

Registered users can:

- sign in primarily through Telegram;
- maintain a profile;
- provide an emergency phone number;
- optionally provide email;
- create booking requests;
- view booking history;
- cancel bookings according to club rules;
- create and join open game meetups;
- use a simple meetup message feed;
- receive Telegram notifications.

### Booking system

The booking flow supports:

- rooms;
- tables;
- fixed 30-minute slot selection in UI;
- multi-slot bookings;
- full-working-day bookings;
- administrator confirmation;
- booking status history;
- configurable booking rules;
- schedule exceptions;
- room and table closures;
- protection against double booking.

Bookings are stored as time intervals, not as separate slot rows.

### Admin panel

Administrators can:

- view pending booking requests;
- confirm, move, or cancel bookings;
- view daily schedule;
- receive Telegram notifications about new requests;
- access only the minimum contact information needed for operations.

### Owner panel

The club owner can:

- manage rooms;
- manage tables;
- configure club schedule;
- configure booking rules;
- block users;
- review audit logs;
- manage operational settings.

Statistics and CSV/Excel exports are planned for portfolio polish / MVP 3 unless the club explicitly requires them earlier.

### Game meetups

Users can:

- create an open meetup for a game from the club catalog;
- specify a custom game;
- define required number of players;
- add tags such as “beginner friendly”, “needs host”, or “2000 points”;
- join meetups;
- use a simple message feed;
- trigger a booking request only after the required number of players is reached.

Meetups do **not** reserve tables before the required number of participants is reached.

---

## MVP scope

### MVP 1 — Core Booking System

Goal: reliable table booking with administrator confirmation.

Includes:

- Telegram-first authentication;
- user profile;
- emergency phone number;
- optional email;
- roles: guest, user, admin, owner;
- rooms and tables;
- club schedule and schedule exceptions;
- booking rules;
- booking request creation;
- booking confirmation/cancellation/moving by admin;
- booking history;
- Telegram notifications;
- admin panel;
- owner panel;
- OpenAPI/Swagger;
- PostgreSQL + Prisma;
- Docker Compose;
- seed demo data;
- basic automated tests;
- staging and production environments;
- healthcheck;
- structured logs;
- basic audit log;
- backups.

### MVP 2 — Meetups and Game Catalog

Goal: allow users to find players and organize game sessions.

Includes:

- game catalog;
- open meetups;
- custom games;
- meetup tags;
- participation flow;
- simple meetup message feed;
- booking request after meetup is full;
- Telegram notifications for meetup events;
- minimal friends feature;
- inviting friends to meetups.

### MVP 3 — Portfolio Polish

Goal: make the project strong for employer review.

Includes:

- `/demo` mode without real personal data;
- demo accounts for user, admin, and owner;
- high-quality project documentation;
- architecture diagrams;
- ERD diagram;
- prompt log;
- dev diary;
- video or GIF walkthroughs;
- CI/CD;
- extended e2e tests;
- critical concurrency test;
- CSV/Excel export;
- statistics.

---

## Tech stack

| Area | Technology |
|---|---|
| Monorepo | pnpm workspaces or Turborepo |
| Frontend | Next.js |
| Backend | NestJS |
| Telegram bot | grammY |
| Database | PostgreSQL |
| ORM | Prisma |
| Queues / jobs | Redis + BullMQ |
| UI | Tailwind CSS + shadcn/ui |
| API style | REST |
| API docs | OpenAPI / Swagger |
| Tests | Vitest or Jest, Supertest, Playwright |
| Deployment | Docker Compose on VPS |
| Reverse proxy | Caddy or nginx |
| CI/CD | GitHub Actions |

The project uses a TypeScript-first architecture so that frontend, backend, bot, and shared packages can use one language and shared contracts.

---

## Architecture overview

Target architecture:

```text
+-------------------+          +-------------------+
|                   |          |                   |
|   Web Frontend    | <------> |      REST API     |
|   Next.js         |          |      NestJS       |
|                   |          |                   |
+-------------------+          +---------+---------+
                                        |
                                        |
                              +---------v---------+
                              |                   |
                              |    PostgreSQL     |
                              |                   |
                              +-------------------+
                                        |
                                        |
                              +---------v---------+
                              |                   |
                              |       Redis       |
                              |  queues/cache/jobs|
                              |                   |
                              +-------------------+

+-------------------+          +-------------------+
|                   |          |                   |
|  Telegram Users   | <------> |   Telegram Bot    |
|                   |          |   grammY          |
+-------------------+          +---------+---------+
                                        |
                                        |
                              +---------v---------+
                              |                   |
                              |      REST API     |
                              |                   |
                              +-------------------+
```

The backend API owns the business logic. The web frontend and Telegram bot are clients of the API.

The system is a modular monolith, not a microservice system. This keeps the project practical for one club and easier to maintain.

More details: [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Repository structure

Target structure:

```text
board-club-booking/
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
    adr/
    architecture/
    product/
    codex/
    legal/
  prisma/
    schema.prisma
    seed.ts
  scripts/
  docker/
  .github/
    workflows/
  AGENTS.md
  README.md
  ROADMAP.md
  ARCHITECTURE.md
  DATABASE.md
  API_SPEC.md
  TASKS.md
  MVP_CHECKLIST.md
  CHANGELOG.md
  CONTRIBUTING.md
  .env.example
```

---

## Local development

> These commands describe the intended local workflow. Exact scripts should be implemented during repository foundation tasks.

### Prerequisites

- Node.js LTS;
- pnpm;
- Docker and Docker Compose;
- PostgreSQL client tools are optional but useful;
- Telegram bot token for bot development.

### Setup

```bash
corepack enable
pnpm install
cp .env.example .env
```

Start local infrastructure:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Run migrations and seed demo data:

```bash
pnpm db:migrate
pnpm db:seed
```

Start applications:

```bash
pnpm dev
```

Expected local services:

```text
Web:      http://localhost:3000
API:      http://localhost:3001/api/v1
Swagger:  http://localhost:3001/docs
Bot:      local polling mode
```

---

## Environment variables

The repository must provide `.env.example` files without secrets.

Expected core variables:

```text
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
APP_BASE_URL=
API_BASE_URL=
CORS_ORIGIN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_URL=
```

Rules:

- never commit real secrets;
- never commit production tokens;
- never log Telegram tokens, JWTs, cookies, or Telegram Mini App init data;
- use separate values for local, staging, and production.

---

## Testing strategy

The project should prioritize correctness over raw test coverage percentage.

Required test layers:

| Level | Purpose |
|---|---|
| Unit tests | Booking rules, permissions, status transitions |
| Integration tests | API + database flows |
| API e2e tests | User/admin/owner scenarios |
| UI smoke tests | Critical web flows through Playwright |
| Bot tests | Commands, callbacks, notifications |
| Concurrency test | Prevent double booking of the same table |

Critical scenario:

> Two users attempt to book the same table for overlapping time intervals at the same time. The system must allow only one valid booking.

Suggested commands after implementation:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

---

## Telegram integration

Telegram is used for:

- primary authentication;
- account linking through `/start`;
- user notifications;
- admin notifications;
- quick actions;
- future Telegram Mini App entrypoint.

Development modes:

| Environment | Telegram update mode |
|---|---|
| local | polling |
| staging | webhook |
| production | webhook |

The Telegram Mini App should be prepared architecturally from the beginning, but implemented after the core web booking flow.

---

## Privacy and personal data

Privacy is a product requirement, not an afterthought.

The project handles:

- display names;
- Telegram identifiers;
- Telegram usernames;
- emergency phone numbers;
- optional emails;
- booking history;
- meetup participation;
- consent records.

### Emergency phone rule

Phone number is:

- nullable in the database for deletion and anonymization;
- required by business rules before creating a real booking;
- used only for emergency contact;
- hidden or masked by default;
- revealable to administrators only through explicit break-glass access;
- always recorded in audit log when revealed.

### General privacy rules

- collect only data that is necessary;
- do not expose Telegram ID in normal UI;
- do not log personal data unnecessarily;
- store legal consent records with document version, timestamp, IP address, and user agent;
- support account deletion and personal data export/delete requests;
- avoid marketing analytics, advertising pixels, and invasive tracking in MVP.

---

## AI-assisted development workflow

This repository is intended to demonstrate a disciplined Codex workflow.

Every Codex task should be:

- small;
- issue-based;
- implemented in a separate branch;
- submitted as a focused PR;
- tested;
- reviewed by a human;
- documented if behavior changes.

Recommended Codex prompt style:

```text
Read AGENTS.md, ROADMAP.md, ARCHITECTURE.md, DATABASE.md, API_SPEC.md, and TASKS.md.

Implement TASK-XXXX only.

Do not implement unrelated functionality.
Do not change public behavior outside the task scope.
Do not add secrets or real personal data.
Update tests and docs if needed.
Return a summary of changed files, tests run, and next recommended task.
```

More details: [AGENTS.md](./AGENTS.md).

---

## Project documentation

Core documents:

| Document | Purpose |
|---|---|
| [ROADMAP.md](./ROADMAP.md) | Project phases, milestones, and delivery order |
| [AGENTS.md](./AGENTS.md) | Instructions for Codex and other coding agents |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Target technical architecture |
| [DATABASE.md](./DATABASE.md) | Database design and domain model |
| [API_SPEC.md](./API_SPEC.md) | Draft REST API contract |
| [TASKS.md](./TASKS.md) | Backlog for GitHub Issues and Codex tasks |
| [MVP_CHECKLIST.md](./MVP_CHECKLIST.md) | MVP readiness checklist |
| [itogovye_trebovaniya_booking_app.md](./itogovye_trebovaniya_booking_app.md) | Final product requirements |

Recommended future documentation:

```text
docs/codex/prompt-log.md
docs/codex/dev-diary.md
docs/codex/review-checklist.md
docs/architecture/booking.md
docs/architecture/auth.md
docs/architecture/telegram.md
docs/legal/privacy-policy.md
docs/legal/terms.md
docs/legal/personal-data-consent.md
```

---

## Roadmap

Implementation starts with repository foundation tasks.

Recommended first tasks:

1. `TASK-0001` — Create monorepo structure.
2. `TASK-0002` — Configure package manager and workspace.
3. `TASK-0003` — Add shared TypeScript config.
4. `TASK-0004` — Add linting and formatting.
5. `TASK-0005` — Add environment examples.
6. `TASK-0101` — Add Docker Compose for PostgreSQL and Redis.
7. `TASK-0102` — Add database package with Prisma.
8. `TASK-0103` — Create initial database schema.
9. `TASK-0104` — Add seed demo data.
10. `TASK-0201` — Create NestJS API app.

Full roadmap: [ROADMAP.md](./ROADMAP.md).  
Full backlog: [TASKS.md](./TASKS.md).

---

## Demo mode

The project should eventually include `/demo` mode for portfolio review.

Demo mode must:

- use fake users and fake club data;
- avoid real personal data;
- provide demo accounts for user, admin, and owner;
- demonstrate the critical booking and admin flows;
- demonstrate Telegram-related behavior through safe mocks or staging-only test bot configuration.

---

## Deployment target

Target production environment:

```text
Russian VPS / Selectel / Timeweb / Yandex Cloud
Docker Compose
PostgreSQL
Redis
API service
Web service
Bot service
Caddy or nginx
HTTPS
Backups
Healthcheck
Uptime monitoring
Structured logs
```

Production must use HTTPS. Telegram webhooks are expected in staging and production.

---

## Non-goals for MVP

The MVP does not include:

- online payments;
- paid services;
- VK ID;
- Yandex ID;
- SMS OTP;
- realtime chat;
- advanced social network features;
- multi-club SaaS support;
- marketing analytics;
- advertising pixels;
- Kubernetes;
- microservices.

---

## License

License is not selected yet.

Recommended options:

- MIT for a fully open portfolio project;
- Apache-2.0 for a more explicit patent grant;
- private repository until production secrets and real club data are separated.

Before making the repository public, verify that it does not contain:

- real user data;
- production secrets;
- private Telegram tokens;
- private club operational data;
- legal documents not approved for publication.

---

## Maintainer notes

This repository should remain clear enough for an employer to review in a few minutes:

- README explains the product and stack;
- docs explain architecture and tradeoffs;
- issues show task decomposition;
- PRs show AI-assisted development discipline;
- tests demonstrate correctness;
- demo mode shows the product without exposing real users.
