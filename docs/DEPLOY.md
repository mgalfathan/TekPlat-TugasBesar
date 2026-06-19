# Deploy: Cloudflare Pages + Postgres on a VM

> 📌 **Looking for the simpler path?** See [**DEPLOY_CLOUDFLARE_TUNNEL.md**](./DEPLOY_CLOUDFLARE_TUNNEL.md) — Cloudflare Tunnel + Next.js + SQLite on a single VM. Far less fiddly than Workers + Prisma adapters. Recommended for small/medium deployments.

---

This guide walks you through deploying THE GAFFER to **Cloudflare Pages** with the **Postgres database hosted on your own VM** (DigitalOcean, Hetzner, Linode, etc.).

Cost estimate: $5–10/month for a small VM + free Cloudflare Pages tier.

---

## 1. Provision the VM

Any provider works. Recommended: Hetzner CX22 (~€4/mo), DigitalOcean Basic Droplet ($6/mo), or Linode Nanode ($5/mo). Ubuntu 22.04 LTS.

SSH in, then:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y postgresql postgresql-contrib ufw
sudo systemctl enable --now postgresql
```

### Create the database

```bash
sudo -u postgres psql <<EOF
CREATE USER the_gaffer WITH PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';
CREATE DATABASE the_gaffer OWNER the_gaffer;
GRANT ALL PRIVILEGES ON DATABASE the_gaffer TO the_gaffer;
EOF
```

### Allow remote connections

Edit `/etc/postgresql/14/main/postgresql.conf` (path may vary by version):
```
listen_addresses = '*'
```

Edit `/etc/postgresql/14/main/pg_hba.conf` — add at the bottom:
```
host    the_gaffer    the_gaffer    0.0.0.0/0    scram-sha-256
```

Restart and open the firewall:
```bash
sudo systemctl restart postgresql
sudo ufw allow OpenSSH
sudo ufw allow 5432/tcp
sudo ufw enable
```

> **Security note**: Exposing 5432 to the internet is fine for low-traffic apps as long as the password is strong and you're on `scram-sha-256`. For better security, restrict the firewall to Cloudflare egress IPs, or use a Cloudflare Tunnel.

### Confirm from your local machine

```bash
psql "postgresql://the_gaffer:YOUR_PASSWORD@YOUR_VM_IP:5432/the_gaffer"
```

---

## 2. Migrate the schema from SQLite → Postgres

THE GAFFER ships with SQLite migrations. They need to be regenerated for Postgres.

**On your local machine**, in the project root:

```bash
# 1. Edit prisma/schema.prisma — change provider:
#    datasource db {
#      provider = "postgresql"
#      url      = env("DATABASE_URL")
#    }

# 2. Delete the SQLite migration history (it's SQLite-specific)
rm -rf prisma/migrations
rm -f prisma/dev.db

# 3. Point DATABASE_URL at your VM (temporarily, just for migration)
export DATABASE_URL="postgresql://the_gaffer:PWD@VM_IP:5432/the_gaffer"

# 4. Generate the first Postgres migration
npx prisma migrate dev --name init

# 5. Seed users + metric templates
npm run db:seed
```

After this, `prisma/migrations/` will contain a fresh Postgres-compatible migration.

---

## 3. Prisma on Cloudflare Pages — pick a runtime adapter

Cloudflare Pages runs your routes on Workers (V8 isolates), where Prisma's default Rust engine won't load. You need **one** of these:

### Option A — Prisma driver adapter for Postgres (recommended)

This uses `pg` underneath. Works on Cloudflare's Workers runtime with `nodejs_compat`.

```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

Edit `prisma/schema.prisma` to enable the preview feature:
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

Then regenerate: `npx prisma generate`.

Edit `lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function makeClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === 'development' ? ['error'] : undefined });
}

export const prisma = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Option B — Prisma Accelerate (managed proxy)

If Option A gives you trouble with Workers compatibility, use Prisma's hosted Accelerate proxy:
1. Sign up at https://console.prisma.io
2. Add your VM Postgres URL
3. Use the issued `prisma://` URL as `DATABASE_URL` in Cloudflare
4. `npm install @prisma/extension-accelerate`
5. Wrap client: `new PrismaClient().$extends(withAccelerate())`

