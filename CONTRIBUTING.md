# Contributing Guide

This document describes how humans and AI coding agents, including Codex, should contribute to this repository.

The project is both a real production-oriented booking system for a board game and wargame club and a portfolio project demonstrating an AI-assisted development workflow. Contributions must prioritize correctness, privacy, maintainability, testability, and small reviewable changes.

---

## 1. Contribution principles

All contributors must follow these principles:

- Work through small, focused pull requests.
- Keep each PR tied to one issue or one clearly defined task.
- Do not implement unrelated changes while working on a task.
- Do not introduce new dependencies without explaining why.
- Do not commit secrets, real personal data, tokens, dumps, or production logs.
- Update tests and documentation together with code changes.
- Keep the application usable for a real club, not only for a demo.
- Preserve the AI-assisted development trail through issues, PR descriptions, review notes, and documentation updates.

If a task is ambiguous, prefer the smallest safe implementation and document assumptions in the PR.

---

## 2. Required reading before contributing

Before making changes, read the relevant project documents:

- `README.md` — project overview and local development entry point.
- `ROADMAP.md` — phased implementation plan.
- `AGENTS.md` — rules for Codex and other AI coding agents.
- `ARCHITECTURE.md` — system design and component overview.
- `DATABASE.md` — database model, constraints, indexes, and seed data.
- `API_SPEC.md` — REST API v1 draft.
- `TASKS.md` — backlog of implementation tasks.
- `MVP_CHECKLIST.md` — MVP readiness checklist.

For domain-sensitive changes, especially authentication, bookings, privacy, audit logs, or Telegram integration, read the relevant architecture and database sections first.

---

## 3. Development workflow

### 3.1. Issue first

Every meaningful change should start from a GitHub Issue.

A good issue includes:

- problem or feature description;
- expected behavior;
- affected app/package;
- acceptance criteria;
- links to relevant docs;
- test expectations;
- privacy/security notes if applicable.

Use issues from `TASKS.md` where possible.

### 3.2. Branch naming

Use short, descriptive branch names.

Recommended format:

```text
<type>/<short-task-name>
```

Examples:

```text
feature/booking-create-request
feature/admin-confirm-booking
feature/bot-booking-notifications
fix/booking-race-condition
test/concurrent-booking
docs/update-api-spec
chore/setup-monorepo
```

### 3.3. Pull request size

Prefer small PRs. A PR should usually contain one of the following:

- one feature slice;
- one bug fix;
- one refactor;
- one documentation update;
- one test improvement;
- one infrastructure/setup change.

Avoid PRs that combine backend, frontend, bot, infrastructure, and documentation changes unless the task explicitly requires a vertical slice.

### 3.4. Pull request description

Each PR must include:

```md
## Summary
- What changed?
- Why was it changed?

## Scope
- Included:
- Not included:

## Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] API e2e tests
- [ ] UI e2e tests
- [ ] Bot tests
- [ ] Manual checks

## Privacy and security
- Does this change touch personal data?
- Does it affect auth, roles, audit logs, Telegram, or secrets?

## Documentation
- Which docs were updated?
- Which docs may need follow-up updates?

## Screenshots or demo
- Add screenshots/GIFs for UI changes when useful.
```

---

## 4. Commit guidelines

Use clear commit messages. Conventional Commits are recommended.

Examples:

```text
feat(api): add booking request endpoint
feat(web): add booking form skeleton
feat(bot): add start command
fix(api): prevent overlapping confirmed bookings
test(api): cover concurrent booking conflict
docs: update database booking constraints
chore: add docker compose services
```

Recommended types:

```text
feat
fix
docs
test
refactor
chore
ci
build
perf
security
```

Avoid vague messages like:

```text
update
fix stuff
changes
wip
```

---

## 5. Local development

The exact commands may evolve during implementation. Keep `README.md` and this file updated when commands change.

Expected workflow:

```bash
pnpm install
pnpm dev
```

