# syntax=docker/dockerfile:1

# ─── Builder ───
FROM node:24-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages yt-dlp

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
# Prisma schema must be present before install (postinstall runs `prisma generate`)
COPY apps/api/prisma ./apps/api/prisma
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN pnpm install --frozen-lockfile

# Build shared package
COPY packages/shared ./packages/shared
RUN pnpm --filter @spikeclip/shared build

# Build API
COPY apps/api ./apps/api
RUN pnpm --filter @spikeclip/api build

# ─── Runtime ───
FROM node:24-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages yt-dlp

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Install only production dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
# Prisma schema must be present before install (postinstall runs `prisma generate`)
COPY apps/api/prisma ./apps/api/prisma
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared ./packages/shared
COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

RUN mkdir -p /tmp/spikeclips-clips
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs && chown -R nestjs:nodejs /app /tmp/spikeclips-clips

USER nestjs
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["./entrypoint.sh"]
