# Project Decisions

Reference for fixed product and technical decisions. Root agent instructions link here instead of duplicating the full list.

## Fixed Product Decisions

- The product is for one board game and wargame club, not multi-tenant SaaS.
- The application must be usable by a real club and also serve as an AI-assisted development portfolio project.
- Primary audience: Russian-speaking club users.
- Telegram is the primary auth and notification channel.
- Telegram Mini App must be considered in architecture, but it is not the first implementation target.
- Phone number is collected for emergency contact because Telegram may be unstable. It should be nullable in the database for deletion/anonymization, but required by business rules before real booking creation.
- Email is optional and used only as an alternative contact/login/recovery channel.
- Booking is confirmed by an administrator.
- Game meetups reserve a table only after the required number of participants is reached.
- MVP meetup chat is a simple message feed, not realtime chat.
- Production monitoring starts with structured logs, healthcheck, uptime monitoring, and backups.
- Marketing analytics, advertising pixels, and invasive tracking are out of scope for MVP.
- Statistics dashboards and CSV/Excel exports are MVP 3 / portfolio polish unless a task explicitly requires them earlier.

## Recommended Stack

Use this stack unless a human explicitly changes the architecture:

```text
Monorepo: pnpm workspaces or Turborepo
Frontend: Next.js
Backend: NestJS
Bot: grammY
Database: PostgreSQL
ORM: Prisma
Cache / queues: Redis + BullMQ
UI: Tailwind CSS + shadcn/ui
API docs: OpenAPI / Swagger
Tests: Vitest or Jest, Supertest, Playwright
Deploy: Docker Compose on VPS
Reverse proxy: Caddy or nginx
```

Prefer a single-language TypeScript workflow across frontend, backend, bot, shared types, and tooling.

## Out Of Scope Unless Explicitly Requested

- Payments.
- Online acquiring.
- Cash register/fiscalization logic.
- VK ID.
- Yandex ID.
- SMS OTP.
- Multi-club SaaS tenancy.
- Realtime chat with WebSockets.
- Marketing analytics/pixels.
- Session recording or heatmaps.
- Complex social feed.
- Public user profiles indexed by search engines.
- Kubernetes deployment.

## First Implementation Priorities

1. Repository foundation and monorepo setup.
2. Docker Compose with PostgreSQL and Redis.
3. Prisma schema foundation.
4. NestJS API foundation.
5. Next.js web foundation.
6. Telegram bot foundation.
7. Users and roles.
8. Telegram auth/account linking.
9. Rooms and tables.
10. Club schedule and exceptions.
11. Booking rules.
12. Booking request workflow.
13. Admin confirmation workflow.
14. Telegram notifications.
15. Tests for booking conflicts.
16. Admin/owner panels.
17. Game catalog.
18. Meetups.
19. Meetup message feed.
20. Demo mode and portfolio documentation.