Expected local infrastructure:

```bash
docker compose up -d postgres redis
```

Expected database workflow:

```bash
pnpm db:migrate
pnpm db:seed
```

Expected quality checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

If a command is not available yet, do not invent hidden behavior. Add the command only when the underlying implementation exists.

---

## 6. Environment variables and secrets

Never commit real secrets.

Allowed:

- `.env.example`
- documented placeholder values;
- local development instructions.

Forbidden:

- real Telegram bot token;
- JWT secrets;
- database passwords for production/staging;
- production URLs with credentials;
- dumps with real user data;
- logs containing personal data;
- Telegram Mini App init data;
- session cookies;
- API tokens.

Each app should have an example env file when needed:

```text
apps/api/.env.example
apps/web/.env.example
apps/bot/.env.example
```

Typical variables:

```text
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
APP_BASE_URL=
API_BASE_URL=
CORS_ORIGIN=
```

---

## 7. Code style

### 7.1. TypeScript

Use TypeScript across the monorepo.

Rules:

- Avoid `any` unless there is a documented reason.
- Prefer explicit domain types and enums.
- Keep DTOs and validation schemas close to API boundaries.
- Keep domain rules in services, not in controllers or UI components.
- Avoid duplicating shared types between frontend, backend, and bot.
- Prefer readable code over clever abstractions.

### 7.2. Backend

Expected backend style:

- NestJS modules by domain.
- Controllers should be thin.
- Services should contain business logic.
- Database access should be explicit and testable.
- Booking conflict checks must be implemented with transaction-safe logic.
- API responses should follow consistent error format.
- Role checks must be enforced server-side, not only in UI.

### 7.3. Frontend

Expected frontend style:

- Next.js application structure.
- Reusable booking UI components.
- Mobile-first design.
- Dark theme by default.
- Accessible forms and buttons.
- Avoid mixing admin and public UI logic in the same components when it reduces clarity.
- Components used for booking should be designed so they can later be reused in Telegram Mini App flows.

### 7.4. Telegram bot

Expected bot style:

- Keep bot command handlers small.
- Move business logic into API/backend services, not into bot handlers.
- Prefer buttons and callback actions over command-only UX.
- Local development may use polling.
- Staging and production should use webhooks.
- Never log Telegram tokens or raw sensitive update payloads.

---

## 8. Domain rules that must not be broken

### 8.1. Product scope

The project is for one club, not a multi-tenant SaaS.

Do not implement multi-club, payments, VK ID, Yandex ID, SMS OTP, realtime chat, or marketing analytics unless an issue explicitly changes scope.

### 8.2. Booking rules

Bookings:

- use 30-minute slot selection in UI;
- are stored as intervals in the database;
- require administrator confirmation;
- must not overlap for the same table when active;
- must respect room/table closures and schedule exceptions;
- must respect active booking limits;
- must respect cancellation rules.

Booking statuses:

```text
pending
confirmed
cancelled_by_user
cancelled_by_admin
completed
expired
```

### 8.3. Concurrent booking protection

The system must prevent double booking.

Any change touching booking creation or confirmation must consider the scenario:

> Two users simultaneously try to book the same table for overlapping time intervals.

Only one booking may be accepted for the same table and overlapping interval.

This behavior must be covered by integration tests.

### 8.4. Meetups

Meetups:

- collect participants first;
- do not reserve a table before enough participants join;
- create a booking request only after the required number of participants is reached;
- use a simple message feed in MVP;
- do not use realtime chat in MVP.

### 8.5. Phone number rule

Phone number is collected for emergency contact because Telegram may be unstable.

Rules:

- phone is nullable in the database;
- phone is required by business rules before a user can create a real booking;
- phone must not be used as the primary login method in MVP;
- phone must be hidden or masked by default in admin UI;
- full phone reveal is allowed only for emergency operational need;
- full phone reveal must be written to `audit_logs`;
- phone must not be logged in application logs.

