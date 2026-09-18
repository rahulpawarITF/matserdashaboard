# Production Deployment Guide

This guide deploys the Master Dashboard without Docker on an Ubuntu server.

Architecture:

```text
Browser
  |
  | HTTPS :443
  v
Nginx:443/80
  |
  | reverse proxy to 127.0.0.1:3001
  v
Express backend
  |
  +-- serves React files from apps/backend/public
  +-- /api/* API routes
  +-- /socket.io/* WebSocket connection
  |
  +-- MongoDB
  +-- Redis
```

The same process serves the frontend and backend, so production API calls use the same domain:

```text
https://masterdashabord.itfuturz.in/api
```

## 1. Server Prerequisites

Recommended server:

- Ubuntu 22.04 or newer
- Node.js 20 or newer
- Nginx
- PM2
- MongoDB, local or remote
- Redis, local or remote
- A domain A record pointing to the server public IP

Check the server IP:

```bash
curl -4 https://ifconfig.me
```

Check DNS from a computer or the server:

```bash
getent hosts masterdashabord.itfuturz.in
```

The domain must resolve to the server public IP before requesting SSL.

## 2. Install System Packages

Run as a user with sudo access:

```bash
sudo apt update
sudo apt install -y nginx git curl build-essential
```

Install Node.js 20 if it is not already installed:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v
npm -v
```

Node.js 20 or newer is recommended. Node.js 22 also works.

## 3. Install or Confirm MongoDB and Redis

The application needs both services before the backend can start.

Check local services:

```bash
systemctl status mongod --no-pager
systemctl status redis-server --no-pager
```

If using remote services, keep their connection URLs ready instead. Do not expose database credentials in Git, screenshots, chat, or public files.

## 4. Deploy the Repository

Use a stable location such as `/var/www` or the hosting account's existing application directory:

```bash
sudo mkdir -p /var/www
sudo chown -R "$USER":"$USER" /var/www
cd /var/www
git clone YOUR_REPOSITORY_URL masterdashabord.itfuturz.in
cd /var/www/masterdashabord.itfuturz.in
```

Verify the repository:

```bash
ls
```

Expected folders include:

```text
apps
nginx
README.md
```

For a private repository, configure an SSH deploy key or another secure Git authentication method. Never put a Git password or token directly into a command that may be saved in shell history.

## 5. Configure Environment Variables

This repository loads the root environment file first when running the compiled backend. Therefore create the production file at:

```text
/var/www/masterdashabord.itfuturz.in/.env
```

Create it from the example:

```bash
cd /var/www/masterdashabord.itfuturz.in
cp .env.example .env
nano .env
```

Required production values:

```env
NODE_ENV=production
PORT=3001
CLIENT_URL=https://masterdashabord.itfuturz.in

MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
REDIS_URL=YOUR_REDIS_CONNECTION_STRING

JWT_ACCESS_SECRET=YOUR_64_CHARACTER_SECRET
JWT_REFRESH_SECRET=YOUR_DIFFERENT_64_CHARACTER_SECRET
MASTER_ENCRYPTION_KEY=YOUR_64_CHARACTER_HEX_KEY

ENABLE_SWAGGER=false
DATA_RETENTION_DAYS=90
DEFAULT_CHECK_INTERVAL_MINUTES=5
```

Generate secure values:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Use different values for all three secrets. `MASTER_ENCRYPTION_KEY` must be exactly 64 hexadecimal characters. Keep a secure backup of it. Losing it may make encrypted credentials unrecoverable.

This project may also contain `apps/backend/.env`. Do not accidentally leave an old production or development MongoDB URL there. Confirm which file is loaded before troubleshooting database connections.

Check values without exposing secrets:

```bash
cd /var/www/masterdashabord.itfuturz.in
for key in NODE_ENV PORT CLIENT_URL MONGODB_URI REDIS_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET MASTER_ENCRYPTION_KEY; do
  value=$(grep "^${key}=" .env | cut -d= -f2-)
  printf "%-25s length=%s\n" "$key" "${#value}"
