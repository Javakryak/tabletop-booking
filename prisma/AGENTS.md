# prisma/AGENTS.md

Rules for Prisma schema, migrations, and seed data.

## Migration Rules

- Every schema change must include a migration.
- Do not edit applied migrations unless the project is still pre-initial and a human approves reset.
- Update seed data when schema changes require it.

## Booking Model

- Store bookings as intervals: `start_at` and `end_at`.
- UI slots are 30-minute increments, not separate booking rows.
- Prevent overlapping pending or confirmed bookings for the same table.
- Critical overlap rule: `A.start_at < B.end_at AND A.end_at > B.start_at`.
- Consider race conditions. Use transactions and database-level protection where possible.

## Privacy Model

- Phone is nullable in the database for deletion/anonymization.
- Business rules require phone before real booking creation.
- Store legal consent records with document type/version, accepted timestamp, IP address, and user agent.
- Preserve audit logs for privileged actions and full-phone reveal.

## Testing

- Schema and non-trivial business changes need relevant tests.
- Booking conflict logic needs concurrency coverage.
