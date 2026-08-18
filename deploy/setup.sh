#!/bin/bash
set -euo pipefail

DOMAIN="spikeclip.app"
SWAP_SIZE="2G"
REPO_URL="git@github.com:ahmedhat/SpikeClip.git"

echo "=== SpikeClip VPS Setup ==="
echo "Target: Ryzen 7 7700X 2c/4t / 6GB DDR5 / 120GB NVMe / 1Gbps"
echo "Domain: $DOMAIN"
echo ""

# ── 1. System updates ──
echo "[1/13] Updating system..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ── 2. Install dependencies ──
echo "[2/13] Installing dependencies..."
sudo apt-get install -y -qq \
    curl wget git build-essential \
    nginx certbot python3-certbot-nginx \
    ufw ffmpeg

# ── 3. Create 2GB swap ──
echo "[3/13] Setting up swap ($SWAP_SIZE)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l $SWAP_SIZE /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    sudo sysctl vm.swappiness=10
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    echo "Swap created: $SWAP_SIZE"
else
    echo "Swap already exists"
fi

# ── 4. Install Docker ──
echo "[4/13] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
fi

# ── 5. Install Docker Compose plugin ──
echo "[5/13] Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    sudo apt-get install -y -qq docker-compose-plugin
fi

# ── 6. Install Node.js 24 via NodeSource ──
echo "[6/13] Installing Node.js 24..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1)" != "v24" ]; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
fi
echo "Node: $(node -v), npm: $(npm -v)"

# ── 7. Install pnpm ──
echo "[7/13] Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm@9
fi
echo "pnpm: $(pnpm -v)"

# ── 8. Install yt-dlp ──
echo "[8/13] Installing yt-dlp..."
if ! command -v yt-dlp &> /dev/null; then
    sudo apt-get install -y -qq python3-pip
    sudo pip3 install --break-system-packages yt-dlp
fi

# ── 9. Create spikeclip user ──
echo "[9/13] Setting up spikeclip user..."
if ! id "spikeclip" &>/dev/null; then
    sudo adduser --system --home /home/spikeclip --shell /bin/bash --group spikeclip
    sudo mkdir -p /home/spikeclip
    sudo chown spikeclip:spikeclip /home/spikeclip
fi

# ── 10. Clone and build ──
echo "[10/13] Cloning and building project..."
sudo -u spikeclip bash -c '
    cd /home/spikeclip
    if [ ! -d "spikeclip" ]; then
        git clone '"$REPO_URL"' SpikeClip
    fi
    cd SpikeClip
    pnpm install
    pnpm build
'

# ── 11. Copy systemd units ──
echo "[11/13] Installing systemd services..."
sudo cp /home/spikeclip/SpikeClip/deploy/spikeclip-api.service /etc/systemd/system/
sudo cp /home/spikeclip/SpikeClip/deploy/spikeclip-web.service /etc/systemd/system/
sudo systemctl daemon-reload

# ── 12. Configure .env ──
echo "[12/13] Configuring environment..."
if [ ! -f /home/spikeclip/SpikeClip/.env ]; then
    cp /home/spikeclip/SpikeClip/.env.example /home/spikeclip/SpikeClip/.env
    echo "Created .env from .env.example — edit it with your secrets"
fi

# ── 13. Configure firewall + sysctl + nginx ──
echo "[13/13] Configuring firewall, kernel, and Nginx..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

sudo sysctl -w net.core.somaxconn=1024
echo 'net.core.somaxconn=1024' | sudo tee -a /etc/sysctl.conf

sudo systemctl enable nginx
sudo systemctl start nginx

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. DNS: Point $DOMAIN A record -> $(curl -s ifconfig.me)"
echo "  2. Edit .env: nano /home/spikeclip/SpikeClip/.env"
echo "  3. Start infra: /home/spikeclip/SpikeClip/deploy/start.sh"
echo "  4. Prisma migrate: cd /home/spikeclip/SpikeClip/apps/api && npx prisma migrate deploy"
echo "  5. SSL cert: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "  6. Start all: /home/spikeclip/SpikeClip/deploy/start.sh"
echo ""
echo "  Verify: curl -I https://$DOMAIN"
echo "  Verify: curl -I https://$DOMAIN/api/health"