Free tier covers up to 1M queries/month.

---

## 4. Cloudflare Pages setup

### 4a. Install the adapter

```bash
npm install -D @cloudflare/next-on-pages
```

Edit `package.json`:
```json
{
  "scripts": {
    "pages:build": "npx @cloudflare/next-on-pages",
    "pages:deploy": "npm run pages:build && wrangler pages deploy .vercel/output/static"
  }
}
```

Add `wrangler.toml` in the repo root:
```toml
name = "the-gaffer"
compatibility_date = "2024-09-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

### 4b. Push to GitHub

Push your repo. Then on Cloudflare dashboard:

1. **Workers & Pages → Create → Pages → Connect to Git**
2. Pick your repo
3. **Build settings**:
   - Framework preset: `Next.js`
   - Build command: `npx @cloudflare/next-on-pages`
   - Build output: `.vercel/output/static`
4. **Environment variables** (Production):
   - `DATABASE_URL` — your VM Postgres URL
   - `API_FOOTBALL_KEY` — your API-Football key
   - `JWT_SECRET` — generate with `openssl rand -base64 48`
   - `NODE_ENV` — `production`
   - `DEFAULT_SEASON` — `2024`
   - `FOOTBALL_API_PROVIDER` — `api-football`
5. **Settings → Functions → Compatibility flags**: add `nodejs_compat` for Production
6. Deploy

---

## 5. Post-deploy: initial data load

Once the site is up:

1. Visit `https://yourdomain.pages.dev/admin/login`
2. Log in as `admin@the-gaffer.local` / `admin12345` — **immediately change this password** via DB:
   ```sql
   -- generate hash locally: node -e "console.log(require('bcryptjs').hashSync('NEW_PWD', 10))"
   UPDATE "User" SET password = '$2a$10$...' WHERE email = 'admin@the-gaffer.local';
   ```
3. Go to **/admin/sync** → click **Sync Top 5** → wait ~30s → top European leagues are loaded
4. Public pages (`/standings`, `/fixtures`, `/teams`, `/metrics`, etc.) are now reachable to any visitor

---

## 6. Keep data fresh — Cloudflare Cron Trigger (optional)

Add a scheduled handler that hits your bulk-sync endpoint daily.

`functions/_middleware.ts` or a dedicated cron Worker:
```ts
export default {
  async scheduled(event, env, ctx) {
    await fetch(`${env.SITE_URL}/api/admin/sync/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cookie': `session=${env.SYNC_TOKEN}` },
      body: JSON.stringify({ preset: 'top5', season: env.DEFAULT_SEASON }),
    });
  },
};
```

Set the cron in `wrangler.toml`:
```toml
[triggers]
crons = ["0 4 * * *"]   # Every day at 04:00 UTC
```

This avoids the rate limit by only running once/day (25 reqs).

---

## 7. Troubleshooting

- **`Module not found: Can't resolve 'pg-native'`** — add `pg-native` to `webpack.IgnorePlugin` in `next.config.js`, or set `pg.native` to `null`.
- **Prisma "engine not found"** — confirm `previewFeatures = ["driverAdapters"]` and that `lib/prisma.ts` instantiates with the adapter.
- **`nodejs_compat` flag missing** — Cloudflare → Pages → Settings → Functions → Compatibility flags → add `nodejs_compat` for both Preview and Production.
- **VM Postgres connection refused** — check `listen_addresses`, `pg_hba.conf`, and `ufw status`. Test from a remote machine with `psql`.
- **API-Football 100/day exceeded** — switch to paid tier or reduce cron frequency.

---

## Alternatives if Cloudflare gets painful

Prisma + Workers is still maturing. If you hit a wall, these "just work" with THE GAFFER as-is:
- **Railway.app** — push repo, set env vars, done. Free hobby tier.
- **Render.com** — same flow. Free tier (sleeps after 15min idle).
- **Fly.io** — Postgres + app on the same edge. Free tier for small apps.

All three keep Prisma's default Node engine, so no driver-adapter work needed.
