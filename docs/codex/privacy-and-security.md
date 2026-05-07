# Privacy And Security

This project processes personal data. Treat privacy as a core requirement.

## Data Minimization

Collect only what is necessary:

- Display name / nickname.
- Telegram ID for account linking.
- Telegram username when available.
- Emergency phone number.
- Optional email.
- Legal consent records.

Do not collect birth date, address, passport data, payment data, or unnecessary profile data.

## Sensitive Logging

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
- Sensitive request bodies.

Logs should use internal IDs instead of personal data.

## Administrator Data Visibility

Administrators should see only operationally necessary contact data.

Preferred visibility:

- Display name: visible.
- Telegram username: visible if available and appropriate.
- Phone: hidden or masked by default; visible only through an explicit break-glass action for emergency contact.
- Email: hidden or masked by default.

Every full-phone reveal must be audit-logged with actor, target user, timestamp, and reason when available.

## Legal Consent Records

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

## Account Deletion

Prefer soft delete plus anonymization of personal data where business records must remain.

## Security Rules

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

## Operations And Monitoring

Production starts with:

- Structured logs.
- `GET /health` endpoint.
- Uptime monitoring.
- Automated database backups.
- Backup restore instructions.

Do not add third-party monitoring that transfers personal data unless explicitly approved.

If adding error tracking, make sure sensitive data is scrubbed.
