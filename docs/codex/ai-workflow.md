# AI-Assisted Workflow

This repository intentionally demonstrates AI-assisted development.

## Task Rules

For each task:

- Keep the scope small.
- Prefer one issue -> one branch -> one PR.
- Include tests or explain why not.
- Update docs if behavior changes.
- Mention assumptions in the PR description.
- Mention risks and manual test steps.

## Prompt Log

Important prompts and task instructions may be summarized in:

```text
docs/codex/prompt-log.md
```

Do not include secrets, private user data, or production credentials in prompt logs.

## Dev Diary

Architectural lessons, tradeoffs, and AI-assisted development notes may be recorded in:

```text
docs/codex/dev-diary.md
```

## Pull Request Expectations

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

## Branch Naming

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

## Definition Of Done

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
