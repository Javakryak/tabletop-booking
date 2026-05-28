# Deployment Guide (Staging and Production)

This guide documents a repeatable deployment process for `tabletop-booking` on staging and production.
It is intentionally practical and manual-first: no CI/CD automation is required for this task.

## Scope

Included:

- staging deployment process;
- production deployment process;
- required environment variables;
- Telegram webhook setup;
- backup and restore procedures.

Out of scope:

- reverse-proxy/HTTPS implementation details (`TASK-1303`);
- automated backup scripts (`TASK-1304`);
- uptime monitoring setup (`TASK-1306`).

## Prerequisites

- Linux VPS (or cloud VM) with Docker Engine and Docker Compose plugin.
- Git access to this repository.
- Node.js 22+ and `pnpm` on the deployment host (for Prisma migrations).
- Separate domains/subdomains for staging and production.
- HTTPS configured before enabling Telegram webhooks.

Recommended deployment layout on host:

```text
/opt/tabletop-booking/
  repo checkout
  .env.staging
  .env.production
  backups/
```

## Environment Separation Rules

- Use different `.env` files for staging and production.
- Never reuse production secrets in staging.
- Never commit real secrets into git.
- Staging and production must use different PostgreSQL databases and Telegram bot tokens.

## Environment Variables

Create `.env.staging` and `.env.production` from the existing examples:

```bash
cp .env.example .env.staging
cp .env.example .env.production
```

Minimum required values for `docker-compose.prod.yml`:

```text
APP_ENV
APP_BASE_URL
API_BASE_URL
NEXT_PUBLIC_APP_BASE_URL
NEXT_PUBLIC_API_BASE_URL
CORS_ORIGIN
DATABASE_URL
REDIS_URL
JWT_SECRET
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
TELEGRAM_WEBHOOK_URL
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
```

Bot webhook-related values:

```text
TELEGRAM_UPDATE_MODE=webhook
TELEGRAM_WEBHOOK_URL=https://<public-domain>/telegram/webhook
TELEGRAM_WEBHOOK_PATH=/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=<long-random-secret>
TELEGRAM_WEBHOOK_HOST=0.0.0.0
TELEGRAM_WEBHOOK_PORT=8081
```

`TELEGRAM_WEBHOOK_PATH` must match the path part of `TELEGRAM_WEBHOOK_URL`.

## Staging Deployment

1. Update code on server:

```bash
cd /opt/tabletop-booking
git fetch origin
git checkout main
git pull --ff-only
```

2. Install dependencies for migration tooling:

```bash
pnpm install --frozen-lockfile
```

3. Apply pending Prisma migrations to staging database:

```bash
set -a
source .env.staging
set +a
pnpm prisma migrate deploy --schema prisma/schema.prisma
```

4. Build and start staging services:

```bash
docker compose --env-file .env.staging -f docker-compose.prod.yml build
docker compose --env-file .env.staging -f docker-compose.prod.yml up -d
```

5. Verify staging:

```bash
docker compose --env-file .env.staging -f docker-compose.prod.yml ps
curl -fsS https://<staging-api-domain>/api/v1/health
```

## Production Deployment

1. Confirm staging has already validated the same commit.
2. Create a fresh database backup before rollout (see backup section below).
3. Update code on server to target commit/tag.
4. Apply migrations with production env:

```bash
set -a
source .env.production
set +a
pnpm prisma migrate deploy --schema prisma/schema.prisma
```

5. Build and start production services:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

6. Verify production:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -fsS https://<production-api-domain>/api/v1/health
```

## Telegram Webhook Setup

1. Ensure reverse proxy routes public HTTPS webhook path to bot container:
   `https://<domain>/<telegram_webhook_path>`.
2. Set webhook env values in environment file:
   `TELEGRAM_UPDATE_MODE=webhook`, `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_PATH`.
3. Start/restart bot service using deployment steps above.
4. Verify webhook from a secure shell (do not save token in shell history):

```bash
curl -fsS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

Expected result:

- `url` equals `TELEGRAM_WEBHOOK_URL`;
- `last_error_message` is empty.

## Backup and Restore

Use PostgreSQL logical dumps (`pg_dump`/`pg_restore`).

### Backup

1. Prepare backup directory:

```bash
mkdir -p /opt/tabletop-booking/backups
```

2. Create timestamped compressed dump:

```bash
set -a
source .env.production
set +a
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "/opt/tabletop-booking/backups/tabletop-booking_$(date +%Y%m%d_%H%M%S).dump"
```

3. Keep retention policy outside git (for example, 14 daily backups + 8 weekly backups).

### Restore (recommended first on staging)

1. Stop API and bot services to prevent writes:

```bash
docker compose --env-file .env.staging -f docker-compose.prod.yml stop api bot
```

2. Restore selected backup:

```bash
set -a
source .env.staging
set +a
cat /opt/tabletop-booking/backups/<backup-file>.dump | \
  docker compose --env-file .env.staging -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
```

3. Start services and verify health endpoint.

Important:

- test restore on staging regularly;
- do not consider backup setup complete without successful restore checks.

## Security Notes

- Never print `.env` contents in logs or chat.
- Never commit real webhook URLs, bot tokens, JWT secrets, or database passwords.
- Keep production and staging secrets in a dedicated secret manager or host-level protected files.

## Related Docs

- [README.md](../README.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [TASKS.md](../TASKS.md)
- [MVP_CHECKLIST.md](../MVP_CHECKLIST.md)
