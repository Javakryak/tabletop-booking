# AGENTS.md

This file defines the working rules for AI coding agents, including Codex, when contributing to this repository.

The project is a real production-oriented booking system for one board game and wargame club. It is also a portfolio project demonstrating an AI-assisted development workflow.

Agents must optimize for correctness, maintainability, privacy, testability, and small reviewable pull requests.

---

## 1. Project summary

The application allows a board game and wargame club to manage rooms, tables, schedules, booking requests, open game meetups, Telegram notifications, and administrative workflows.

The product has two goals:

1. Be usable by a real club.
2. Demonstrate high-quality AI-assisted fullstack development for an AI-assisted developer portfolio.

Core channels:

- Web application and public site.
- Admin and owner panels.
- REST API.
- Telegram bot.
- Telegram Mini App prepared architecturally, implemented after the web MVP.

Primary audience: Russian-speaking club users.

---

## 2. Fixed product decisions

Do not reopen these decisions unless a human explicitly asks for a change.

- The product is for one club, not multi-tenant SaaS.
- The primary stack is TypeScript.
- Backend API style is REST, documented with OpenAPI/Swagger.
- Database is PostgreSQL.
- ORM is Prisma.
- Monorepo is required.
- Telegram is the primary auth and notification channel.
- Telegram Mini App must be considered in architecture, but it is not the first implementation target.
- Phone number is collected for emergency contact because Telegram may be unstable. It should be nullable in the database for deletion/anonymization, but required by business rules before real booking creation.
- Email is optional and used only as an alternative contact/login/recovery channel.
- Booking is confirmed by an administrator.
- Game meetups reserve a table only after the required number of participants is reached.
- MVP meetup chat is a simple message feed, not realtime chat.
- No payments or commercial logic are required.
- Production monitoring starts with structured logs, healthcheck, uptime monitoring, and backups.
- Marketing analytics, advertising pixels, and invasive tracking are out of scope for MVP.
- Do not implement statistics dashboards or CSV/Excel exports in MVP 1 unless a task explicitly says they are required earlier.

---

## 3. Recommended technical stack

Use the following stack unless a human explicitly changes the architecture.

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

---

## 4. Expected repository structure

Keep the repository organized like this unless the actual repo already has a different approved structure.

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
  CHANGELOG.md
  CONTRIBUTING.md
  .env.example
