#!/bin/bash
# ============================================================
# VPS Guncelleme Scripti -- Yeni Stack Migration
# Calistir: bash vps_update.sh
# ============================================================
set -e

APP_DIR="/var/www/elektrik-direk-haritasi"
BRANCH="claude/review-project-FsuKI"
VPS_IP="38.3.137.165"

echo "======================================================"
echo " Elektrik Direk Haritasi -- VPS Guncelleme"
echo " Branch: $BRANCH"
echo "======================================================"

# ── 0. Temel araclar (git, curl) ─────────────────────────────
echo ""
echo "[0/9] Temel araclar kontrol ediliyor..."
apt-get install -y git curl 2>/dev/null
echo "OK: git $(git --version)"

# ── 1. Git: yeni branch'i cek ────────────────────────────────
echo ""
echo "[1/9] Git guncelleniyor..."
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
echo "OK: Git guncellendi"

# ── 2. Docker kurulumu (yoksa) ────────────────────────────────
echo ""
echo "[2/9] Docker kontrol ediliyor..."
if ! command -v docker &>/dev/null; then
    echo "  Docker bulunamadi, kuruluyor..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
fi
systemctl start docker
systemctl enable docker

if ! docker compose version &>/dev/null; then
    echo "  docker compose plugin kuruluyor..."
    apt-get install -y docker-compose-plugin
fi
echo "OK: Docker $(docker --version)"

# ── 3. PostgreSQL + PostGIS baslat ───────────────────────────
echo ""
echo "[3/9] PostgreSQL/PostGIS baslatiliyor..."
cd "$APP_DIR"
docker compose up -d postgres

echo "  Saglik kontrolu bekleniyor (max 60s)..."
TRIES=0
until docker exec elektrik_direk_postgres pg_isready -U elektrik_user -d elektrik_direk 2>/dev/null; do
    TRIES=$((TRIES+1))
    if [ $TRIES -ge 30 ]; then
        echo "HATA: PostgreSQL 60s icinde hazir olmadi. Loglar:"
        docker logs elektrik_direk_postgres --tail 20
        exit 1
    fi
    sleep 2
    echo "  ($TRIES) bekleniyor..."
done
echo "OK: PostgreSQL hazir"

# ── 4. .env guncelle ─────────────────────────────────────────
echo ""
echo "[4/9] .env dosyasi guncelleniyor..."
if [ ! -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    echo "  .env.example'dan olusturuldu"
fi

grep -q "DATABASE_URL" "$APP_DIR/.env" || \
    echo "DATABASE_URL=postgresql://elektrik_user:elektrik_pass@localhost:5432/elektrik_direk" >> "$APP_DIR/.env"

grep -q "JWT_SECRET" "$APP_DIR/.env" || \
    echo "JWT_SECRET=elektrik_direk_haritasi_gizli_anahtar_2024" >> "$APP_DIR/.env"

echo "OK: .env hazir"

# ── 5. Node.js versiyonu ──────────────────────────────────────
echo ""
echo "[5/9] Node.js versiyonu kontrol ediliyor..."
NODE_VER=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
if [ "$NODE_VER" -lt 18 ]; then
    echo "  Node.js 20.x kuruluyor (mevcut: v$NODE_VER)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "OK: Node.js $(node --version)"

# ── 6. Backend bagimliliklar + migrasyon ─────────────────────
echo ""
echo "[6/9] Backend kurulumu ve migrasyon..."
cd "$APP_DIR/packages/backend"
npm install
echo "  Migrasyonlar calistiriliyor..."
node database/migrate.js
echo "OK: Backend hazir, migrasyon tamamlandi"

# ── 7. Frontend build ─────────────────────────────────────────
echo ""
echo "[7/9] Frontend derleniyor..."
cd "$APP_DIR/packages/frontend"
npm install
npm run build
echo "OK: Frontend derlendi"

# ── 8. Frontend dist --> Backend public ──────────────────────
echo ""
echo "[8/9] Frontend dagitiliyor..."
rm -rf "$APP_DIR/packages/backend/public"
cp -r "$APP_DIR/packages/frontend/dist" "$APP_DIR/packages/backend/public"
echo "OK: dist -> packages/backend/public"
ls "$APP_DIR/packages/backend/public"

# ── 9. PM2 yeniden baslat ─────────────────────────────────────
echo ""
echo "[9/9] Uygulama yeniden baslatiliyor..."
pm2 delete cbs-app 2>/dev/null || true
cd "$APP_DIR/packages/backend"
pm2 start server.js --name cbs-app
pm2 save
pm2 startup 2>/dev/null || true

nginx -t && systemctl reload nginx || true

# ── Son durum ─────────────────────────────────────────────────
echo ""
echo "======================================================"
echo " GUNCELLEME TAMAMLANDI"
echo "======================================================"
pm2 status
docker ps
echo ""
echo "  Uygulama : http://$VPS_IP"
echo "  API test : curl http://$VPS_IP/api/tipler/cins"
