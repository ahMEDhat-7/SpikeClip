# syntax=docker/dockerfile:1

# ─── Base (shared deps) ───
FROM spikeclip-base:ci AS base

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY vendor/openreel-video ./vendor/openreel-video

# ─── Builder (dev deps + build) ───
FROM base AS builder

RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
RUN pnpm --filter @spikeclip/shared build
COPY apps/web ./apps/web
RUN pnpm --filter @spikeclip/web build

# ─── Production (prod deps only) ───
FROM base AS production

RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder /app/packages/shared ./packages/shared

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs && chown -R nextjs:nodejs /app

USER nextjs
WORKDIR /app/apps/web
ENV PORT=3000
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]