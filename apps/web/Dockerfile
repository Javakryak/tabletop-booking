FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tabletop-booking/web build
RUN pnpm --filter @tabletop-booking/web deploy --legacy --prod /opt/app
RUN cp -R apps/web/.next /opt/app/.next
RUN cp apps/web/next.config.mjs /opt/app/next.config.mjs

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /opt/app/ ./
EXPOSE 3000
CMD ["node", "./node_modules/next/dist/bin/next", "start", "--port", "3000"]
