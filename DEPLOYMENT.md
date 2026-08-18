# Deployment Guide

## Local Development

### Prerequisites
- Node.js ≥ 24
- pnpm 9.x
- Docker + Docker Compose
- yt-dlp (`pip install yt-dlp`)
- FFmpeg (`apt install ffmpeg` / `brew install ffmpeg`)

### Setup

```bash
git clone git@github.com:ahmedhat/SpikeClip.git
cd spikeclips
pnpm install

# Start infrastructure containers (Postgres, Redis, MinIO)
./scripts/dev.sh

# Set up environment (in another terminal)
cp .env.example apps/api/.env

# Run migrations
pnpm --filter @spikeclip/api prisma:migrate

# Start dev servers
pnpm dev
```

### Quick Commands

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm start            # Start all apps in production mode
pnpm test             # Run all tests
pnpm dev:api          # Start API only
pnpm dev:web          # Start Web only
```

### Services

| Service | Port | Access | Description |
|---------|------|--------|-------------|
| Frontend | 3000 | Via nginx (port 80) | Next.js app |
| API | 3001 | Internal only (via Next.js proxy) | NestJS API |
| Swagger | 3001/api/docs | Local dev only | API documentation |
| PostgreSQL | 5432 | localhost | Database |
| Redis | 6379 | localhost | Job queues |
| MinIO | 9000/9001 | localhost | Object storage |
| nginx | 80 | Public | Reverse proxy → web only |

### Stripe Webhooks (local dev)

Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run:

```bash
stripe login
stripe listen --forward-to localhost:3001/api/payments/webhook
```

The CLI prints a webhook signing secret (`whsec_...`). Copy it into your `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Trigger test events:

```bash
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

### Storage

The API supports two storage drivers:
- **local** (default): Files stored in `/tmp/spikeclips-clips`
- **minio**: Files stored in MinIO object storage

Set `STORAGE_DRIVER=minio` in `.env` to use MinIO. Music uploads require the storage service to support `delete()`.

---

## Production (VPS)

### Target Specs
- AMD Ryzen 7 7700X (2c/4t)
- 6GB DDR5 RAM
- 120GB NVMe Gen5
- 1Gbps network
- Ubuntu 24.04 (Germany)

### Quick Setup

```bash
# Upload deploy scripts
scp -r deploy/ root@your-vps:/opt/spikeclips/

# SSH into VPS
ssh root@your-vps
cd /opt/spikeclips

# Run setup
chmod +x deploy/setup.sh
./deploy/setup.sh
```

### What setup.sh Does

1. System updates + dependencies (Nginx, Certbot, FFmpeg, UFW)
2. Creates 2GB swap
3. Installs Docker + Docker Compose
4. Installs Node.js 24, pnpm 9
5. Installs yt-dlp
6. Creates `spikeclips` system user
7. Clones repo, installs deps, builds
8. Installs systemd services
9. Configures UFW firewall (ports 22, 80, 443)
10. Configures Nginx

### Security Hardening

```bash
chmod +x deploy/harden.sh
./deploy/harden.sh
```

Changes:
- SSH port: 22 → 2222
- Root login: disabled
- SSH key auth: enforced
- Fail2Ban: 5 retries → 1hr ban
- Unattended security updates

### Service Management

```bash
./deploy/start.sh   # Start all services
./deploy/stop.sh    # Stop all services
```

### Systemd Services

| Service | Memory | CPU | User |
|---------|--------|-----|------|
| `spikeclips-api` | 1.5GB | 80% | spikeclips |
| `spikeclips-web` | 1GB | 60% | spikeclips |

### Nginx Configuration

- HTTP → HTTPS redirect
- SSL via Let's Encrypt / Certbot
- Reverse proxy to **web only** (127.0.0.1:3000)
- API traffic routes through Next.js internal proxy (`/api/[...path]/route.ts`)
- Security headers via include files (CSP handled by Next.js)

### Post-Setup

```bash
# 1. Point DNS
# Add A record: spikeclips.com → your-vps-ip

# 2. Edit environment
nano /home/spikeclips/spikeclips/.env

# 3. Start infrastructure
/home/spikeclips/spikeclips/deploy/start.sh

# 4. Run migrations
cd /home/spikeclips/spikeclips/apps/api
npx prisma migrate deploy

# 5. Get SSL certificate
sudo certbot --nginx -d spikeclips.com -d www.spikeclips.com

# 6. Verify
curl -I https://spikeclips.com
curl -I https://spikeclips.com/api/health
```
