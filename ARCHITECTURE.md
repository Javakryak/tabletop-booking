# ARCHITECTURE.md

## 1. Purpose

This document describes the target architecture for the board game and wargame club booking application.

The application is designed for one real club and also serves as a portfolio project demonstrating AI-assisted development with Codex.

The system includes:

- public club website;
- user account area;
- table booking flow;
- open game meetups;
- admin panel;
- owner panel;
- Telegram bot;
- future Telegram Mini App;
- REST API;
- PostgreSQL database;
- Redis-backed jobs and notifications;
- structured logs, healthchecks, backups, and deployment documentation.

The architecture should remain practical for a small real club while being clear, testable, and easy for Codex/coding agents to modify through small pull requests.

---

## 2. Architectural Goals

### 2.1 Product goals

The system must support:

- real table booking for a board game and wargame club;
- administrator confirmation of bookings;
- owner-managed rooms, tables, working hours, and booking rules;
- Telegram notifications and bot-based interactions;
- open meetups where players can find others for specific games;
- privacy-aware handling of user data;
- demo mode for portfolio presentation.

### 2.2 Engineering goals

The architecture should be:

- modular;
- type-safe where possible;
- easy to test;
- easy to deploy on a Russian VPS;
- understandable to future maintainers;
- suitable for Codex-driven development through isolated tasks and PRs.

### 2.3 Non-goals for MVP

The MVP does not include:

- online payments;
- SaaS or multi-club support;
- realtime chat;
- VK ID or Yandex ID authentication;
- SMS OTP authentication;
- advanced analytics or marketing pixels;
- complex social network features;
- Kubernetes;
- microservices.

---

## 3. High-Level System Overview

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

The system is a modular monolith rather than a microservice architecture. The backend API owns the business logic. The web application and Telegram bot are clients of the API.

---

## 4. Recommended Technology Stack

```text
Monorepo:       pnpm workspaces or Turborepo
Frontend:       Next.js
Backend API:    NestJS
Telegram Bot:   grammY
Database:       PostgreSQL
ORM:            Prisma
Jobs/Queues:    Redis + BullMQ
UI:             Tailwind CSS + shadcn/ui
API docs:       OpenAPI/Swagger
Testing:        Vitest/Jest, Supertest, Playwright
Deployment:     Docker Compose on VPS
Proxy/HTTPS:    Caddy or nginx + Let's Encrypt
CI/CD:          GitHub Actions
```

### 4.1 Why TypeScript-first

A TypeScript-first stack is recommended because:

- frontend, backend, bot, and shared packages can use the same language;
- shared DTOs, enums, and validation schemas can reduce duplication;
- Codex can work effectively on focused TypeScript tasks;
- Next.js and NestJS provide clear conventions;
- Prisma works well with PostgreSQL and TypeScript;
- the project remains accessible for portfolio review.

---

## 5. Repository Structure

Target repository structure:

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
  ARCHITECTURE.md
  ROADMAP.md
  README.md
  CHANGELOG.md
  CONTRIBUTING.md
  .env.example
