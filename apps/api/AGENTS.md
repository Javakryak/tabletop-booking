# apps/api/AGENTS.md

Rules for the NestJS REST API.

## API Style

- Use REST under `/api/v1`.
- Keep controllers thin.
- Put business logic in services or domain modules.
- Validate all request bodies and query params with DTOs/schemas.
- Return consistent error shapes.
- Document public API endpoints used by the web app or bot with OpenAPI/Swagger.

## Authorization

- Enforce role checks on the server.
- Do not rely on hidden frontend controls for authorization.
- Users can access only their own private data.
- Keep admin and owner endpoints clearly separated.
- Avoid leaking personal data in API responses.

## Privacy

- Admin responses should use masked contact data by default.
- Full-phone reveal requires an explicit break-glass action and an audit log record.
- Do not log sensitive headers, cookies, tokens, phone numbers, email addresses, or request bodies containing personal data.

## Testing

- Add unit tests for domain rules.
- Add integration/API e2e tests for critical user and admin workflows.
- Booking conflict, booking confirmation, cancellation, blocked-user, and privacy behavior need coverage when implemented.
