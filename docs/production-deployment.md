# AI Invoice Automation — Production Deployment Guide

Oracle Cloud (ARM) + Supabase PostgreSQL + Docker Compose + Caddy SSL

---

## 1. Infrastructure Overview

```
┌─────────────────────────────────────────────────┐
│  Oracle Cloud VM (ARM A1, 1+ OCPU, 6+ GB RAM)  │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Caddy   │  │  Redis   │  │ Celery Worker │  │
│  │ :80/:443 │  │  :6379   │  │  + Beat       │  │
│  └────┬─────┘  └──────────┘  └───────────────┘  │
│       │                                          │
│  ┌────┴─────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Frontend │  │ Backend  │  │    Flower      │  │
│  │  :3000   │  │  :8000   │  │    :5555      │  │
│  └──────────┘  └────┬─────┘  └───────────────┘  │
│                     │                            │
└─────────────────────┼────────────────────────────┘
                      │
              ┌───────┴────────┐
              │   Supabase     │
              │  PostgreSQL    │
              │  (us-west-2)   │
              └────────────────┘
```

**External Services:**
- Supabase PostgreSQL — Database (managed)
- Claude API — Invoice OCR/extraction
- Stripe — Subscription billing
- Gmail API — Email invoice collection
- Sentry — Error monitoring (optional)
- Telegram — Alert notifications (optional)

---

## 2. Oracle Cloud Setup

### 2-1. Instance Creation

| Setting | Value |
|---------|-------|
| Image | Canonical Ubuntu 24.04 |
| Shape | VM.Standard.A1.Flex (Always Free) |
| OCPU | 1~4 (available capacity) |
| Memory | 6~24 GB |
| VCN | VCN Wizard → "Create VCN with Internet Connectivity" |
| Subnet | Public subnet |
| Public IP | Automatically assign (toggle ON) |
| SSH key | Generate and download private key |

> ARM capacity가 부족하면 AD-1, AD-2, AD-3을 돌아가며 시도.
> 보통 수 시간~하루 이내 풀림.

### 2-2. PAYG Upgrade (Idle Recovery Prevention)

1. OCI Console → Billing → **Upgrade to Pay As You Go**
2. Credit card registration required
3. Always Free resources remain $0
4. Prevents automatic instance reclamation

### 2-3. Security List (Firewall)

VCN → Security Lists → Default Security List → Add Ingress Rules:

| Source CIDR | Protocol | Dest Port | Description |
|-------------|----------|-----------|-------------|
| 0.0.0.0/0 | TCP | 80 | HTTP |
| 0.0.0.0/0 | TCP | 443 | HTTPS |

> SSH (port 22) is already open by default.
> Do NOT open 5432, 6379, 5555.

---

## 3. Server Initial Setup

SSH into the server:
```bash
# Windows: use the downloaded .key file
ssh -i ~/Downloads/ssh-key-2026-xx-xx.key ubuntu@<PUBLIC_IP>
```

### 3-1. System Update
```bash
sudo apt update && sudo apt upgrade -y
```

### 3-2. Docker Installation
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Re-login to apply group
exit
# SSH again
ssh -i ~/Downloads/ssh-key-2026-xx-xx.key ubuntu@<PUBLIC_IP>
docker --version  # verify
```

### 3-3. Swap (Build Safety)
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3-4. Firewall (Ubuntu iptables)
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### 3-5. SSH Security
```bash
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## 4. Supabase Setup

### 4-1. Project Creation

1. supabase.com → New Project
2. Region: any (project ID: `cvbwhocdyjrvcxuhkwdg`)
3. Set database password (strong)

### 4-2. Connection URLs

| Purpose | Method | URL Pattern |
|---------|--------|-------------|
| App runtime | Transaction pooler (6543) | `postgresql+asyncpg://postgres.<project>:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres?prepared_statement_cache_size=0` |
| Sync health check | Transaction pooler (6543) | `postgresql://postgres.<project>:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres` |
| Alembic migration | Session pooler (5432) | `postgresql+asyncpg://postgres.<project>:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:5432/postgres` |

> Transaction pooler does NOT support PREPARE statements → `?prepared_statement_cache_size=0` required.
> Direct connection is NOT IPv4 compatible → use Session pooler for migrations.

---

## 5. Deployment

### 5-1. Clone Repository
```bash
git clone https://github.com/philkcho/ai-invoice-automation.git
cd ai-invoice-automation
```

### 5-2. Create .env.prod
```bash
cp .env.prod.example .env.prod
nano .env.prod
```

