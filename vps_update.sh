#!/bin/bash
# ============================================================
# VPS Güncelleme Scripti — Yeni Stack Migration
# Çalıştır: bash vps_update.sh
# ============================================================
set -e   # Hata durumunda dur

APP_DIR="/var/www/elektrik-direk-haritasi"
BRANCH="claude/review-project-FsuKI"
VPS_IP="38.3.137.165"

echo "══════════════════════════════════════════════════════"
echo " Elektrik Direk Haritası — VPS Güncelleme"
echo " Branch: $BRANCH"
echo "══════════════════════════════════════════════════════"

# ── 1. Git: yeni branch'i çek ────────────────────────────────
echo -e "\n[1/9] Git güncelleniyor..."
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
echo "✅ Git güncellendi"

# ── 2. Docker kurulumu (yoksa) ────────────────────────────────
echo -e "\n[2/9] Docker kontrol ediliyor..."
if ! command -v docker &>/dev/null; then
    echo "  Docker bulunamadı, kuruluyor..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
fi
systemctl start docker
systemctl enable docker

# Docker Compose v2 (plugin olarak)
if ! docker compose version &>/dev/null; then
    echo "  docker compose plugin kuruluyor..."
    apt-get install -y docker-compose-plugin
fi
echo "✅ Docker $(docker --version) hazır"

# ── 3. PostgreSQL + PostGIS başlat ────────────────────────────
echo -e "\n[3/9] PostgreSQL/PostGIS başlatılıyor..."
cd "$APP_DIR"
docker compose up -d postgres

echo "  Sağlık kontrolü bekleniyor (max 60s)..."
TRIES=0
until docker exec elektrik_direk_postgres pg_isready -U elektrik_user -d elektrik_direk 2>/dev/null; do
    TRIES=$((TRIES+1))
    if [ $TRIES -ge 30 ]; then
        echo "❌ PostgreSQL 60s içinde hazır olmadı. docker logs:"
        docker logs elektrik_direk_postgres --tail 20
        exit 1
    fi
    sleep 2
    echo "  ($TRIES) bekliyor..."
done
echo "✅ PostgreSQL hazır"

# ── 4. .env güncelle ─────────────────────────────────────────
echo -e "\n[4/9] .env dosyası güncelleniyor..."
if [ ! -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    echo "  .env.example'dan oluşturuldu"
fi

# DATABASE_URL yoksa ekle
if ! grep -q "DATABASE_URL" "$APP_DIR/.env"; then
    echo "DATABASE_URL=postgresql://elektrik_user:elektrik_pass@localhost:5432/elektrik_direk" >> "$APP_DIR/.env"
    echo "  DATABASE_URL eklendi"
fi

# JWT_SECRET yoksa mevcut değeri koru
grep -q "JWT_SECRET" "$APP_DIR/.env" || echo "JWT_SECRET=elektrik_direk_haritasi_gizli_anahtar_2024" >> "$APP_DIR/.env"

echo "✅ .env hazır:"
grep -v "PASSWORD\|SECRET\|pass" "$APP_DIR/.env" || true

# ── 5. Node.js versiyonu ──────────────────────────────────────
echo -e "\n[5/9] Node.js versiyonu kontrol ediliyor..."
NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo "  Node.js 20.x kuruluyor (mevcut: v$NODE_VER)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "✅ Node.js $(node --version)"

# ── 6. Backend bağımlılıkları + migrasyon ─────────────────────
echo -e "\n[6/9] Backend kurulumu ve migrasyon..."
cd "$APP_DIR/packages/backend"
npm install
echo "  Migrasyonlar çalıştırılıyor..."
node database/migrate.js
echo "✅ Backend hazır, migrasyon tamamlandı"

# ── 7. Frontend build ─────────────────────────────────────────
echo -e "\n[7/9] Frontend derleniyor..."
cd "$APP_DIR/packages/frontend"
npm install
npm run build
echo "✅ Frontend derlendi"

# ── 8. Frontend dist → Backend public ────────────────────────
echo -e "\n[8/9] Frontend dağıtılıyor..."
rm -rf "$APP_DIR/packages/backend/public"
cp -r "$APP_DIR/packages/frontend/dist" "$APP_DIR/packages/backend/public"
echo "✅ dist → packages/backend/public"
ls "$APP_DIR/packages/backend/public"

# ── 9. PM2 yeniden başlat ─────────────────────────────────────
echo -e "\n[9/9] Uygulama yeniden başlatılıyor..."
pm2 delete cbs-app 2>/dev/null || true
cd "$APP_DIR/packages/backend"
pm2 start server.js --name cbs-app
pm2 save
pm2 startup 2>/dev/null || true

# ── Nginx kontrol ─────────────────────────────────────────────
nginx -t && systemctl reload nginx || true

# ── Son durum ─────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo "✅ GÜNCELLEME TAMAMLANDI"
echo "══════════════════════════════════════════════════════"
pm2 status
docker ps
echo ""
echo "  Uygulama: http://$VPS_IP"
echo "  API test: curl http://$VPS_IP/api/tipler/cins"
