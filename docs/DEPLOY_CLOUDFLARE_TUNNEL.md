# Deploy Sportlytics → `sportlytics.stei.cloud`

Approach: **Cloudflare Tunnel → VM** (Next.js + SQLite di mesin yang sama).

No inbound firewall changes needed on the VM — `cloudflared` opens an outbound connection to Cloudflare, and Cloudflare proxies all traffic through that tunnel.

```
Internet → Cloudflare edge (sportlytics.stei.cloud)
        → Cloudflare Tunnel
        → VM:127.0.0.1:3000 (Next.js)
        → /var/sportlytics/data/sportlytics.db (SQLite)
```

---

## 1. Persiapan di VM

SSH ke VM lalu install Node 20 + git + sqlite3:

```bash
# Node 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential sqlite3

# PM2 untuk keep Next.js running
sudo npm install -g pm2

node -v   # should print v20.x
```

Bikin folder data + user (opsional, untuk isolasi):
```bash
sudo mkdir -p /opt/sportlytics /var/sportlytics/data
sudo chown -R $USER:$USER /opt/sportlytics /var/sportlytics
```

## 2. Clone repo + build

```bash
cd /opt/sportlytics
git clone https://github.com/<your-username>/sportlytics.git app
cd app

npm install
```

Buat `.env` di `/opt/sportlytics/app/.env`:
```env
NODE_ENV=production
DATABASE_URL="file:/var/sportlytics/data/sportlytics.db"
API_FOOTBALL_KEY="<your_api_football_key>"
FOOTBALL_API_PROVIDER="api-football"
DEFAULT_SEASON="2024"
LIVE_POLL_INTERVAL_SECONDS="30"

# REQUIRED. Generate ONCE with: openssl rand -base64 48
JWT_SECRET="<paste-generated-secret-here>"
```

> ⚠ **Penting**: `JWT_SECRET` harus diisi — `lib/auth.ts` akan crash kalau kosong di production. Generate dengan `openssl rand -base64 48`.

Setup DB + seed:
```bash
npx prisma db push          # create schema on the new SQLite file
npm run db:seed             # creates admin + user accounts + metric templates
npm run build               # builds .next for production
```

## 3. Jalankan Next.js dengan PM2

```bash
# di /opt/sportlytics/app
pm2 start "npm start" --name sportlytics --time
pm2 save
pm2 startup systemd        # follow the printed command to enable auto-start on reboot
```

Verify locally on the VM:
```bash
curl -I http://localhost:3000
# expect: HTTP/1.1 200 OK
```

Kalau gak 200, cek log: `pm2 logs sportlytics`.

## 4. Install cloudflared

```bash
# Cloudflare's apt repo
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update
sudo apt install -y cloudflared

cloudflared --version
```

## 5. Login + create tunnel

```bash
cloudflared tunnel login
# Opens a URL — buka di browser dari mesin manapun, login ke Cloudflare,
# pilih zone "stei.cloud", authorize. Cert akan di-save ke ~/.cloudflared/cert.pem
```

Bikin tunnel:
```bash
cloudflared tunnel create sportlytics
# Output: "Created tunnel sportlytics with id <UUID>"
# Credentials file: ~/.cloudflared/<UUID>.json
```

Catat UUID-nya (atau lihat `cloudflared tunnel list`).

## 6. Config + route DNS

Bikin file `~/.cloudflared/config.yml`:
```yaml
tunnel: <UUID>
credentials-file: /home/<user>/.cloudflared/<UUID>.json

ingress:
  - hostname: sportlytics.stei.cloud
    service: http://localhost:3000
  - service: http_status:404
```

Ganti `<UUID>` dan `<user>` sesuai punyamu.

Route subdomain (otomatis bikin CNAME di Cloudflare DNS):
```bash
cloudflared tunnel route dns sportlytics sportlytics.stei.cloud
```

Verify di dashboard: `dash.cloudflare.com → stei.cloud → DNS → Records` — harusnya muncul `CNAME sportlytics → <UUID>.cfargotunnel.com` (proxied).