```

### 5.1 `apps/web`

Next.js application for:

- public landing pages;
- booking UI;
- user profile;
- booking history;
- meetup UI;
- admin panel;
- owner panel;
- future Telegram Mini App screens.

### 5.2 `apps/api`

NestJS backend API for:

- authentication;
- users and roles;
- rooms and tables;
- club schedule;
- booking rules;
- bookings;
- games;
- meetups;
- notifications;
- audit logs;
- legal consents;
- healthchecks;
- Swagger/OpenAPI.

### 5.3 `apps/bot`

Telegram bot application for:

- `/start` and account linking;
- user notifications;
- admin notifications;
- quick booking actions;
- meetup participation confirmations;
- opening the future Telegram Mini App.

### 5.4 `packages/shared`

Shared types and constants:

- enums;
- DTO types;
- status definitions;
- role names;
- validation schemas if shared across frontend and backend.

### 5.5 `packages/database`

Database access helpers:

- Prisma client export;
- seed helpers;
- test database utilities;
- transaction helpers.

### 5.6 `packages/ui`

Reusable UI components:

- buttons;
- forms;
- cards;
- layout components;
- booking calendar components;
- slot picker;
- meetup cards.

---

## 6. Runtime Components

## 6.1 Web application

The web app is the main user interface.

It includes:

- public club pages;
- authenticated user area;
- admin interface;
- owner interface;
- demo mode;
- future Telegram Mini App entry points.

The web app should call the backend API instead of embedding business logic directly in frontend code.

### Public pages

Required public pages:

- home;
- schedule;
- games;
- rules;
- contacts.

### Authenticated pages

Required authenticated pages:

- profile;
- booking creation;
- booking history;
- my meetups;
- meetup details;
- settings and privacy.

### Admin pages

Required admin pages:

- pending bookings;
- daily schedule;
- booking details;
- manual booking creation;
- booking transfer/cancellation;
- minimal contact view.

### Owner pages

Required owner pages:

- rooms;
- tables;
- schedule settings;
- booking rules;
- user management;
- user blocking;
- statistics;
- export;
- audit log.

---

## 6.2 Backend API

The backend API owns all business rules.

The frontend and bot must not implement booking conflict logic, permission logic, or schedule validation independently.

Recommended API module structure:

```text
AuthModule
UsersModule
RolesModule
RoomsModule
TablesModule
ScheduleModule
BookingRulesModule
BookingsModule
GamesModule
MeetupsModule
NotificationsModule
AdminModule
OwnerModule
AuditModule
LegalModule
HealthModule
```

API versioning:

```text
/api/v1
```

Swagger/OpenAPI should be available in local and staging environments. Production access may be disabled or protected.

---

## 6.3 Telegram bot

The Telegram bot is both a notification channel and an alternative interaction channel.

The bot should not duplicate the full frontend UI. Complex flows should open web screens or the future Telegram Mini App.

### User commands

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

### Admin commands

```text
/admin
/pending
/today
```

Commands are secondary. Inline buttons and menu buttons should be preferred for UX.

### Telegram update mode

```text
local:      polling
staging:    webhook
production: webhook
```

---

## 6.4 Telegram Mini App

Telegram Mini App is included in the target architecture but is not part of the first implementation phase.

The architecture should prepare for it by:

- keeping booking UI components reusable;
- keeping Telegram auth validation isolated;
- avoiding web-only assumptions in booking screens;
- designing API endpoints that can be used by both web and Mini App clients.

The initial implementation may expose a `mini-app` route or placeholder entry point, but full Mini App UX can be delivered after the core web booking flow works.

---

## 6.5 PostgreSQL

PostgreSQL is the source of truth for:

- users;
- roles;
- rooms;
- tables;
- working hours;
- schedule exceptions;
- bookings;
- games;
- meetups;
- meetup messages;
- notifications;
- audit logs;
- legal documents;
- consents.

Booking conflict prevention must be enforced reliably, preferably with database-backed transactions and constraints.

---

## 6.6 Redis

Redis is used for:

- background jobs;
- notification queues;
- reminders before bookings;
- Telegram webhook processing if needed;
- rate limiting;
- temporary locks or holds if introduced later.

Redis should not be the source of truth for booking state.

---

## 7. Domain Model Overview

This is a conceptual domain model. The exact Prisma schema is documented separately in `DATABASE.md`.

### 7.1 Users and roles

Core entities:

```text
User
UserProfile
Role
UserRole
Consent
LegalDocument
```

Supported roles:

```text
guest
user
admin
owner
```

Guests are unauthenticated visitors and usually do not need a stored database role.

### 7.2 Rooms and tables

Core entities:

```text
Room
ClubTable
RoomClosure
TableClosure
```

Tables are functionally similar and differ by:

- number/name;
- room;
- capacity;
- availability status.

### 7.3 Schedule

Core entities:

```text
ClubWorkingHours
ScheduleException
RoomClosure
TableClosure
```

Schedule model consists of:

1. weekly working hours;
2. date-specific exceptions;
3. room/table closures.

### 7.4 Booking rules

Core entity:

```text
BookingRules
```

Rules include:

- minimum cancellation time;
- max active bookings per user;
- whether full-day booking is allowed;
- default slot size;
- user ban rules;
- table/room restrictions.

### 7.5 Bookings

Core entities:

```text
Booking
BookingStatusHistory
```

A booking is stored as a time interval:

```text
start_at
end_at
```

The UI uses 30-minute slot increments, but the database should store intervals.

Booking statuses:

```text
pending
confirmed
cancelled_by_user
cancelled_by_admin
completed
expired
```

### 7.6 Games and meetups

Core entities:

```text
Game
Meetup
MeetupParticipant
MeetupMessage
MeetupTag
Friendship
```

A meetup can use either:

- a game from the club catalog;
- a custom game title provided by the user.

The meetup does not reserve a table until enough players join.

Meetup statuses:

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

### 7.7 Notifications

Core entities:

```text
Notification
NotificationDeliveryAttempt
```

Notifications may be delivered via:

- Telegram;
- future email;
- internal UI notifications.

### 7.8 Audit logs

Core entity:

```text
AuditLog
```

Audit logs should capture important administrative and owner actions:

- booking confirmation;
- booking cancellation;
- booking transfer;
- user blocking;
- room/table changes;
- schedule changes;
- booking rule changes;
- legal document version changes.

---

## 8. Authentication and Authorization

## 8.1 Authentication strategy

The primary authentication method is Telegram-first auth.

Supported auth paths:

1. Telegram login on the website.
2. Telegram bot `/start` account creation or linking.
3. Future Telegram Mini App auth through Telegram init data.
4. Optional email-based fallback later.

Passwords should not be used in MVP.

Phone number is collected for emergency contact only. It is not an authentication factor in MVP.

---

## 8.2 User profile data

Required profile fields:

- display name;
- Telegram ID if registered through Telegram;
- Telegram username if available;
- phone number for emergency contact; the database field should remain nullable for deletion/anonymization, while booking creation requires it at the business-rule level;
- accepted legal documents.

Optional profile fields:

- email;
- privacy settings.

Do not collect unnecessary personal data.

---

## 8.3 Authorization model

Use role-based access control.

### User

Can:

- manage own profile;
- create bookings;
- cancel own bookings within rules;
- view own booking history;
- create and join meetups;
- write messages in joined meetups;
- manage own privacy settings.

### Admin

Can:

- view operational booking data;
- confirm bookings;
- cancel bookings;
- transfer bookings;
- create manual bookings;
- view minimal required contact info;
- view daily schedule.

Admin must not see unnecessary personal data.

### Owner

Can:

- manage rooms;
- manage tables;
- manage working hours;
- manage booking rules;
- manage users and blocks;
- view audit logs;
- view statistics, implemented in MVP 3 / portfolio polish unless explicitly required earlier;
- export data, implemented in MVP 3 / portfolio polish unless explicitly required earlier.

---

## 9. Booking Architecture

## 9.1 Booking flow

```text
User selects date/time/table
        |
        v
