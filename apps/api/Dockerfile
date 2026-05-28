FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tabletop-booking/api build
RUN pnpm --filter @tabletop-booking/api deploy --legacy /opt/app
RUN cp -R apps/api/dist /opt/app/dist

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /opt/app/ ./
EXPOSE 3001
CMD ["node", "--import", "tsx", "dist/main.js"]