### 8.6. Admin data access

Administrators see only minimum operational data.

They should usually see:

- display name;
- Telegram username when available;
- booking or meetup context;
- masked emergency contact if needed.

They should not freely browse unnecessary personal data.

### 8.7. Audit log

Audit log is part of MVP 1.

Audit important events such as:

- admin confirms booking;
- admin cancels booking;
- admin moves booking;
- owner changes booking rules;
- owner blocks user;
- room/table is closed or reopened;
- emergency phone is revealed;
- legal consent is accepted;
- account deletion or anonymization is requested/performed.

Audit logs must be append-only from the application perspective. Do not expose edit/delete behavior for audit records in normal UI.

### 8.8. Statistics and exports

Statistics dashboards and CSV/Excel export are MVP 3 / portfolio polish unless the club explicitly requires them earlier.

Do not implement them in MVP 1 unless the issue explicitly says so.

---

## 9. Privacy and personal data

The club is the personal data operator. The application must minimize personal data exposure.

### 9.1. Personal data examples

Treat the following as personal data:

- phone number;
- email;
- Telegram ID;
- Telegram username when linked to account activity;
- display name when linked to bookings;
- booking history;
- meetup participation;
- consent records;
- audit records involving user actions.

### 9.2. Logging rules

Do not log:

- phone numbers;
- emails;
- Telegram bot tokens;
- JWTs;
- session cookies;
- raw Telegram init data;
- sensitive headers;
- message feed contents unless explicitly required for moderation tooling;
- production personal data in test fixtures.

### 9.3. Test data

Use fake demo data only.

Do not use real club members, real phone numbers, or real emails in seeds or tests.

Recommended examples:

```text
demo-user@example.local
+70000000000
@demo_user
```

### 9.4. Account deletion and anonymization

If a change touches user deletion, it must preserve operational history while anonymizing unnecessary personal data.

Preferred approach:

- soft delete account;
- anonymize profile data;
- preserve booking records in anonymized form;
- preserve audit logs where legally/operationally required.

---

## 10. Testing requirements

Testing requirements depend on the change.

### 10.1. Unit tests

Add or update unit tests for:

- booking rules;
- role checks;
- status transitions;
- validation functions;
- schedule calculations;
- meetup status transitions.

### 10.2. Integration tests

Add or update integration tests for:

- booking creation;
- booking confirmation;
- booking cancellation;
- booking conflict prevention;
- user onboarding;
- role-protected endpoints;
- meetup participant flow;
- audit log creation.

### 10.3. API e2e tests

Add API e2e tests for user-facing and admin-facing flows where appropriate:

- user creates booking request;
- admin confirms booking;
- user sees updated booking status;
- owner blocks table or user;
- blocked user cannot create booking.

### 10.4. UI e2e tests

Use Playwright smoke tests for key flows when UI exists:

- public home page loads;
- demo user can view booking page;
- booking request can be created in demo/staging flow;
- admin can see pending request;
- admin can confirm booking.

### 10.5. Bot tests

Bot changes should be tested for:

- `/start`;
- account linking flow;
- booking notification messages;
- admin notification messages;
- callback button handling;
- meetup participation confirmation.

### 10.6. Required critical test

The project must include a critical concurrency test:

> Two concurrent requests try to create or confirm overlapping bookings for the same table. Only one succeeds.

This test is mandatory before booking can be considered MVP-ready.

---

## 11. Documentation requirements

Update documentation when behavior changes.

Examples:

- API endpoint changes → update `API_SPEC.md` and generated OpenAPI if available.
- Database schema changes → update `DATABASE.md`.
- Architecture decisions → add or update ADR in `docs/adr/`.
- Roadmap/scope changes → update `ROADMAP.md` and `TASKS.md`.
- User-visible behavior changes → update `README.md` or relevant docs.
- AI workflow lessons → update `docs/codex/dev-diary.md` when useful.