**Required values to fill in:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Transaction pooler URL (asyncpg, port 6543, with `?prepared_statement_cache_size=0`) |
| `DATABASE_URL_SYNC` | Transaction pooler URL (psycopg2, port 6543) |
| `SECRET_KEY` | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Claude API key |
| `DOMAIN` | `ai-invoice.chopaul.com` |
| `CORS_ORIGINS` | `https://ai-invoice.chopaul.com` |
| `FRONTEND_URL` | `https://ai-invoice.chopaul.com` |
| `NEXT_PUBLIC_API_URL` | `https://ai-invoice.chopaul.com` (NO `/api` suffix!) |
| `COOKIE_SECURE` | `true` |
| `COOKIE_DOMAIN` | `ai-invoice.chopaul.com` |
| `FLOWER_PASSWORD` | Strong password |

### 5-3. Run Alembic Migration

Temporarily switch DATABASE_URL to Session pooler (port 5432) for migration:
```bash
# Edit .env.prod — change DATABASE_URL to Session pooler URL (port 5432)
nano .env.prod

# Run migration
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Restore DATABASE_URL to Transaction pooler URL (port 6543)
nano .env.prod
```

### 5-4. Start Services
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 5-5. Verify
```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f backend

# Health check (before DNS)
curl http://localhost:8000/health

# After DNS setup
curl https://ai-invoice.chopaul.com/health
```

---

## 6. DNS Setup (Hostinger)

Add A record in Hostinger DNS management:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | ai-invoice | `<Oracle VM Public IP>` | 3600 |

> After DNS propagation (5~30 min), Caddy will automatically issue Let's Encrypt SSL certificate.

---

## 7. Post-Deployment

### 7-1. Verify Checklist

- [ ] `curl https://ai-invoice.chopaul.com/health` → `{"status": "healthy"}`
- [ ] Browser → Landing page renders
- [ ] Sign up → Login → Dashboard access
- [ ] Invoice file upload → saved to `/app/media/`
- [ ] SSL certificate → Let's Encrypt (check browser padlock)
- [ ] Celery logs → `External DB detected, skipping pg_dump`

### 7-2. Google Cloud Console

Update Gmail OAuth redirect URI:
```
https://ai-invoice.chopaul.com/settings/email/callback
```

### 7-3. Stripe Webhook

Update webhook endpoint URL in Stripe Dashboard:
```
https://ai-invoice.chopaul.com/api/v1/billing/webhook
```

### 7-4. Monitoring

| What | How |
|------|-----|
| DB Backup | Supabase manages automatically |
| Media Backup | Celery `backup_media` task (daily) |
| Health Check | Celery `health_check_all` task (every 5 min) |
| Disk Monitor | Celery `monitor_disk` task (hourly) |
| Error Tracking | Sentry (optional, set `SENTRY_DSN`) |
| Alerts | Telegram (optional, set `TELEGRAM_BOT_TOKEN`) |

---

## 8. Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f celery_worker
docker compose -f docker-compose.prod.yml logs -f caddy

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Rebuild after code update
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Run new migration
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Access backend shell
docker compose -f docker-compose.prod.yml exec backend bash

# Check disk usage
df -h

# Check container resource usage
docker stats
```

---

## 9. File Structure (Production)

```
ai-invoice-automation/
├── docker-compose.prod.yml    # Production compose (no db service)
├── docker/
│   ├── Caddyfile              # Reverse proxy + auto SSL
│   └── redis.conf             # Redis config
├── frontend/
│   └── Dockerfile.prod        # Multi-stage build (standalone)
├── backend/
│   └── Dockerfile             # Python 3.11 + system packages
├── .env.prod                  # Production secrets (NOT in git)
└── .env.prod.example          # Template (in git)
```

---

## 10. Troubleshooting

### Caddy SSL not working
- DNS A record must point to correct IP
- Ports 80 and 443 must be open in Oracle Security List AND iptables
- Check: `docker compose -f docker-compose.prod.yml logs caddy`

### Database connection failed
- Verify DATABASE_URL has correct password
- Transaction pooler requires `?prepared_statement_cache_size=0`
- Check Supabase dashboard → project is not paused

### Out of memory
- Check: `free -h`
- Reduce Celery concurrency: `--concurrency=1`
- Add more swap: `sudo fallocate -l 8G /swapfile2`

### ARM build fails
- Ensure swap is enabled: `swapon --show`
- Some pip packages need gcc/libpq-dev (already in Dockerfile)
- First build takes 20~40 min on ARM — be patient
