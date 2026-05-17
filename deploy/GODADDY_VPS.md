# Clothify — Local → GitHub → GoDaddy VPS

End-to-end: React shop + Express API + MySQL.

## Architecture

| Environment | React | API | Database |
|-------------|-------|-----|----------|
| **Local** | `:5180` (Vite) | `:3100` | MySQL `localhost:3306` |
| **Production** | `/shop/` on domain | same host `:3100` (PM2) | MySQL on VPS |

React talks to the API via **relative** `/api/...` (Vite proxy locally, same origin on VPS).

---

## 1. Local development (backend + database)

```bash
cd Clothing
npm run setup:env          # copies .env.example + client/.env.example
./setup_database.sh        # MySQL user, schemas, seed, writes .env
npm install
cd client && npm install && cd ..

# Terminal 1 — API + DB
npm start                  # http://localhost:3100

# Terminal 2 — React (proxies /api → 3100)
npm run dev:client         # http://localhost:5180/shop/
```

Or one command: `npm run dev:all`

**Verify**

- http://localhost:3100/api/status  
- http://localhost:5180/shop/  
- http://localhost:3100/database_manager.html  

**Re-run migrations only**

```bash
npm run db:migrate
```

---

## 2. GitHub Pages (static frontend)

Push to `main` runs `.github/workflows/pages.yml`.

| URL | Content |
|-----|---------|
| https://zub165.github.io/Clothing/ | Admin dashboard (`index.html`) |
| https://zub165.github.io/Clothing/shop/ | React storefront |
| https://zub165.github.io/Clothing/database_manager.html | DB manager |

**API on Pages:** GitHub Pages is static only. Add repo secret `VITE_API_URL` = your live API (e.g. `https://yourdomain.com`) so the shop can call `/api/shop/*`. Without it, the UI loads but product data needs a backend.

Enable once: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

---

## 3. Push to GitHub

Repo: https://github.com/zub165/Clothing

```bash
git add .
git commit -m "Add deployment pipeline and enhanced shop UI"
git push origin main
```

**Never commit** `.env` — only `.env.example` and `.env.production.example`.

On every push to `main`:

- **CI** (`.github/workflows/ci.yml`) — builds React + checks `client/dist`
- **Deploy** (`.github/workflows/deploy.yml`) — SSH to VPS, `git pull`, `deploy/release.sh`

---

## 3. GitHub repository secrets

Settings → Secrets and variables → Actions:

| Secret | Example | Required |
|--------|---------|----------|
| `VPS_HOST` | `123.45.67.89` | Yes |
| `VPS_USER` | `newgen` | Yes |
| `SSH_PASSWORD` | VPS SSH password | Yes* |
| `VPS_SSH_KEY` | Private key PEM | Yes* |
| `VPS_PORT` | `22` | No |
| `VPS_APP_DIR` | `~/clothing-business` | No |

\* Use **either** `SSH_PASSWORD` **or** `VPS_SSH_KEY`, not both unless your action supports it.

---

## 4. One-time VPS setup (GoDaddy)

SSH into the server:

```bash
# Option A — automated bootstrap
export DOMAIN=yourdomain.com
export REPO_URL=https://github.com/zub165/Clothing.git
git clone "$REPO_URL" ~/clothing-business
cd ~/clothing-business
bash deploy/vps-bootstrap.sh

# Option B — manual
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx git
sudo npm install -g pm2

git clone https://github.com/zub165/Clothing.git ~/clothing-business
cd ~/clothing-business
cp .env.production.example .env
nano .env   # DB_PASSWORD, JWT_SECRET, CORS_ORIGINS=https://yourdomain.com

# MySQL
sudo mysql -e "CREATE DATABASE clothing_business;
  CREATE USER 'clothing_user'@'localhost' IDENTIFIED BY 'STRONG_PASS';
  GRANT ALL ON clothing_business.* TO 'clothing_user'@'localhost';
  FLUSH PRIVILEGES;"

chmod +x deploy/*.sh
./deploy/release.sh
```

### Nginx + SSL

```bash
sudo cp deploy/nginx-clothify.conf /etc/nginx/sites-available/clothify
sudo sed -i 's/YOUR_DOMAIN/yourdomain.com/g' /etc/nginx/sites-available/clothify
sudo ln -sf /etc/nginx/sites-available/clothify /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Production `.env` (on VPS only)

```env
DB_HOST=localhost
DB_USER=clothing_user
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=clothing_business
PORT=3100
NODE_ENV=production
JWT_SECRET=long-random-string-min-32-chars
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 5. What runs on each deploy

`deploy/release.sh` on the VPS:

1. `npm ci` (API)
2. `cd client && npm ci && npm run build`
3. `deploy/migrate-db.sh` (schemas + seed if empty)
4. `pm2 restart clothify-api`
5. Health check `GET /api/status`

Manual deploy on VPS:

```bash
cd ~/clothing-business
git pull origin main
./deploy/release.sh
```

---

## 6. Production URLs

- Shop: `https://yourdomain.com/shop/`
- API status: `https://yourdomain.com/api/status`
- Admin: `https://yourdomain.com/database_manager.html`

---

## 7. Database backups (VPS)

```bash
cd ~/clothing-business
./backup_database.sh
```

Schedule with cron if needed.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Shop 404 | Run `cd client && npm run build` on VPS |
| API DB error | Check `.env` credentials; `npm run db:migrate` |
| CORS blocked | Add your domain to `CORS_ORIGINS` in VPS `.env` |
| Deploy fails SSH | Verify GitHub secrets; test `ssh user@host` |
| PM2 not running | `pm2 logs clothify-api` |
