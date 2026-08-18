#!/bin/bash
set -euo pipefail

SSH_PORT=2222
BANNER="
╔══════════════════════════════════════════════════════════════╗
║           SPIKECLIP VPS SECURITY HARDENING                  ║
║           SSH Port: $SSH_PORT | Root Login: OFF              ║
╚══════════════════════════════════════════════════════════════╝
"
echo "$BANNER"

# ══════════════════════════════════════════════════════════════
# 1. Backup SSH config
# ══════════════════════════════════════════════════════════════
echo "[1/10] Backing up SSH config..."
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d_%H%M%S)
echo "  Backup: /etc/ssh/sshd_config.bak.*"

# ══════════════════════════════════════════════════════════════
# 2. Change SSH port to 2222
# ══════════════════════════════════════════════════════════════
echo "[2/10] Changing SSH port to $SSH_PORT..."
if grep -q "^#Port 22" /etc/ssh/sshd_config; then
    sudo sed -i "s/^#Port 22/Port $SSH_PORT/" /etc/ssh/sshd_config
elif grep -q "^Port 22" /etc/ssh/sshd_config; then
    sudo sed -i "s/^Port 22/Port $SSH_PORT/" /etc/ssh/sshd_config
else
    echo "Port $SSH_PORT" | sudo tee -a /etc/ssh/sshd_config > /dev/null
fi
echo "  SSH port set to $SSH_PORT"

# ══════════════════════════════════════════════════════════════
# 3. Disable root SSH login
# ══════════════════════════════════════════════════════════════
echo "[3/10] Disabling root SSH login..."
sudo sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
echo "  PermitRootLogin = no"

# ══════════════════════════════════════════════════════════════
# 4. Enforce SSH key authentication
# ══════════════════════════════════════════════════════════════
echo "[4/10] Enforcing SSH key authentication..."
sudo sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/^PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/^#ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
echo "  PasswordAuthentication = no"
echo "  PubkeyAuthentication = yes"

# ══════════════════════════════════════════════════════════════
# 5. Install + configure Fail2Ban
# ══════════════════════════════════════════════════════════════
echo "[5/10] Installing Fail2Ban..."
if ! command -v fail2ban-client &> /dev/null; then
    sudo apt-get install -y -qq fail2ban
fi

sudo tee /etc/fail2ban/jail.local > /dev/null << 'FAIL2BAN'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd
banaction = ufw

[sshd]
enabled = true
port = 2222
maxretry = 5
bantime = 3600
FAIL2BAN

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
echo "  Fail2Ban configured: port 2222, 5 retries → 1hr ban"

# ══════════════════════════════════════════════════════════════
# 6. Update UFW for new SSH port
# ══════════════════════════════════════════════════════════════
echo "[6/10] Updating UFW firewall..."
sudo ufw allow $SSH_PORT/tcp
sudo ufw delete allow 22/tcp 2>/dev/null || true
sudo ufw --force enable
sudo ufw status verbose
echo "  UFW: port 2222/tcp (SSH), 80/tcp (HTTP), 443/tcp (HTTPS)"

# ══════════════════════════════════════════════════════════════
# 7. Enable unattended upgrades
# ══════════════════════════════════════════════════════════════
echo "[7/10] Enabling unattended upgrades..."
if ! dpkg -l | grep -q unattended-upgrades; then
    sudo apt-get install -y -qq unattended-upgrades
fi

sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null << 'UPGRADES'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
UPGRADES

echo "  Auto-updates enabled (daily)"

# ══════════════════════════════════════════════════════════════
# 8. Install + configure auditd
# ══════════════════════════════════════════════════════════════
echo "[8/10] Installing auditd..."
if ! command -v auditctl &> /dev/null; then
    sudo apt-get install -y -qq auditd
fi

sudo tee /etc/audit/rules.d/spikeclip.rules > /dev/null << 'AUDIT'
# SSH config changes
-w /etc/ssh/sshd_config -p wa -k ssh_config

# User/password changes
-w /etc/passwd -p wa -k user_mod
-w /etc/shadow -p wa -k pass_mod
-w /etc/group -p wa -k group_mod

# Sudo changes
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# Docker changes
-w /etc/docker/ -p wa -k docker_config

# Systemd service changes
-w /etc/systemd/system/ -p wa -k systemd_mod

# Critical binaries
-w /usr/bin/sudo -p x -k priv_esc
-w /usr/bin/su -p x -k priv_esc
-w /usr/bin/passwd -p x -k priv_esc
AUDIT

sudo augenrules --load 2>/dev/null || sudo service auditd restart
echo "  Auditd rules loaded"

# ══════════════════════════════════════════════════════════════
# 9. Install + run Lynis security audit
# ══════════════════════════════════════════════════════════════
echo "[9/10] Installing Lynis..."
if ! command -v lynis &> /dev/null; then
    sudo apt-get install -y -qq lynis
fi

echo "  Running Lynis audit (this may take a minute)..."
sudo lynis audit system --no-colors --quick 2>/dev/null | tee /tmp/lynis-report.txt || true
echo "  Report saved: /tmp/lynis-report.txt"

# ══════════════════════════════════════════════════════════════
# 10. Restart SSH + print summary
# ══════════════════════════════════════════════════════════════
echo "[10/10] Restarting SSH..."
sudo systemctl restart sshd

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              SECURITY HARDENING COMPLETE                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Changes applied:"
echo "    SSH port:        22 → $SSH_PORT"
echo "    Root login:      Disabled"
echo "    Password auth:   Disabled (key-only)"
echo "    Fail2Ban:        Active (port $SSH_PORT, 5 retries → 1hr ban)"
echo "    UFW:             $SSH_PORT/tcp, 80/tcp, 443/tcp"
echo "    Unattended:      Daily auto-updates"
echo "    Auditd:          Monitoring SSH, users, sudo, Docker"
echo "    Lynis:           Report at /tmp/lynis-report.txt"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ⚠  IMPORTANT: TEST SSH ON PORT $SSH_PORT NOW!              ║"
echo "║                                                            ║"
echo "║  Open a NEW terminal and run:                              ║"
echo "║    ssh -p $SSH_PORT spikeclip@$(curl -s ifconfig.me)          ║"
echo "║                                                            ║"
echo "║  If it works, close this session.                          ║"
echo "║  If it fails, restore: sudo cp /etc/ssh/sshd_config.bak.*  ║"
echo "║                   /etc/ssh/sshd_config && sudo systemctl   ║"
echo "║                   restart sshd                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