```

If adding a new top-level folder, explain why in the PR description.

---

## 5. Domain roles

The system has four main roles.

### Guest

Can view public pages:

- Home page.
- Schedule.
- Game catalog.
- Rules.
- Contacts.

### Registered user

Can:

- Register/login primarily through Telegram.
- Maintain a profile.
- Add emergency phone number.
- Optionally add email.
- Request table bookings.
- Cancel own bookings according to club rules.
- View own booking history.
- Create and join open game meetups.
- Post messages in meetup message feed.
- Receive Telegram notifications.

### Club administrator

Can:

- View booking requests.
- Confirm, move, or cancel bookings.
- View daily schedule.
- Receive new-request notifications.
- See only the minimum contact information needed for club operations.

Administrators must not receive unnecessary personal data.

### Club owner

Can:

- Manage rooms.
- Manage tables.
- Manage club schedule.
- Configure booking rules.
- Block users.
- View audit logs.
- View statistics, implemented in MVP 3 / portfolio polish unless explicitly required earlier.
- Export CSV/Excel, implemented in MVP 3 / portfolio polish unless explicitly required earlier.

---

## 6. Privacy and personal data rules

This project processes personal data. Treat privacy as a core requirement.

### Data minimization

Collect only what is necessary:

- Display name / nickname.
- Telegram ID for account linking.
- Telegram username when available.
- Emergency phone number. Store it as nullable in the database, but require it before creating a real booking.
- Optional email.
- Legal consent records.

Do not collect birth date, address, passport data, payment data, or unnecessary profile data.

### Sensitive logging rules

Never log:

- Telegram bot token.
- JWT/session tokens.
- Telegram Mini App init data.
- Passwords or one-time codes.
- Phone numbers.
- Email addresses.
- Full message feed contents.
- Cookies.
- Authorization headers.

Logs should use internal IDs instead of personal data.

### Administrator data visibility

Administrators should see only operationally necessary contact data.

Preferred visibility:

- Display name: visible.
- Telegram username: visible if available and appropriate.
- Phone: hidden or masked by default; visible only through an explicit break-glass action for emergency contact. Every full-phone reveal must be audit-logged with actor, target user, timestamp, and reason when available.
- Email: hidden or masked by default.

### Legal consent records

Store consent records with:

```text
user_id
document_type
document_version
accepted_at
ip_address
user_agent
```

Legal documents should be versioned.

### Account deletion

Prefer soft delete plus anonymization of personal data where business records must remain.

---

## 7. Booking domain rules

### Booking time model

Bookings are stored as intervals:

```text
start_at
end_at
```

The UI uses 30-minute slot increments, but the database should not store every slot as a separate row unless there is a strong reason.

### Booking statuses

Use these statuses unless the schema already defines an approved equivalent:

```text
pending
confirmed
cancelled_by_user
cancelled_by_admin
completed
expired
```

### Booking workflow

1. User selects date, room/table, and duration.
2. System validates schedule, closures, user limits, and conflicts.
3. Booking request is created as `pending`.
4. Administrator confirms or cancels.
5. User receives notification.
6. Completed bookings are marked `completed` by scheduled job or admin workflow.

### Conflict prevention

Prevent overlapping confirmed or pending bookings for the same table.

The critical overlap rule is:

```text
A.start_at < B.end_at AND A.end_at > B.start_at
```

Always consider race conditions. Use transactions and database-level protection where possible.

A required test must cover this case:

> Two users try to book the same table for overlapping time at the same time. Only one request may succeed or only one may become confirmable, depending on the chosen final business rule.

### Full-day booking

A full-day booking means the club's working interval for that date, not necessarily 00:00–23:59.

---

## 8. Club schedule rules

Support three levels of availability:

1. Weekly working hours.
2. Date-specific exceptions such as holidays, closed days, shortened days, or special schedules.
3. Room/table closures.

Do not build a complex calendar engine unless requested. Keep schedule rules simple and explicit.

Suggested entities:

```text
club_working_hours
schedule_exceptions
room_closures
table_closures
```

---

## 9. Meetup domain rules

Meetups are open game sessions created by users.

### Game selection

A meetup may reference either:

- A game from the club catalog.
- A custom game title provided by the user.

Suggested fields:

```text
game_id nullable
custom_game_title nullable
```

Only one should be required for a valid meetup.

### Meetup booking logic

A meetup does not reserve a table immediately.

Workflow:

1. User creates an open meetup.
2. Other users join.
3. When the required number of players is reached, the meetup becomes ready for booking.
4. The system or creator creates a table booking request.
5. Administrator confirms the booking.
6. Meetup becomes booked.

### Meetup statuses

Suggested statuses:

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

### Meetup message feed

MVP chat is a simple message feed:

- No realtime requirement.
- No WebSocket requirement for MVP.
- Only participants can read and write.
- Moderation and soft delete should be considered.

Do not implement a complex social network unless explicitly requested.

---

## 10. Telegram bot rules

The bot should support notifications and lightweight actions.

### Main responsibilities

- Register or link account through `/start`.
- Notify users about booking updates.
- Notify administrators about new booking requests.
- Remind users before a game.
- Allow users to view bookings.
- Allow users to confirm participation in meetups.
- Provide buttons that open the web app or Telegram Mini App.

### Suggested commands

User commands:

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

Admin commands:

```text
/admin
/pending
/today
```

Prefer inline buttons and menus over command-heavy UX.

### Telegram update handling

Use:

```text
local: polling
staging: webhook
production: webhook
```

Never commit bot tokens.

---

## 11. Telegram Mini App readiness

Telegram Mini App is planned, but not the first implementation target.

Design reusable frontend components so they can work in:

- Public web app.
- Mobile web layout.
- Future Telegram Mini App.

Examples:

```text
BookingCalendar
SlotPicker
RoomSelector
TableSelector
BookingSummary
MeetupCard
```

Avoid hard-coding assumptions that the app always runs in a normal browser.

---

## 12. API rules

Use REST under versioned routes:

```text
/api/v1
```

Use OpenAPI/Swagger documentation for all public API endpoints used by the web app or bot.

### General API conventions

- Validate all inputs with DTOs/schemas.
- Return consistent error shapes.
- Use role-based access control.
- Use pagination for lists.
- Avoid leaking personal data in API responses.
- Keep admin/owner endpoints clearly separated from user endpoints.

### Suggested endpoint groups

```text
/auth
/users
/profile
/rooms
/tables
/schedule
/bookings
/games
/meetups
/notifications
/admin
/owner
/legal
/health
```

---

## 13. Database and migrations

Use Prisma migrations.

Rules:

- Do not edit applied migrations unless the project is still in pre-initial state and a human approves reset.
- Every schema change must include a migration.
- Update seed data when required.
- Add tests for non-trivial schema/business changes.
- Avoid storing derived state unless it improves clarity or performance and is documented.

Use PostgreSQL constraints where appropriate. Critical business invariants should not rely only on frontend validation.

---

## 14. Frontend rules

Use Next.js with mobile-first responsive layouts.

Default UI direction:

- Dark theme by default.
- Russian-language product UI by default.
- Clean, minimal, club-friendly interface.
- Accessible forms and controls.
- Clear status labels for bookings and meetups.

Prefer shared UI components over duplicated markup.

Do not expose admin or owner data in client-side code unless authorized and necessary.

---

## 15. Testing requirements

Every meaningful feature should include tests at the appropriate level.

### Required test categories

- Unit tests for domain rules.
- Integration tests for API + database workflows.
- API e2e tests for critical user/admin flows.
- Playwright smoke tests for main UI flows.
- Bot tests for commands and callbacks.
- Concurrency test for booking conflicts.

### Minimum critical tests

Before considering MVP booking ready, tests must cover:

- User can create a pending booking.
- Admin can confirm a booking.
- User can cancel a booking according to rules.
- User cannot book a blocked table.
- User cannot book outside working hours.
- Blocked user cannot create a booking.
- Two users cannot successfully book the same table for overlapping time.
- Admin cannot access unnecessary personal data.

### Commands

If scripts exist, prefer these commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

If commands differ, inspect `package.json` and use the project-defined scripts.

---

## 16. Code quality rules

General rules:

- Prefer small, focused changes.
- Do not mix unrelated refactors with feature work.
- Keep functions readable and domain-oriented.
- Add types for public interfaces.
- Avoid `any` unless justified.
- Avoid duplicated business rules across frontend/backend.
- Keep validation close to API boundaries and domain services.
- Add comments only where they explain non-obvious decisions.

### TypeScript

- Use strict TypeScript where possible.
- Prefer explicit return types for exported functions.
- Use domain enums/constants from shared packages.
- Avoid stringly typed roles and statuses.

### Backend

- Keep controllers thin.
- Put business logic in services/domain modules.
- Use transactions for multi-step state changes.
- Never trust frontend validation.

### Frontend

- Keep components focused.
- Separate data fetching from presentational components when practical.
- Handle loading, empty, and error states.
- Use accessible labels for inputs and buttons.

---

## 17. Security rules

- Never commit secrets.
- Keep `.env.example` updated, but without real values.
- Validate Telegram auth/init data server-side.
- Validate all request bodies and query params.
- Enforce role checks on the server.
- Do not rely on hidden frontend controls for authorization.
- Apply rate limiting to sensitive endpoints.
- Avoid exposing stack traces in production responses.
- Sanitize or escape user-generated text in UI.
- Do not log sensitive headers or request bodies.

---

## 18. Observability and operations

Production starts with:

- Structured logs.
- `GET /health` endpoint.
- Uptime monitoring.
- Automated database backups.
- Backup restore instructions.

Do not add third-party monitoring that transfers personal data unless explicitly approved.

If adding error tracking, make sure sensitive data is scrubbed.

---

## 19. Documentation rules

Documentation is part of the portfolio and must stay current.

Update docs when changing architecture, product behavior, or setup.

Important docs:

```text
README.md
ROADMAP.md
AGENTS.md
docs/architecture/overview.md
docs/architecture/database.md
docs/architecture/auth.md
docs/architecture/booking.md
docs/architecture/telegram.md
docs/codex/prompt-log.md
docs/codex/dev-diary.md
docs/codex/review-checklist.md
```

### ADRs

For important decisions, add an ADR in `docs/adr/`.

Examples:

```text
0001-use-typescript-monorepo.md
0002-use-rest-openapi.md
0003-use-telegram-first-auth.md
0004-booking-conflict-strategy.md
```

---

## 20. AI-assisted workflow rules

This repository intentionally demonstrates AI-assisted development.

When Codex performs a task, the PR should make the AI workflow reviewable.

### For each task

- Keep the scope small.
- Prefer one issue → one branch → one PR.
- Include tests or explain why not.
- Update docs if behavior changes.
- Mention assumptions in the PR description.
- Mention risks and manual test steps.

### Prompt log

Important prompts and task instructions may be summarized in:

```text
docs/codex/prompt-log.md
```

Do not include secrets, private user data, or production credentials in prompt logs.

### Dev diary

Architectural lessons, tradeoffs, and AI-assisted development notes may be recorded in:

```text
docs/codex/dev-diary.md
```

---

## 21. Pull request checklist

Every PR should answer:

- What problem does this solve?
- What changed?
- How was it tested?
- Were migrations added?
- Were docs updated?
- Are there privacy/security implications?
- Are there new environment variables?
- Are there follow-up tasks?

Suggested PR checklist:

```md
## Summary

