# docker/AGENTS.md

Rules for Docker and local/deployment infrastructure.

## Rules

- MVP local services are PostgreSQL and Redis.
- Do not bake secrets into images or compose files.
- Keep production deployment simple: Docker Compose on VPS.
- Use Caddy or nginx as reverse proxy unless a human changes the deployment architecture.

## Operations

- Production readiness requires a healthcheck, uptime monitoring, automated database backups, and restore instructions.
- Avoid third-party monitoring that transfers personal data unless explicitly approved.