## 7. Jalankan tunnel sebagai systemd service

```bash
sudo cloudflared service install
# This reads ~/.cloudflared/config.yml + cert.pem and installs cloudflared.service

sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

Cek log:
```bash
sudo journalctl -u cloudflared -f
# Expect: "Registered tunnel connection ... edge=..."
```

## 8. Verify

Buka https://sportlytics.stei.cloud — harus muncul homepage Sportlytics.

Test login admin:
- Email: `admin@sportlytics.local`
- Password: `admin12345`
- **GANTI PASSWORD SEGERA** — caranya di section 10 di bawah.

Lalu klik **/admin/sync → Sync Top 5** untuk muat data PL/La Liga/Serie A/Bundesliga/Ligue 1 (~2 menit, paced).

---

## 9. Cara update app nantinya

Kapanpun mau push perubahan:

```bash
ssh user@vm
cd /opt/sportlytics/app
git pull
npm install                  # in case dependencies changed
npx prisma migrate deploy    # if schema changed
npm run build
pm2 restart sportlytics
```

Atau bikin script `deploy/update.sh`:
```bash
#!/usr/bin/env bash
set -e
cd /opt/sportlytics/app
git pull
npm install
npx prisma migrate deploy || true
npm run build
pm2 restart sportlytics --update-env
echo "Deploy complete: $(date)"
```

## 10. Ganti password admin (penting!)

```bash
node -e "console.log(require('bcryptjs').hashSync('PASSWORD_BARU_KUAT', 10))"
# Copy the printed hash

sqlite3 /var/sportlytics/data/sportlytics.db
> UPDATE User SET password = '<paste-hash>' WHERE email = 'admin@sportlytics.local';
> .quit
```

## 11. Auto-sync daily (opsional)

Bikin cronjob di VM yang hit endpoint `/api/admin/sync/bulk` setiap hari. Perlu admin token.

Login dulu untuk dapat cookie, simpan di file:
```bash
curl -c /opt/sportlytics/admin-cookies.txt -X POST https://sportlytics.stei.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sportlytics.local","password":"YOUR_NEW_PASSWORD"}'
chmod 600 /opt/sportlytics/admin-cookies.txt
```

Cron entry (`crontab -e`):
```cron
0 4 * * * curl -b /opt/sportlytics/admin-cookies.txt -X POST https://sportlytics.stei.cloud/api/admin/sync/bulk -H "Content-Type: application/json" -d '{"preset":"top5","season":"2024"}' >/dev/null 2>&1
```

Setiap jam 4 pagi UTC: sync top 5 leagues. Sekitar 20 request → masih jauh di bawah limit harian 100.

---

## Troubleshooting

| Gejala | Cek |
| --- | --- |
| `502 Bad gateway` di sportlytics.stei.cloud | `pm2 status sportlytics` — kalau down: `pm2 logs sportlytics`. |
| `Unable to connect` / `DNS_PROBE` | `cloudflared tunnel list` — pastikan tunnel running. `systemctl status cloudflared`. |
| Halaman muat tapi data kosong | Login `/admin/login` → `/admin/sync` → Sync Top 5. |
| 429 di tab admin saat sync | Tunggu 1 menit. Rate limiter sudah paced; ini terjadi kalau quota harian (100/hari) habis. |
| `JWT_SECRET must be set in production` di pm2 logs | Edit `.env`, isi JWT_SECRET, lalu `pm2 restart sportlytics --update-env`. |
| HTTPS error / certificate | Cloudflare Universal SSL auto-active. Tunggu beberapa menit setelah CNAME dibuat. |
| Cookie session tidak ke-set | Pastikan request via HTTPS — cookie `secure:true` di prod. |

---

## Cara development lokal (tidak berubah)

```bash
npm run dev
# http://localhost:3000
```

Production di VM dan dev lokal pakai database berbeda (lokal pakai `prisma/dev.db`, VM pakai `/var/sportlytics/data/sportlytics.db`).
