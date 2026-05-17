#!/usr/bin/env bash
# ONE-TIME GoDaddy VPS setup (Ubuntu). Run as user with sudo.
# Usage: curl or scp this repo, then:  bash deploy/vps-bootstrap.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/clothing-business}"
REPO_URL="${REPO_URL:-https://github.com/zub165/Clothing.git}"
DOMAIN="${DOMAIN:-}"

echo "=== Clothify VPS bootstrap ==="

if ! command -v node >/dev/null 2>&1; then
  echo "→ Installing Node.js 22 (required for Vite 8 / React build)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

for pkg in mysql-server nginx git; do
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    echo "→ Installing $pkg"
    sudo apt-get update
    sudo apt-get install -y "$pkg"
  fi
done

if ! command -v pm2 >/dev/null 2>&1; then
  echo "→ Installing PM2"
  sudo npm install -g pm2
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "→ Cloning repository to $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  cp .env.production.example .env
  echo ""
  echo "IMPORTANT: Edit $APP_DIR/.env (DB password, JWT_SECRET, CORS_ORIGINS)"
  echo "  nano .env"
  echo ""
fi

chmod +x deploy/*.sh

echo "→ Create MySQL database (you may be prompted for root password)"
read -r -p "MySQL root password: " -s MYSQL_ROOT
echo ""
read -r -p "New DB password for clothing_user: " -s DB_PASS
echo ""

sudo mysql -u root -p"$MYSQL_ROOT" <<EOF
CREATE DATABASE IF NOT EXISTS clothing_business;
CREATE USER IF NOT EXISTS 'clothing_user'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER 'clothing_user'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON clothing_business.* TO 'clothing_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Patch .env DB password if still placeholder
if grep -q 'CHANGE_ME' .env 2>/dev/null; then
  sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASS}/" .env
fi

./deploy/migrate-db.sh
./deploy/release.sh

if [[ -n "$DOMAIN" ]]; then
  echo "→ Nginx site for $DOMAIN"
  sudo cp deploy/nginx-clothify.conf "/etc/nginx/sites-available/clothify"
  sudo sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" "/etc/nginx/sites-available/clothify"
  sudo ln -sf /etc/nginx/sites-available/clothify /etc/nginx/sites-enabled/clothify
  sudo nginx -t && sudo systemctl reload nginx
  echo "  Run SSL: sudo certbot --nginx -d ${DOMAIN}"
fi

echo ""
echo "=== Bootstrap done ==="
echo "Add GitHub secrets: VPS_HOST, VPS_USER, SSH_PASSWORD"
echo "Verify: curl http://127.0.0.1:3100/api/status"