Documentation should explain why important decisions were made, not only what changed.

---

## 12. AI-assisted development workflow

This project intentionally demonstrates AI-assisted development.

When using Codex or another agent:

1. Give the agent one issue/task at a time.
2. Include relevant docs in the prompt.
3. Explicitly list what must not be changed.
4. Ask for a summary of changed files.
5. Ask for tests run and tests missing.
6. Review generated code before merging.
7. Keep useful prompts or summaries in `docs/codex/prompt-log.md` or `docs/codex/dev-diary.md`.

Recommended first-line instruction for Codex:

```text
Read AGENTS.md before making changes. Follow its scope, privacy, testing, and PR rules.
```

A good Codex task prompt:

```text
Read AGENTS.md, ARCHITECTURE.md, DATABASE.md, API_SPEC.md, and TASKS.md.

Implement TASK-XXXX only.

Do not implement unrelated features.
Do not change public API beyond what the task requires.
Do not add dependencies unless necessary and explained.
Add or update tests.
Update docs if behavior changes.
Return a summary of files changed and commands run.
```

---

## 13. Review checklist

Before merging a PR, check:

### Scope

- [ ] PR solves one issue or one clear task.
- [ ] No unrelated changes were added.
- [ ] New dependencies are justified.

### Code quality

- [ ] Code is readable and maintainable.
- [ ] TypeScript types are explicit where needed.
- [ ] Business logic is not hidden in controllers or UI components.
- [ ] Error handling is consistent.

### Domain correctness

- [ ] Booking rules are preserved.
- [ ] Role permissions are enforced server-side.
- [ ] Meetup flow still reserves tables only after enough participants join.
- [ ] Phone exposure rules are preserved.
- [ ] Audit logs are created for relevant admin/owner actions.

### Privacy and security

- [ ] No secrets committed.
- [ ] No real personal data committed.
- [ ] Logs do not include sensitive data.
- [ ] Access to personal data is minimized.
- [ ] Auth and role checks are covered where relevant.

### Tests

- [ ] Relevant unit tests added/updated.
- [ ] Relevant integration tests added/updated.
- [ ] E2E tests added/updated when needed.
- [ ] Concurrency behavior is not weakened.
- [ ] All required checks pass.

### Documentation

- [ ] README/docs updated if behavior changed.
- [ ] API spec updated if endpoints changed.
- [ ] Database docs updated if schema changed.
- [ ] ADR added for significant architecture decisions.

---

## 14. Definition of Done

A task is done when:

- implementation matches the issue acceptance criteria;
- no unrelated scope was added;
- code passes lint/typecheck/tests;
- relevant docs are updated;
- privacy and security implications are considered;
- new or changed behavior is covered by tests where reasonable;
- PR description explains what changed and how it was tested;
- reviewer can run or inspect the change without hidden setup.

For MVP-critical booking, auth, privacy, and admin workflows, “done” also requires integration or e2e coverage.

---

## 15. When not to contribute

Do not proceed without human review if the change would:

- alter personal data handling rules;
- change authentication architecture;
- change booking conflict prevention logic;
- add a third-party analytics or monitoring provider;
- expose phone/email data in a new way;
- add payment or commercial logic;
- introduce multi-club/multi-tenant architecture;
- remove audit logging;
- weaken tests around booking conflicts or role access.

Document the concern in the issue or PR and ask for explicit approval.

---

## 16. Maintainer notes

Recommended implementation order:

1. Repository foundation.
2. Local infrastructure.
3. Database schema and seed data.
4. API foundation.
5. Authentication and users.
6. Booking backend.
7. Admin and owner workflows.
8. Web UI.
9. Telegram bot.
10. Meetups.
11. Tests and hardening.
12. Deployment.
13. Portfolio polish.

For initial work, start with the first foundation tasks from `TASKS.md` and avoid implementing business features before the monorepo, database, CI, and local environment are stable.