## Changes

## Tests
- [ ] Lint passed
- [ ] Typecheck passed
- [ ] Unit tests passed
- [ ] Integration/e2e tests passed where relevant

## Database
- [ ] No schema changes
- [ ] Migration added
- [ ] Seed data updated if needed

## Security / privacy
- [ ] No secrets committed
- [ ] No unnecessary personal data exposed
- [ ] Logs do not contain sensitive data

## Documentation
- [ ] README/docs updated if needed
- [ ] ADR added if this is an architectural decision

## Manual verification

## Follow-ups
```

---

## 22. Branch naming

Use descriptive branch names:

```text
feature/booking-create-request
feature/admin-confirm-booking
feature/telegram-notifications
feature/meetup-message-feed
fix/booking-race-condition
test/concurrent-booking
docs/update-architecture
```

---

## 23. Definition of Done

A task is done only when:

- Code is implemented.
- Relevant tests pass.
- Typecheck passes.
- Lint passes.
- API docs are updated if endpoints changed.
- Database migrations are included if schema changed.
- `.env.example` is updated if env vars changed.
- User-facing text is in Russian unless intentionally technical/internal.
- Privacy impact was considered.
- README/docs are updated if behavior or setup changed.

---

## 24. Out-of-scope features unless explicitly requested

Do not implement these without human approval:

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

---

## 25. First implementation priorities

Recommended order:

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

---

## 26. Human escalation points

Ask for human clarification before changing:

- Product scope.
- Auth strategy.
- Personal data collection.
- Legal/privacy flows.
- Production deployment architecture.
- Booking conflict policy.
- Administrator data visibility.
- Third-party services.
- Any out-of-scope feature listed above.

When blocked, make the smallest safe assumption, document it, and keep the implementation easy to change.

---

## 27. Language rules

- User-facing UI text should be Russian.
- Developer documentation may be English or Russian, but keep each file internally consistent.
- Code identifiers should be English.
- API route names should be English.
- Domain explanations in README may be bilingual if useful for portfolio presentation.

---

## 28. Final reminder for agents

This is not a toy demo. Treat it as a real club system with real users and personal data.

Prefer boring, reliable engineering over clever abstractions.

Build in small steps, test critical rules, document decisions, and keep the AI-assisted workflow visible and reviewable.