done
```

Expected:

- `JWT_ACCESS_SECRET`: length 64 or greater
- `JWT_REFRESH_SECRET`: length 64 or greater
- `MASTER_ENCRYPTION_KEY`: length 64
- `MONGODB_URI` and `REDIS_URL`: non-empty

Protect the file:

```bash
chmod 600 /var/www/masterdashabord.itfuturz.in/.env
```

## 6. Install Dependencies

Install frontend dependencies:

```bash
cd /var/www/masterdashabord.itfuturz.in/apps/frontend
npm ci
```

Install backend dependencies:

```bash
cd ../backend
npm ci
```

Do not run `npm audit fix --force` during deployment. It may introduce breaking dependency changes. Review vulnerabilities separately and test upgrades before applying them.

## 7. Build the Frontend

The backend serves the compiled frontend from `apps/backend/public`.

```bash
cd /var/www/masterdashabord.itfuturz.in/apps/frontend
npm run build
rm -rf ../backend/public
cp -R dist ../backend/public
```

Verify:

```bash
ls -la ../backend/public
```

The directory must contain:

```text
index.html
assets/
```

## 8. Build the Backend

```bash
cd /var/www/masterdashabord.itfuturz.in/apps/backend
npm run build
```

Verify the compiled entry point:

```bash
ls -l dist/index.js
```

After the build succeeds, development dependencies can be removed:

```bash
npm prune --omit=dev
```

If you need to rebuild later, run `npm ci` again before `npm run build`.

## 9. Test the Backend Before Nginx

Run the backend temporarily:

```bash
cd /var/www/masterdashabord.itfuturz.in/apps/backend
node dist/index.js
```

Expected log messages include:

```text
MongoDB Connected
Server running in production mode on port 3001
```

From another terminal, test the local port:

```bash
curl -I http://127.0.0.1:3001
```

Stop the temporary process with `Ctrl+C` after testing.

If the process hangs or exits, inspect logs:

```bash
tail -n 50 /var/www/masterdashabord.itfuturz.in/apps/backend/logs/error.log
tail -n 50 /var/www/masterdashabord.itfuturz.in/apps/backend/logs/combined.log
```

Database port test:

```bash
timeout 10 bash -c '</dev/tcp/DATABASE_HOST/DATABASE_PORT' && echo reachable || echo not-reachable
```

For MongoDB Atlas, add the server public IP in **Network Access**. For a private MongoDB server, allow the server's private IP and port in its firewall.

## 10. Run the Backend with PM2

Install PM2 globally:

```bash
sudo npm install -g pm2
```

Start the compiled backend from its directory:

```bash
cd /var/www/masterdashabord.itfuturz.in/apps/backend
pm2 start dist/index.js --name masterdashboard-backend
```

Check the process:

```bash
pm2 status
```

The status must be `online`.

Save the process list:

```bash
pm2 save
```

Enable automatic startup after reboot:

```bash
pm2 startup
```

Run the exact command printed by PM2, then save again:

```bash
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs masterdashboard-backend --lines 100
pm2 restart masterdashboard-backend --update-env
pm2 stop masterdashboard-backend
pm2 delete masterdashboard-backend
```

A process that is `online` but restarts repeatedly is crash-looping. Check:

```bash
pm2 status
pm2 logs masterdashboard-backend --lines 100 --nostream
```

## 11. Configure Nginx

This repository contains the server block at:

```text
nginx/default.conf
```

It proxies all requests to the backend at `127.0.0.1:3001`. The backend handles static files, API routes, SPA fallback, and Socket.IO.

Copy the configuration:

```bash
sudo cp /var/www/masterdashabord.itfuturz.in/nginx/default.conf \
  /etc/nginx/sites-available/masterdashabord.itfuturz.in
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/masterdashabord.itfuturz.in \
  /etc/nginx/sites-enabled/masterdashabord.itfuturz.in
