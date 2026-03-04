/**
 * VPS Güncelleme Scripti — Yeni Stack (PostgreSQL/PostGIS + Vue 3 + OpenLayers)
 *
 * Aşamalar:
 *   1. Git: yeni branch'i çek
 *   2. Docker kurulumu (yoksa) + PostgreSQL/PostGIS başlat
 *   3. .env dosyası güncelle
 *   4. Backend bağımlılıkları + migrasyon
 *   5. Frontend build
 *   6. Frontend dist → backend/public
 *   7. PM2 yeniden başlat
 *   8. Nginx (değişmez — zaten 80→3000 proxy yapıyor)
 */

const { Client } = require('/tmp/node_modules/ssh2');

const sshConfig = {
    host: '38.3.137.165',
    port: 22,
    username: 'root',
    password: 'Onurakkaya123.*'
};

const APP_DIR = '/var/www/elektrik-direk-haritasi';
const BRANCH  = 'claude/review-project-FsuKI';

const commands = [
    // ── 1. Mevcut durumu kontrol et ──────────────────────────────
    'pm2 list 2>/dev/null || true',

    // ── 2. Git: yeni branch'i çek ────────────────────────────────
    `cd ${APP_DIR} && git fetch origin`,
    `cd ${APP_DIR} && git checkout ${BRANCH}`,
    `cd ${APP_DIR} && git pull origin ${BRANCH}`,

    // ── 3. Docker kurulumu ────────────────────────────────────────
    // Docker yoksa resmi script ile kur
    `which docker || (curl -fsSL https://get.docker.com -o /tmp/get-docker.sh && sh /tmp/get-docker.sh)`,
    `systemctl start docker && systemctl enable docker`,

    // Docker Compose v2 plugin kontrolü
    `docker compose version 2>/dev/null || apt-get install -y docker-compose-plugin`,

    // ── 4. PostgreSQL + PostGIS container başlat ─────────────────
    `cd ${APP_DIR} && docker compose up -d postgres`,

    // PostgreSQL sağlıklı olana kadar bekle (max 30s)
    `echo 'PostgreSQL başlıyor...' && until docker exec elektrik_direk_postgres pg_isready -U elektrik_user -d elektrik_direk 2>/dev/null; do sleep 2; echo '  bekliyor...'; done && echo 'PostgreSQL hazır!'`,

    // ── 5. .env dosyasını güncelle ────────────────────────────────
    // DATABASE_URL yoksa ekle, varsa bırak
    `grep -q DATABASE_URL ${APP_DIR}/.env 2>/dev/null || echo 'DATABASE_URL=postgresql://elektrik_user:elektrik_pass@localhost:5432/elektrik_direk' >> ${APP_DIR}/.env`,
    `cat ${APP_DIR}/.env`,

    // ── 6. Node.js versiyonu kontrol ──────────────────────────────
    // Node 18+ gerekli (Vite için)
    `node --version`,
    `node --version | grep -E "v(18|20|22)" || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)`,

    // ── 7. Backend bağımlılıkları ─────────────────────────────────
    `cd ${APP_DIR}/packages/backend && npm install`,

    // ── 8. Veritabanı migrasyonlarını çalıştır ───────────────────
    `cd ${APP_DIR}/packages/backend && node database/migrate.js`,

    // ── 9. Frontend build ─────────────────────────────────────────
    `cd ${APP_DIR}/packages/frontend && npm install`,
    `cd ${APP_DIR}/packages/frontend && npm run build`,

    // ── 10. Frontend dist → Backend public ───────────────────────
    `rm -rf ${APP_DIR}/packages/backend/public`,
    `cp -r ${APP_DIR}/packages/frontend/dist ${APP_DIR}/packages/backend/public`,
    `ls ${APP_DIR}/packages/backend/public`,

    // ── 11. PM2 yeniden başlat ────────────────────────────────────
    `pm2 delete cbs-app 2>/dev/null || true`,
    `cd ${APP_DIR}/packages/backend && pm2 start server.js --name cbs-app`,
    `pm2 save`,

    // ── 12. Nginx (değişmez — 80 → 3000 proxy zaten aktif) ───────
    `nginx -t && systemctl reload nginx`,

    // ── 13. Son durum ─────────────────────────────────────────────
    `pm2 status`,
    `docker ps`,
    `echo '\\n✅ Güncelleme tamamlandı! http://38.3.137.165'`,
];

// ── SSH yürütücü ──────────────────────────────────────────────────
const execCommand = (conn, cmd) => {
    return new Promise((resolve, reject) => {
        const short = cmd.length > 80 ? cmd.substring(0, 80) + '…' : cmd;
        console.log(`\n>>> ${short}`);

        conn.exec(cmd, { pty: true }, (err, stream) => {
            if (err) return reject(err);

            let out = '';
            stream.on('close', (code) => {
                if (code !== 0 && code !== null) {
                    console.warn(`    ⚠️  Exit code: ${code}`);
                }
                resolve({ code, out });
            }).on('data', (data) => {
                process.stdout.write(data);
                out += data;
            }).stderr.on('data', (data) => {
                process.stderr.write(data);
                out += data;
            });
        });
    });
};

// ── Ana akış ─────────────────────────────────────────────────────
const runUpdate = async () => {
    const conn = new Client();

    conn.on('ready', async () => {
        console.log('─────────────────────────────────────────────');
        console.log(' VPS Güncelleme — Yeni Stack Migration');
        console.log(' Host:', sshConfig.host);
        console.log('─────────────────────────────────────────────');

        try {
            for (const cmd of commands) {
                await execCommand(conn, cmd);
            }
            console.log('\n✅ Güncelleme başarılı!');
            console.log('   Uygulama: http://38.3.137.165');
        } catch (err) {
            console.error('\n❌ Hata:', err.message || err);
        } finally {
            conn.end();
        }
    }).on('error', (err) => {
        console.error('SSH Bağlantı Hatası:', err.message || err);
    }).connect(sshConfig);
};

runUpdate();
