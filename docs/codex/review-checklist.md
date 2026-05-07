# Review Checklist

Use this checklist when preparing or reviewing pull requests.

## Summary

- The PR solves one clear problem.
- The scope is small and reviewable.
- Assumptions and follow-ups are documented.

## Tests

- Relevant unit, integration, e2e, UI, or bot tests were added or updated.
- If tests were not added, the PR explains why.
- Available quality commands were run or explicitly reported as not configured.

## Database

- Schema changes include migrations.
- Seed data was updated when required.
- Booking conflict and privacy-sensitive changes have appropriate coverage.

## Security And Privacy

- No secrets, tokens, production logs, dumps, or real personal data are committed.
- Logs do not contain sensitive data.
- API/UI changes do not expose unnecessary personal data.
- Admin contact visibility and break-glass behavior are preserved where relevant.

## Documentation

- README/docs were updated if behavior, setup, API, schema, privacy, or architecture changed.
- ADRs were added for important architectural decisions.