```

If the symlink already exists, do not create a second one.

Disable the default site if it conflicts:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Check status:

```bash
sudo systemctl status nginx --no-pager
```

It should show `active (running)`.

## 12. Test HTTP Before SSL

```bash
curl -I http://masterdashabord.itfuturz.in
```

Expected:

```text
HTTP/1.1 200 OK
```

Test the frontend asset:

```bash
curl -I http://masterdashabord.itfuturz.in/assets/ASSET_FILENAME.js
```

Test the API health route:

```bash
curl http://masterdashabord.itfuturz.in/api/system/health
```

The exact health response depends on the application route, but it should not be a `502 Bad Gateway`.

## 13. Configure HTTPS

Install Certbot:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

Request and install a certificate:

```bash
sudo certbot --nginx -d masterdashabord.itfuturz.in
```

During the prompts:

- Enter a valid email address.
- Accept the terms.
- Choose the HTTP-to-HTTPS redirect option.

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Open:

```text
https://masterdashabord.itfuturz.in
```

Check renewal:

```bash
sudo certbot renew --dry-run
```

Update the production environment after SSL is enabled:

```env
CLIENT_URL=https://masterdashabord.itfuturz.in
```

Then restart:

```bash
pm2 restart masterdashboard-backend --update-env
pm2 save
```

## 14. Firewall

Allow SSH, HTTP, and HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Do not expose port `3001` publicly if Nginx is the public entry point. The backend only needs to listen locally.

## 15. Updating the Application

From the project directory:

```bash
cd /var/www/masterdashabord.itfuturz.in
git pull
```

Install dependencies and rebuild both applications:

```bash
cd apps/frontend
npm ci
npm run build
rm -rf ../backend/public
cp -R dist ../backend/public

cd ../backend
npm ci
npm run build
npm prune --omit=dev
```

Restart the backend and reload Nginx only if its configuration changed:

```bash
pm2 restart masterdashboard-backend --update-env
pm2 save
sudo nginx -t && sudo systemctl reload nginx
```

Verify:

```bash
pm2 status
curl -I https://masterdashabord.itfuturz.in
```

## 16. Database Seeding

Only seed production after confirming the target database and taking a backup. The current seed script is idempotent for its known records: it creates the owner user, creates or updates the projects, and creates the service. It does not drop the database.

The default seeded owner credentials are:

```text
Email: admin@masterdashboard.com
Password: Admin@1234
```

Change the password immediately after the first login.

### First deployment seed

Run the seed before removing development dependencies, because the script uses `ts-node`:

Typical command for this project:

```bash
cd /var/www/masterdashabord.itfuturz.in/apps/backend
npm run seed
```

Expected output includes:

```text
Connected to MongoDB for seeding
Seed completed successfully with all 7 projects
```

If `ts-node: command not found` appears, run:

```bash
cd /var/www/masterdashabord.itfuturz.in/apps/backend
npm ci
npm run seed
```

After a successful seed, production dependencies can be reduced:

```bash
npm prune --omit=dev
```

### Seed after a code update

Use this sequence whenever the seed script or seed data changes:

```bash
cd /var/www/masterdashabord.itfuturz.in
git pull

cd apps/backend
npm ci
npm run build
npm run seed
npm prune --omit=dev

pm2 restart masterdashboard-backend --update-env
pm2 save
```

If the frontend also changed, build and copy it before restarting PM2:

```bash
cd /var/www/masterdashabord.itfuturz.in/apps/frontend
npm ci
npm run build
rm -rf ../backend/public
cp -R dist ../backend/public

cd ../backend
npm ci
npm run build
npm run seed
npm prune --omit=dev
pm2 restart masterdashboard-backend --update-env
pm2 save
```

This project can load `.env` from `apps/backend/.env` before the repository root `.env`, depending on how the script is started. Keep the MongoDB URL consistent in the file used by the backend, and verify the target without printing the password:

Before seeding, verify the database name and server without printing the password:

```bash
grep '^MONGODB_URI=' /var/www/masterdashabord.itfuturz.in/apps/backend/.env \
  | sed -E 's#(mongodb://[^:]+:)[^@]+@#\1***@#'
