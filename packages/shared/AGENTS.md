# packages/shared/AGENTS.md

Rules for shared domain types, constants, enums, and validation helpers.

## Rules

- Prefer shared enums/constants for roles, booking statuses, meetup statuses, and other cross-app domain values.
- Avoid stringly typed roles and statuses.
- Keep shared code framework-light where possible.
- Do not put app-specific business logic here unless it is genuinely used by multiple apps.
- Keep public interfaces typed and stable.

## References

See [../../docs/codex/domain-rules.md](../../docs/codex/domain-rules.md) for approved domain values and workflow rules.

## Testing

Add focused unit tests for shared validation or domain helpers when behavior is introduced.
