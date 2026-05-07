# packages/database/AGENTS.md

Rules for database package helpers around Prisma/client usage.

## Rules

- Export shared Prisma client helpers here when needed.
- Keep transaction helpers explicit and easy to test.
- Do not hide business rules in generic database utilities.
- Do not log queries or payloads containing personal data.
- Keep seed/test utilities separate from production runtime code.

## Testing

- Add test database helpers only when test infrastructure exists.
- Keep database-related tests deterministic and isolated.