```

Never run a seed command against production until you know exactly what data it changes.

## 17. Backups

Back up the database before migrations, seed operations, or major releases. Store backups outside the application directory and test restoring them.

For MongoDB, use the appropriate `mongodump` command for the configured connection. Do not place credentials directly in shell history. Prefer a protected temporary configuration or a secrets manager.

Protect application secrets and preserve:

- `.env`
- `MASTER_ENCRYPTION_KEY`
- MongoDB credentials
- Redis credentials
- PM2 process configuration
- Nginx configuration
- SSL renewal configuration

## 18. Troubleshooting

### Nginx returns 502 Bad Gateway

The backend is not listening on port 3001:

```bash
pm2 status
pm2 logs masterdashboard-backend --lines 100 --nostream
curl -I http://127.0.0.1:3001
```

### Backend exits immediately

Run it directly to expose the exit condition:

```bash
cd /var/www/masterdashabord.itfuturz.in/apps/backend
node --trace-exit dist/index.js
```

Then inspect:

```bash
tail -n 50 logs/error.log
```

Common causes:

- Missing `.env` variable
- Wrong environment file being loaded
- MongoDB IP not allowed
- Invalid MongoDB credentials
- Redis unavailable
- Port 3001 already in use

### MongoDB connection timeout

Check the URL source and network access:

```bash
grep '^MONGODB_URI=' /var/www/masterdashabord.itfuturz.in/.env \
  | sed -E 's#(mongodb://[^:]+:)[^@]+@#\1***@#'
timeout 10 bash -c '</dev/tcp/DATABASE_HOST/DATABASE_PORT' && echo reachable || echo not-reachable
```

For MongoDB Atlas, whitelist the server's public IP. For a remote database, check firewall rules and authentication database settings.

### Blank white frontend page

Open browser DevTools and check the Console and Network tabs. Confirm that:

- The JavaScript file returns `200`.
- The CSS file returns `200`.
- The browser is not rejecting an invalid HTTPS certificate.
- The page is not being forced from HTTP to an invalid HTTPS certificate.

Server checks:

```bash
curl -I https://masterdashabord.itfuturz.in
curl -I https://masterdashabord.itfuturz.in/assets/ASSET_FILENAME.js
```

### PM2 says the process list is not synchronized

This is a warning, not a crash:

```bash
pm2 save
```

### Nginx configuration error

Run:

```bash
sudo nginx -t
```

Fix the reported file and line before reloading Nginx.

## 19. Generic Checklist for Other Projects

For another React plus Node.js project, use this order:

1. Point DNS to the server.
2. Install Node.js, Nginx, Git, and build tools.
3. Clone the repository.
4. Create a production environment file.
5. Configure database and cache URLs.
6. Install dependencies with `npm ci`.
7. Build the frontend.
8. Copy the frontend build to the backend's static directory, or configure Nginx to serve it.
9. Build the backend.
10. Test the backend directly on localhost.
11. Start it with PM2 or systemd.
12. Save the process for reboot recovery.
13. Configure Nginx reverse proxy.
14. Test Nginx syntax and reload it.
15. Test HTTP locally and through the domain.
16. Install and test HTTPS with Certbot.
17. Configure firewall rules.
18. Configure backups and monitoring.
19. Document the update and rollback process.

## 20. Security Rules

- Never commit `.env` files.
- Never paste database passwords or private keys into public chat or screenshots.
- Use different secrets for access and refresh tokens.
- Use HTTPS in production.
- Restrict MongoDB network access to required server IPs.
- Keep port 3001 private behind Nginx.
- Disable Swagger in production unless it is intentionally protected.
- Do not use `npm audit fix --force` without testing.
- Back up the database before seed operations and migrations.
- Keep the encryption key in secure offline storage.
- Run services with a dedicated non-root user when possible.
