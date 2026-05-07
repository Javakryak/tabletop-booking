# Testing Strategy

Every meaningful feature should include tests at the appropriate level.

## Required Test Categories

- Unit tests for domain rules.
- Integration tests for API + database workflows.
- API e2e tests for critical user/admin flows.
- Playwright smoke tests for main UI flows.
- Bot tests for commands and callbacks.
- Concurrency test for booking conflicts.

## Minimum Critical MVP Booking Tests

Before considering MVP booking ready, tests must cover:

- User can create a pending booking.
- Admin can confirm a booking.
- User can cancel a booking according to rules.
- User cannot book a blocked table.
- User cannot book outside working hours.
- Blocked user cannot create a booking.
- Two users cannot successfully book the same table for overlapping time.
- Admin cannot access unnecessary personal data.

## Preferred Commands

If scripts exist, prefer:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

If commands differ, inspect `package.json` and use project-defined scripts.

If commands are not available yet, state that clearly. Do not invent hidden project behavior.