API validates schedule and rules
        |
        v
API checks booking conflicts
        |
        v
Booking is created with status pending
        |
        v
Admin receives notification
        |
        v
Admin confirms or cancels
        |
        v
User receives notification
```

---

## 9.2 Booking conflict detection

Conflict condition:

```text
existing.start_at < requested.end_at
AND
existing.end_at > requested.start_at
```

Only active statuses should block a table:

```text
pending
confirmed
```

Cancelled, expired, and completed bookings should not block future booking attempts unless a specific business rule says otherwise.

---

## 9.3 Race condition protection

The system must handle this scenario:

> Two users simultaneously try to book the same table for overlapping time ranges.

Required protection:

- database transaction;
- conflict check inside transaction;
- appropriate locking or PostgreSQL constraint;
- integration test proving only one booking succeeds.

A later implementation may use PostgreSQL range types and exclusion constraints for stronger database-level guarantees.

---

## 9.4 Full-day booking

Full-day booking is a UI shortcut.

It should create a normal interval booking from club opening time to club closing time on the selected day.

---

## 9.5 Booking status transitions

Allowed transitions:

```text
pending -> confirmed
pending -> cancelled_by_user
pending -> cancelled_by_admin
pending -> expired
confirmed -> cancelled_by_user
confirmed -> cancelled_by_admin
confirmed -> completed
```

Disallowed transitions should fail explicitly.

Every status change should create a `BookingStatusHistory` record and, when performed by admin or owner, an `AuditLog` record.

---

## 10. Meetup Architecture

## 10.1 Meetup flow

```text
User creates meetup
        |
        v
