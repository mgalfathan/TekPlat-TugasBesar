# Deploy THE GAFFER → `the-gaffer.stei.cloud`

Approach: **Cloudflare Tunnel → VM** (Next.js + SQLite di mesin yang sama).

No inbound firewall changes needed on the VM — `cloudflared` opens an outbound connection to Cloudflare, and Cloudflare proxies all traffic through that tunnel.

```
Internet → Cloudflare edge (the-gaffer.stei.cloud)
        → Cloudflare Tunnel
        → VM:127.0.0.1:3000 (Next.js)
        → /var/the-gaffer/data/the-gaffer.db (SQLite)
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
sudo mkdir -p /opt/the-gaffer /var/the-gaffer/data
sudo chown -R $USER:$USER /opt/the-gaffer /var/the-gaffer
```

## 2. Clone repo + build

```bash
cd /opt/the-gaffer
git clone https://github.com/<your-username>/the-gaffer.git app
cd app

npm install
```

Buat `.env` di `/opt/the-gaffer/app/.env`:
```env
NODE_ENV=production
DATABASE_URL="file:/var/the-gaffer/data/the-gaffer.db"
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
# di /opt/the-gaffer/app
pm2 start "npm start" --name the-gaffer --time
pm2 save
pm2 startup systemd        # follow the printed command to enable auto-start on reboot
```

Verify locally on the VM:
```bash
curl -I http://localhost:3000
# expect: HTTP/1.1 200 OK
```

Kalau gak 200, cek log: `pm2 logs the-gaffer`.

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
cloudflared tunnel create the-gaffer
# Output: "Created tunnel the-gaffer with id <UUID>"
# Credentials file: ~/.cloudflared/<UUID>.json
```

Catat UUID-nya (atau lihat `cloudflared tunnel list`).

## 6. Config + route DNS

Bikin file `~/.cloudflared/config.yml`:
```yaml
tunnel: <UUID>
credentials-file: /home/<user>/.cloudflared/<UUID>.json

ingress:
  - hostname: the-gaffer.stei.cloud
    service: http://localhost:3000
  - service: http_status:404
```

Ganti `<UUID>` dan `<user>` sesuai punyamu.

Route subdomain (otomatis bikin CNAME di Cloudflare DNS):
```bash
cloudflared tunnel route dns the-gaffer the-gaffer.stei.cloud
```

Verify di dashboard: `dash.cloudflare.com → stei.cloud → DNS → Records` — harusnya muncul `CNAME the-gaffer → <UUID>.cfargotunnel.com` (proxied).

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

Buka https://the-gaffer.stei.cloud — harus muncul homepage THE GAFFER.

Test login admin:
- Email: `admin@the-gaffer.local`
- Password: `admin12345`
- **GANTI PASSWORD SEGERA** — caranya di section 10 di bawah.

Lalu klik **/admin/sync → Sync Top 5** untuk muat data PL/La Liga/Serie A/Bundesliga/Ligue 1 (~2 menit, paced).

---

## 9. Cara update app nantinya

Kapanpun mau push perubahan:

```bash
ssh user@vm
cd /opt/the-gaffer/app
git pull
npm install                  # in case dependencies changed
npx prisma migrate deploy    # if schema changed
npm run build
pm2 restart the-gaffer
```

Atau bikin script `deploy/update.sh`:
```bash
#!/usr/bin/env bash
set -e
cd /opt/the-gaffer/app
git pull
npm install
npx prisma migrate deploy || true
npm run build
pm2 restart the-gaffer --update-env
echo "Deploy complete: $(date)"
```

## 10. Ganti password admin (penting!)

```bash
node -e "console.log(require('bcryptjs').hashSync('PASSWORD_BARU_KUAT', 10))"
# Copy the printed hash

sqlite3 /var/the-gaffer/data/the-gaffer.db
> UPDATE User SET password = '<paste-hash>' WHERE email = 'admin@the-gaffer.local';
> .quit
```

## 11. Auto-sync daily (opsional)

Bikin cronjob di VM yang hit endpoint `/api/admin/sync/bulk` setiap hari. Perlu admin token.

Login dulu untuk dapat cookie, simpan di file:
```bash
curl -c /opt/the-gaffer/admin-cookies.txt -X POST https://the-gaffer.stei.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@the-gaffer.local","password":"YOUR_NEW_PASSWORD"}'
chmod 600 /opt/the-gaffer/admin-cookies.txt
```

Cron entry (`crontab -e`):
```cron
0 4 * * * curl -b /opt/the-gaffer/admin-cookies.txt -X POST https://the-gaffer.stei.cloud/api/admin/sync/bulk -H "Content-Type: application/json" -d '{"preset":"top5","season":"2024"}' >/dev/null 2>&1
```

Setiap jam 4 pagi UTC: sync top 5 leagues. Sekitar 20 request → masih jauh di bawah limit harian 100.

---

## Troubleshooting

| Gejala | Cek |
| --- | --- |
| `502 Bad gateway` di the-gaffer.stei.cloud | `pm2 status the-gaffer` — kalau down: `pm2 logs the-gaffer`. |
| `Unable to connect` / `DNS_PROBE` | `cloudflared tunnel list` — pastikan tunnel running. `systemctl status cloudflared`. |
| Halaman muat tapi data kosong | Login `/admin/login` → `/admin/sync` → Sync Top 5. |
| 429 di tab admin saat sync | Tunggu 1 menit. Rate limiter sudah paced; ini terjadi kalau quota harian (100/hari) habis. |
| `JWT_SECRET or JWT_SECRET_BASE64 must be set in production` di pm2 logs | Edit `.env`, isi salah satu secret, lalu `pm2 restart the-gaffer --update-env`. |
| HTTPS error / certificate | Cloudflare Universal SSL auto-active. Tunggu beberapa menit setelah CNAME dibuat. |
| Cookie session tidak ke-set | Pastikan request via HTTPS — cookie `secure:true` di prod. |

---

## Cara development lokal (tidak berubah)

```bash
npm run dev
# http://localhost:3000
```

Production di VM dan dev lokal pakai database berbeda (lokal pakai `prisma/dev.db`, VM pakai `/var/the-gaffer/data/the-gaffer.db`).
