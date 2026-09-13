# syntax=docker/dockerfile:1

# ─── Base (shared deps) ───
FROM spikeclip-base:ci AS base

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# ─── Builder (dev deps + build) ───
FROM base AS builder

RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
RUN pnpm --filter @spikeclip/shared build
COPY apps/api ./apps/api
RUN pnpm --filter @spikeclip/api build
RUN pnpm --filter @spikeclip/api exec prisma generate

# ─── Migrate (dev deps + prisma CLI for migrations) ───
FROM builder AS migrate

WORKDIR /app/apps/api
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# ─── Production (prod deps only) ───
FROM base AS production

RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared ./packages/shared

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs && chown -R nestjs:nodejs /app

USER nestjs
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main"]