Meetup is open for participants
        |
        v
Users join the meetup
        |
        v
Required number of players is reached
        |
        v
Meetup becomes ready_to_book
        |
        v
Booking request is created
        |
        v
Admin confirms booking
        |
        v
Meetup becomes booked
```

---

## 10.2 No early table reservation

A meetup does not reserve a table before enough players join.

This avoids blocking club tables for meetups that may never happen.

If the table is no longer available after enough players join, the meetup should remain open, expire, or ask the organizer to choose another time.

---

## 10.3 Meetup messages

MVP chat is a simple message feed, not realtime chat.

Rules:

- only meetup participants can read messages;
- only meetup participants can write messages;
- messages are loaded by API request or polling;
- no WebSocket requirement in MVP;
- moderation can be basic.

---

## 10.4 Contacts and privacy in meetups

Users should not automatically expose all contact details.

Recommended MVP behavior:

- participants can see display names;
- Telegram username may be shown if available and allowed by privacy settings;
- phone number should not be shown to other users;
- email should not be shown to other users.

---

## 11. Notification Architecture

Notifications are generated by domain events.

Examples:

- booking created;
- booking confirmed;
- booking cancelled;
- booking reminder due;
- meetup joined;
- meetup ready to book;
- admin action required.

Recommended flow:

```text
Domain action
    |
    v
Notification record created
    |
    v
Job added to Redis/BullMQ
    |
    v
Telegram bot sends message
    |
    v
Delivery attempt recorded
```

In early MVP, direct sending may be acceptable for simple flows, but the architecture should move toward queue-backed delivery.

---

## 12. API Architecture

## 12.1 API style

The project uses REST API.

Reasons:

- easy to document with Swagger/OpenAPI;
- suitable for frontend and Telegram bot clients;
- easy to test;
- familiar to most reviewers;
- better portfolio value than a hidden internal-only RPC layer.

---

## 12.2 API versioning

All backend routes should be versioned:

```text
/api/v1
```

Future breaking changes should use `/api/v2`.

---

## 12.3 API documentation

Swagger/OpenAPI should document:

- request DTOs;
- response DTOs;
- auth requirements;
- possible status codes;
- admin/owner-only endpoints.

---

## 12.4 Client boundaries

The web app and bot should call the API.

They should not:

- access the database directly;
- duplicate booking rules;
- decide authorization independently;
- send privileged admin actions without API validation.

---

## 13. Frontend Architecture

## 13.1 UI principles

The UI should be:

- mobile-first;
- dark theme by default;
- simple and operationally clear;
- suitable for both club users and staff;
- accessible enough for practical use.

---

## 13.2 Component reuse

Booking and meetup components should be reusable by:

- the regular web app;
- admin/owner screens where relevant;
- future Telegram Mini App.

Important components:

```text
BookingCalendar
SlotPicker
RoomSelector
TableSelector
BookingSummary
BookingStatusBadge
MeetupCard
MeetupParticipantList
GameCard
AdminBookingQueue
```

---

## 13.3 Demo mode

The web app should support `/demo` mode without real personal data.

Demo mode should include:

- demo user;
- demo admin;
- demo owner;
- seeded rooms;
- seeded tables;
- seeded games;
- seeded bookings;
- seeded meetups.

---

## 14. Infrastructure Architecture

## 14.1 Environments

Required environments:

```text
local
staging
production
```

### Local

Used for development and tests.

Can use:

- local Node.js processes;
- Dockerized PostgreSQL and Redis;
- Telegram polling.

### Staging

Used for testing production-like deployment.

Should use:

- Docker Compose;
- HTTPS;
- Telegram webhook;
- staging database;
- staging bot token if possible.

### Production

Used by the real club.

Should use:

- Russian VPS or Russian cloud provider;
- Docker Compose;
- HTTPS;
- PostgreSQL;
- Redis;
- automated backups;
- structured logs;
- healthchecks;
- uptime monitoring.

---

## 14.2 Deployment topology

Recommended production topology:

```text
VPS
  ├─ reverse proxy: Caddy or nginx
  ├─ web container
  ├─ api container
  ├─ bot container
  ├─ postgres container or managed PostgreSQL
  ├─ redis container or managed Redis
  ├─ backup scripts
  └─ log rotation
