# Clothify — Project Context

Reference for [zub165/Clothing](https://github.com/zub165/Clothing): clothing business admin + customer storefront + mobile apps.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  React Shop     │     │  Flutter iOS/   │     │  Admin HTML      │
│  (client/)      │     │  Android        │     │  database_mgr    │
│  :5180 dev      │     │  (mobile/)      │     │  index.html      │
└────────┬────────┘     └────────┬────────┘     └────────┬─────────┘
         │                       │                         │
         └───────────────────────┼─────────────────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │  Express API (server.js)│
                    │  shop-api.js            │
                    │  PORT 3100 (default)    │
                    └────────────┬───────────┘
                                 ▼
                    ┌────────────────────────┐
                    │  MySQL clothing_business│
                    │  inventory, orders, …   │
                    │  + shop tables          │
                    └────────────────────────┘
```

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

## Local setup

```bash
cd Clothing
cp .env.example .env
./setup_database.sh   # MySQL + schema-shop + seed
npm install
cd client && npm install && cd ..
npm run build:client
npm start             # http://localhost:3100
```

Dev (two terminals):

```bash
npm run dev           # API :3100
npm run dev:client    # React :5180 → proxy /api
```

Flutter:

```bash
cd mobile && flutter pub get
flutter run --dart-define=API_URL=http://127.0.0.1:3100
# Android emulator:
flutter run --dart-define=API_URL=http://10.0.2.2:3100
```

## Production (GoDaddy VPS)

1. VPS: Node 18+, MySQL, Nginx, PM2.
2. Clone repo to `~/clothing-business`.
3. Set `.env`: `NODE_ENV=production`, strong `JWT_SECRET`, `CORS_ORIGINS=https://yourdomain.com`.
4. `npm install && npm run build && pm2 start server.js --name clothify-api`.
5. Nginx: proxy `/api` and `/shop` to `127.0.0.1:3100`.
6. GitHub Actions: set secrets `SSH_PASSWORD`, `VPS_HOST`, `VPS_USER`.

See `deploy/GODADDY_VPS.md` for full steps.

## Data model notes

- **Catalog** uses existing `inventory` rows (`selling_price` = shop price).
- **Shop orders** → `shop_orders` + `shop_order_items`; also inserts into legacy `orders` for admin reporting.
- **Customers** are separate from MySQL admin users (JWT in `customers` table).

## Security reminders

- Change default DB password from setup script in production.
- Never commit `.env` or `SSH_PASSWORD`.
- Replace `JWT_SECRET` on VPS.
- Restrict admin routes (`/api/reset`, raw SQL) behind VPN or auth in production.
