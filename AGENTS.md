# AGENTS.md

This file defines repository-wide rules for AI coding agents, including Codex.

The project is a production-oriented booking system for one board game and wargame club. It is also a portfolio project demonstrating an AI-assisted fullstack development workflow.

Optimize for correctness, privacy, maintainability, testability, and small reviewable pull requests.

---

## Read First

Before changing files, read the nearest nested `AGENTS.md` that applies to the path you touch. Local instructions add detail to these root rules.

Use these docs for reference instead of expanding this root file:

- [README.md](README.md) — project overview and local entry point.
- [ROADMAP.md](ROADMAP.md) — phased delivery plan.
- [TASKS.md](TASKS.md) — implementation backlog.
- [ARCHITECTURE.md](ARCHITECTURE.md) — target system architecture.
- [DATABASE.md](DATABASE.md) — database model notes.
- [API_SPEC.md](API_SPEC.md) — draft REST API contract.
- [docs/codex/project-decisions.md](docs/codex/project-decisions.md) — fixed decisions, stack, out-of-scope items, priorities.
- [docs/codex/domain-rules.md](docs/codex/domain-rules.md) — roles, booking, schedule, meetup, Telegram Mini App rules.
- [docs/codex/privacy-and-security.md](docs/codex/privacy-and-security.md) — personal data, logging, admin visibility, consent, deletion, security.
- [docs/codex/testing-strategy.md](docs/codex/testing-strategy.md) — required test categories and critical MVP tests.
- [docs/codex/ai-workflow.md](docs/codex/ai-workflow.md) — AI-assisted workflow, PR expectations, branch naming, DoD.

---

## Non-Negotiable Decisions

Do not reopen these decisions unless a human explicitly asks for a change:

- The product is for one club, not multi-tenant SaaS.
- The primary stack is TypeScript in a monorepo.
- Backend API style is REST under `/api/v1`, documented with OpenAPI/Swagger.
- Database is PostgreSQL; ORM is Prisma.
- Telegram is the primary auth and notification channel.
- Telegram Mini App readiness matters architecturally, but it is not the first implementation target.
- Phone number is collected for emergency contact. It is nullable in the database for deletion/anonymization, but required by business rules before real booking creation.
- Email is optional and used only as an alternative contact/login/recovery channel.
- Booking is confirmed by an administrator.
- Game meetups reserve a table only after the required number of participants is reached.
- MVP meetup chat is a simple message feed, not realtime chat.
- Payments, commercial logic, marketing pixels, invasive tracking, realtime chat, multi-club SaaS tenancy, and Kubernetes are out of scope unless explicitly requested.

---

## Privacy And Security Baseline

This project processes personal data. Treat privacy as a core requirement.

Never commit secrets, real personal data, production logs, database dumps, Telegram tokens, or credentials.

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

Use internal IDs in logs instead of personal data.

Administrators should see only operationally necessary contact data. Phone and email must be masked or hidden by default. Full-phone reveal is a break-glass action and must be audit-logged with actor, target user, timestamp, and reason when available.

Enforce authorization on the server. Hidden frontend controls are not security.

---

## Repository Map

Expected structure:

```text
apps/web          Next.js web app
apps/api          NestJS REST API
apps/bot          grammY Telegram bot
packages/shared   shared domain types/constants
packages/config   shared tooling/config
packages/database Prisma/database helpers
packages/ui       shared UI components
prisma            Prisma schema, migrations, seed
docker            local/deploy Docker files
docs              product, architecture, ADR, Codex docs
scripts           development and maintenance scripts
```

If adding a new top-level folder, explain why in the PR description.

---

## Development Workflow

- Keep changes small and focused.
- Prefer one issue → one branch → one pull request.
- Do not mix unrelated refactors with feature work.
- Follow existing repo patterns before introducing new conventions.
- Add tests for meaningful behavior changes.
- Update docs when changing architecture, product behavior, setup, API behavior, database schema, privacy/security behavior, or environment variables.
- Keep user-facing UI text in Russian unless intentionally technical/internal.
- Code identifiers and API route names should be English.
- Developer documentation may be English or Russian, but each file should be internally consistent.

---

## Quality Gates

If scripts exist, prefer:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

If commands differ, inspect `package.json` and use project-defined scripts. If the command is not configured yet, state that clearly instead of inventing hidden behavior.

---

## Human Escalation Points

Ask for human clarification before changing:

- Product scope.
- Auth strategy.
- Personal data collection.
- Legal/privacy flows.
- Production deployment architecture.
- Booking conflict policy.
- Administrator data visibility.
- Third-party services.
- Any explicitly out-of-scope feature.

When blocked, make the smallest safe assumption, document it, and keep the implementation easy to change.

---

## Definition Of Done

A task is done only when:

- Code or docs are implemented for the requested scope.
- Relevant tests pass, or the reason for no tests is explicit.
- Lint/typecheck/build are checked when configured and relevant.
- API docs are updated if endpoints changed.
- Database migrations are included if schema changed.
- `.env.example` is updated if env vars changed.
- Privacy impact was considered.
- README/docs are updated if behavior or setup changed.

This is not a toy demo. Treat it as a real club system with real users and personal data.