```

For a small club, Docker Compose is sufficient. Kubernetes is intentionally out of scope.

---

## 14.3 HTTPS

HTTPS is required for:

- user authentication;
- safe handling of personal data;
- Telegram webhooks;
- production readiness.

Use Caddy or nginx with Let's Encrypt.

---

## 14.4 Backups

Backups should include:

- daily PostgreSQL dump;
- retention policy;
- restore instructions;
- periodic restore check.

Do not consider backups complete until restore has been tested.

---

## 14.5 Healthchecks

API should expose:

```text
GET /health
```

The endpoint should check:

- API process status;
- PostgreSQL connectivity;
- Redis connectivity.

---

## 14.6 Monitoring

MVP production monitoring starts with:

- structured logs;
- healthcheck endpoint;
- uptime monitoring;
- backup verification.

Sentry or an equivalent error tracking system may be added later after privacy implications are reviewed.

---

## 15. Security and Privacy Architecture

## 15.1 Personal data minimization

Collect only data needed for operation:

- display name;
- Telegram ID;
- Telegram username if available;
- phone number for emergency contact; the database field should remain nullable for deletion/anonymization, while booking creation requires it at the business-rule level;
- optional email;
- legal consent records.

Do not collect:

- unnecessary passport or identity data;
- payment data;
- marketing tracking data;
- precise geolocation.

---

## 15.2 Sensitive data handling

Do not log:

- Telegram bot token;
- Telegram init data;
- JWT/session tokens;
- passwords if ever introduced;
- phone numbers;
- emails;
- cookies;
- authorization headers;
- private message contents unless explicitly needed and sanitized.

---

## 15.3 Admin data visibility

Admins should see only operationally necessary information.

Preferred admin contact view:

- display name;
- Telegram username if available;
- masked phone by default;
- full phone only through an explicit break-glass action for emergency contact;
- booking-related notes.

Every full-phone reveal must create an audit event with actor, target user, timestamp, reason when available, and related booking/meetup context when applicable.

Owner may have broader access, but sensitive data access should still be minimized and audit-logged where appropriate.

---

## 15.4 Legal consent tracking

The system must store consent records:

```text
user_id
document_type
document_version
accepted_at
ip_address
user_agent
```

Legal documents should be versioned.

---

## 15.5 Account deletion

MVP should support account deletion by request.

Recommended behavior:

- soft-delete account;
- anonymize personal fields where possible;
- keep operational booking records in anonymized form;
- keep audit logs when legally and operationally necessary;
- prevent deleted users from logging in unless restored by owner/admin policy.

---

## 16. Testing Architecture

## 16.1 Test levels

Required test levels:

```text
unit tests
integration tests
API e2e tests
UI smoke/e2e tests
bot tests
concurrency tests
```

---

## 16.2 Critical tests

The highest-priority test is booking race condition protection:

> Two users try to book the same table at the same time. Exactly one booking should succeed.

Other critical tests:

- user cannot see another user's private data;
- admin cannot access owner-only settings;
- blocked user cannot create bookings;
- booking cannot be created outside working hours;
- booking cannot be created for closed room/table;
- meetup cannot book a table before enough participants join.

---

## 16.3 Seed data

Seed data should support:

- local development;
- automated tests;
- `/demo` mode;
- portfolio walkthrough.

Seed data must not include real personal data.

---

## 17. Logging and Audit

## 17.1 Application logs

Application logs should be structured and machine-readable.

Recommended fields:

```text
timestamp
level
service
request_id
user_id, if safe and needed
event
duration_ms
status_code
```

Avoid logging raw payloads by default.

---

## 17.2 Audit logs

Basic audit logging is required in MVP 1. It is not a portfolio-only feature.

Audit logs are business records of important actions.

They should answer:

- who performed the action;
- what action was performed;
- what entity was affected;
- when it happened;
- what changed.

MVP 1 audit events must include at minimum: booking confirmation/cancellation/movement, user block/unblock, schedule changes, room/table changes, booking rule changes, role changes, and full emergency phone reveal.

Audit logs are not the same as application logs.

---

## 18. Key Architectural Decisions

This section summarizes decisions that should later be expanded into ADR files.

### ADR-001: Use TypeScript monorepo

Reason:

- shared language across web, API, bot, and packages;
- easier Codex-driven changes;
- shared types and validation.

### ADR-002: Use modular monolith instead of microservices

Reason:

- small project/team;
- simpler deployment;
- easier transactions;
- less operational complexity.

### ADR-003: Use REST + OpenAPI

Reason:

- easy documentation;
- easy testing;
- suitable for frontend and bot;
- strong portfolio readability.

### ADR-004: Use PostgreSQL as source of truth

Reason:

- strong consistency needed for bookings;
- good support for transactions;
- possible future range/exclusion constraints.

### ADR-005: Use Telegram-first auth

Reason:

- Telegram is already required for notifications;
- convenient for Russian audience;
- avoids passwords in MVP.

### ADR-006: Do not reserve tables for meetups until enough players join

Reason:

- prevents unused table blocking;
- simpler operational model;
- keeps admin confirmation flow consistent.

### ADR-007: Use simple message feed instead of realtime chat in MVP

Reason:

- reduces complexity;
- avoids WebSocket infrastructure in MVP;
- still supports meetup coordination.

### ADR-008: Start monitoring with logs, healthchecks, uptime, and backups

Reason:

- practical MVP approach;
- avoids premature integration of third-party tools with privacy implications.

---

## 19. Known Risks and Mitigations

### Risk: MVP scope becomes too large

Mitigation:

- split into MVP 1, MVP 2, and portfolio polish;
- avoid realtime chat and advanced social features early.

### Risk: double booking due to race conditions

Mitigation:

- implement transaction-backed conflict checks;
- add concurrency integration test;
- consider PostgreSQL exclusion constraints later.

### Risk: privacy violations through admin screens or logs

Mitigation:

- minimize visible data;
- mask phone/email;
- sanitize logs;
- add role-based API tests.

### Risk: Telegram instability

Mitigation:

- collect phone number for emergency contact;
- allow optional email;
- keep web app usable without bot for core operations.

### Risk: deployment complexity

Mitigation:

- use Docker Compose;
- avoid Kubernetes;
- document backup and restore;
- use staging before production.

---

## 20. Implementation Order

Recommended architecture-driven implementation order:

1. Monorepo foundation.
2. Docker Compose with PostgreSQL and Redis.
3. Prisma schema draft and seed data.
4. NestJS API foundation.
5. Next.js web foundation.
6. Telegram bot foundation.
7. Auth and users.
8. Rooms, tables, and schedule.
9. Booking rules and bookings.
10. Admin booking confirmation.
11. Telegram notifications.
12. Owner configuration panel.
13. Games catalog.
14. Meetups.
15. Meetup message feed.
16. Demo mode.
17. Tests and CI.
18. Staging deployment.
19. Production deployment.
20. Portfolio documentation.

---

## 21. Future Extensions

Possible post-MVP improvements:

- Telegram Mini App full UX;
- realtime meetup chat;
- waitlist for tables;
- advanced statistics;
- Storybook;
- self-hosted analytics;
- advanced notification preferences;
- stricter PostgreSQL exclusion constraints;
- calendar export;
- multi-branch support if the club grows.

---

## 22. Architecture Review Checklist

Before merging architecture-sensitive PRs, verify:

- business logic is in API, not duplicated in clients;
- booking conflict checks are transaction-safe;
- role permissions are enforced server-side;
- no secrets or personal data are logged;
- Swagger docs are updated for API changes;
- Prisma migrations are included when schema changes;
- tests are added for new rules;
- seed data is updated if new mandatory fields are added;
- admin screens do not expose unnecessary personal data;
- README or docs are updated when behavior changes.
