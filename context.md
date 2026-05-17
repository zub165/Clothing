# Clothify — Project Context

Reference for [zub165/Clothing](https://github.com/zub165/Clothing): clothing business admin + customer storefront + mobile apps.

## Architecture (target setup)

```
  FRONTEND (GitHub Pages)              BACKEND (your machine → VPS later)
  ───────────────────────              ───────────────────────────────────

  ┌─────────────────────┐              ┌────────────────────────┐
  │ React shop          │   HTTPS      │ Express API :3100      │
  │ zub165.github.io/   │ ──────────►  │ shop-api.js            │
  │   Clothing/shop/    │   /api/shop  │ server.js              │
  └─────────────────────┘              └───────────┬────────────┘
  ┌─────────────────────┐                          ▼
  │ Admin index.html    │              ┌────────────────────────┐
  │ (same Pages site)   │              │ MySQL clothing_business │
  └─────────────────────┘              └────────────────────────┘

  NOW:     backend on local desktop (Mac)
  LATER:   backend on GoDaddy VPS — set GitHub secret VITE_API_URL
```

| Layer | Where | URL |
|-------|--------|-----|
| **React shop** | GitHub Pages | https://zub165.github.io/Clothing/shop/ |
| **Admin UI** | GitHub Pages | https://zub165.github.io/Clothing/ |
| **API + DB (dev)** | Local desktop | http://localhost:3100 |
| **API + DB (prod)** | GoDaddy VPS | https://yourdomain.com (when live) |

## Ports (avoid conflicts)

| Service        | Port  | Notes                          |
|----------------|-------|--------------------------------|
| Express API    | 3100  | `PORT` in `.env`               |
| React dev      | 5180  | Vite proxy → `/api` → 3100     |
| MySQL          | 3306  | Standard                       |

Do **not** reuse 3000, 5174–5177, 8001, or 8099 if other apps run locally.

## Repository layout

| Path | Role |
|------|------|
| `server.js` | Admin API + static files + SPA fallback |
| `shop-api.js` | JWT shop: products, cart, checkout, wishlist |
| `config.js` | DB + dynamic `CORS_ORIGINS` |
| `schema.sql` | Core business tables |
| `schema-shop.sql` | E-commerce extensions |
| `client/` | React 19 + Vite storefront (`/shop/`) |
| `mobile/` | Flutter app (Android + iOS) |
| `database_manager.html` | Legacy admin UI |
| `.github/workflows/deploy.yml` | GoDaddy VPS deploy |

## Shop API (prefix `/api/shop`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Create customer |
| POST | `/login` | No | JWT login |
| GET | `/products` | No | List catalog (from `inventory`) |
| GET | `/products/:id` | No | Detail + reviews |
| GET | `/categories` | No | Distinct categories |
| GET/POST | `/cart` | Yes | View / add cart |
| PATCH/DELETE | `/cart/:id` | Yes | Update / remove line |
| GET/POST/DELETE | `/wishlist/:itemId` | Yes | Wishlist |
| POST | `/checkout` | Yes | Place order, sync `orders` |
| GET | `/orders` | Yes | Order history |
| POST | `/products/:id/reviews` | Yes | Rate product |

Default coupon: `WELCOME10` (10% off).

## Local desktop (backend + React dev)

```bash
cd Clothing
cp .env.example .env
./setup_database.sh
npm install && cd client && npm install && cd ..
```

**Terminal 1 — backend only**

```bash
npm start             # API http://localhost:3100
```

**Terminal 2 — React (talks to local API)**

```bash
npm run dev:client    # http://localhost:5180/shop/ → proxies /api → :3100
```

Or: `npm run dev:all`

Flutter:

```bash
cd mobile && flutter pub get
flutter run --dart-define=API_URL=http://127.0.0.1:3100
# Android emulator:
flutter run --dart-define=API_URL=http://10.0.2.2:3100
```

## Deploy paths

| What | How |
|------|-----|
| **React frontend** | Push `main` → `.github/workflows/pages.yml` → GitHub Pages |
| **Backend (later)** | GoDaddy VPS → `.github/workflows/deploy.yml` → API only (`SKIP_CLIENT_BUILD=true`) |

**GitHub secret (when VPS is ready):** `VITE_API_URL` = `https://yourdomain.com`  
Then re-run **Deploy GitHub Pages** so the shop calls your VPS API.

**Local `.env`:** keep `https://zub165.github.io` in `CORS_ORIGINS` so Pages can call your desktop API while testing.

See `deploy/GODADDY_VPS.md` for VPS bootstrap (API + MySQL only).

## Data model notes

- **Catalog** uses existing `inventory` rows (`selling_price` = shop price).
- **Shop orders** → `shop_orders` + `shop_order_items`; also inserts into legacy `orders` for admin reporting.
- **Customers** are separate from MySQL admin users (JWT in `customers` table).

## Security reminders

- Change default DB password from setup script in production.
- Never commit `.env` or `SSH_PASSWORD`.
- Replace `JWT_SECRET` on VPS.
- Restrict admin routes (`/api/reset`, raw SQL) behind VPN or auth in production.
