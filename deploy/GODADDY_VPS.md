# GoDaddy VPS — Production Deployment

## 1. Server prerequisites

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx
sudo npm install -g pm2
```

## 2. MySQL

```bash
sudo mysql_secure_installation
mysql -u root -p -e "CREATE DATABASE clothing_business;
  CREATE USER 'clothing_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
  GRANT ALL ON clothing_business.* TO 'clothing_user'@'localhost';
  FLUSH PRIVILEGES;"
```

Upload and run:

```bash
mysql -u clothing_user -p clothing_business < schema.sql
mysql -u clothing_user -p clothing_business < schema-shop.sql
mysql -u clothing_user -p clothing_business < seed-sample.sql
```

## 3. Application

```bash
cd ~
git clone https://github.com/zub165/Clothing.git clothing-business
cd clothing-business
cp .env.example .env
# Edit .env: production values
npm install
cd client && npm install && npm run build && cd ..
pm2 start server.js --name clothify-api
pm2 save
pm2 startup
```

Example `.env` on VPS:

```env
DB_HOST=localhost
DB_USER=clothing_user
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=clothing_business
PORT=3100
NODE_ENV=production
JWT_SECRET=long-random-string
CORS_ORIGINS=https://yourdomain.com
```

## 4. Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable SSL with Certbot: `sudo certbot --nginx -d yourdomain.com`

## 5. GitHub Actions

Repository secrets:

- `SSH_PASSWORD` — VPS SSH password (or use SSH key action)
- `VPS_HOST` — server IP
- `VPS_USER` — e.g. `newgen`

Push to `main` triggers `.github/workflows/deploy.yml`.

## 6. Verify

- `https://yourdomain.com/api/status`
- `https://yourdomain.com/shop/`
- `https://yourdomain.com/database_manager.html`
