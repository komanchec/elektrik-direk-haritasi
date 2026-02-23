const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'elektrik_direk.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err);
    } else {
        console.log('✅ SQLite veritabanına bağlandı');
        initDatabase();
    }
});

async function initDatabase() {
    try {
        await createTables();
        await insertDefaultData();
        console.log('✅ Veritabanı hazır');
    } catch (error) {
        console.error('Veritabanı başlatma hatası:', error);
    }
}

function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {

            // Kullanıcılar
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => { if (err) reject(err); });

            // Direk Cinsleri (ÖNCE OLUŞTURULMALI)
            db.run(`CREATE TABLE IF NOT EXISTS direk_cinsleri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ad TEXT NOT NULL,
                aciklama TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => { if (err) reject(err); });

            // Direk Tipleri (cins_id referansı içeriyor)
            db.run(`CREATE TABLE IF NOT EXISTS direk_tipleri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cins_id INTEGER NOT NULL,
                ad TEXT NOT NULL,
                renk TEXT DEFAULT '#3b82f6',
                aciklama TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cins_id) REFERENCES direk_cinsleri(id) ON DELETE CASCADE
            )`, (err) => { if (err) reject(err); });

            // İletken Tipleri (YENİ)
            db.run(`CREATE TABLE IF NOT EXISTS iletken_tipleri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kod TEXT UNIQUE NOT NULL,
                ad TEXT NOT NULL,
                renk TEXT DEFAULT '#3b82f6',
                aciklama TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => { if (err) reject(err); });

            // Malzeme Cinsleri (kategoriler: TOPRAKLAMA, PARAFUDR vb.)
            db.run(`CREATE TABLE IF NOT EXISTS malzeme_cinsleri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ad TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => { if (err) reject(err); });

            // Malzeme Tipleri (alt tipler: TOPRAKLAMA KAZIĞI, 1X95 Nyy Alm. vb.)
            db.run(`CREATE TABLE IF NOT EXISTS malzeme_tipleri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cins_id INTEGER NOT NULL,
                ad TEXT NOT NULL,
                birim TEXT DEFAULT 'adet',
                birim_fiyat REAL DEFAULT 0,
                aciklama TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cins_id) REFERENCES malzeme_cinsleri(id) ON DELETE CASCADE
            )`, (err) => { if (err) reject(err); });

            // Eski malzemeler tablosu (geriye uyumluluk)
            db.run(`CREATE TABLE IF NOT EXISTS malzemeler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kod TEXT UNIQUE NOT NULL,
                ad TEXT NOT NULL,
                birim TEXT DEFAULT 'adet',
                aciklama TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => { if (err) reject(err); });

            // Projeler
            db.run(`CREATE TABLE IF NOT EXISTS projeler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ad TEXT NOT NULL,
                aciklama TEXT,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`, (err) => { if (err) reject(err); });

            // Direkler
            db.run(`CREATE TABLE IF NOT EXISTS direkler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proje_id INTEGER NOT NULL,
                tip_id INTEGER NOT NULL,
                cins_id INTEGER NOT NULL,
                numara TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                durum TEXT DEFAULT 'MEVCUT',
                aciklama TEXT,
                foto_yolu TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (proje_id) REFERENCES projeler(id) ON DELETE CASCADE,
                FOREIGN KEY (tip_id) REFERENCES direk_tipleri(id),
                FOREIGN KEY (cins_id) REFERENCES direk_cinsleri(id),
                FOREIGN KEY (created_by) REFERENCES users(id),
                UNIQUE(proje_id, numara)
            )`, (err) => { if (err) reject(err); });

            // Direk Malzemeleri (malzeme_tipleri referansı)
            db.run(`CREATE TABLE IF NOT EXISTS direk_malzemeleri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                direk_id INTEGER NOT NULL,
                malzeme_tip_id INTEGER NOT NULL,
                miktar REAL DEFAULT 1,
                durum TEXT DEFAULT 'M+M',
                birim_fiyat REAL DEFAULT 0,
                aciklama TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (direk_id) REFERENCES direkler(id) ON DELETE CASCADE,
                FOREIGN KEY (malzeme_tip_id) REFERENCES malzeme_tipleri(id)
            )`, (err) => { if (err) reject(err); });

            // Hatlar (YENİ)
            db.run(`CREATE TABLE IF NOT EXISTS hatlar (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proje_id INTEGER NOT NULL,
                direk1_id INTEGER NOT NULL,
                direk2_id INTEGER NOT NULL,
                iletken_tipi TEXT,
                iletken_cinsi TEXT,
                kesit_mm2 REAL,
                hat_tipi TEXT DEFAULT 'enerji',
                mesafe_metre REAL,
                durum TEXT DEFAULT 'MEVCUT',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (proje_id) REFERENCES projeler(id) ON DELETE CASCADE,
                FOREIGN KEY (direk1_id) REFERENCES direkler(id),
                FOREIGN KEY (direk2_id) REFERENCES direkler(id)
            )`, (err) => { if (err) reject(err); });

            // GPS Kayıtları (YENİ)
            db.run(`CREATE TABLE IF NOT EXISTS gps_kayitlari (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proje_id INTEGER NOT NULL,
                ad TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                yukseklik REAL,
                accuracy REAL,
                olcum_tarihi DATETIME,
                cihaz_id TEXT,
                FOREIGN KEY (proje_id) REFERENCES projeler(id) ON DELETE CASCADE
            )`, (err) => { if (err) reject(err); });

            // Yorumlar
            db.run(`CREATE TABLE IF NOT EXISTS yorumlar (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proje_id INTEGER NOT NULL,
                entity_type TEXT NOT NULL CHECK (entity_type IN ('direk', 'hat', 'proje')),
                entity_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                yorum TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (proje_id) REFERENCES projeler(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`, (err) => { if (err) reject(err); });

            // İşlem Geçmişi (Audit Log)
            db.run(`CREATE TABLE IF NOT EXISTS islem_gecmisi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proje_id INTEGER,
                user_id INTEGER NOT NULL,
                islem TEXT NOT NULL,
                entity_type TEXT,
                entity_id INTEGER,
                detay TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`, (err) => {
                if (err) reject(err);
                else resolve();
            });

        });
    });
}

async function insertDefaultData() {
    const adminHash = await bcrypt.hash('admin123', 10);

    return new Promise((resolve, reject) => {
        db.serialize(() => {

            // Admin kullanıcısı (Ignore if exists via UNIQUE constraint)
            console.log('Admin kullanıcısı ekleniyor...');
            db.run(`INSERT OR IGNORE INTO users (id, username, email, password_hash, role) 
                VALUES (1, 'admin', 'admin@system.com', ?, 'admin')`, [adminHash]);

            // Direk cinsleri ve bağımlı tipler
            console.log('Cinsler kontrol ediliyor...');
            db.get(`SELECT COUNT(*) as count FROM direk_cinsleri`, (err, row) => {
                if (err) return console.error('Direk cinsleri kontrol hatası:', err);
                if (row && row.count === 0) {
                    db.run(`INSERT INTO direk_cinsleri (ad, aciklama) VALUES 
                        ('AG_DEMİR', 'Alçak Gerilim Demir Direk'),
                        ('MÜŞ_DEMİR', 'Müşterek Demir Direk'),
                        ('BETON', 'Beton Direk'),
                        ('ENH', 'Enerji Nakil Hattı Direği')`, function (err) {
                        if (err) return console.error('Direk cinsleri ekleme hatası:', err);

                        db.run(`INSERT INTO direk_tipleri (cins_id, ad) VALUES 
                            (1, '8I'), (1, '10I'), (1, '12I'), (1, 'K1'), (1, 'K2'), (1, 'K3'), (1, 'K4'), (1, 'K5'), (1, 'G-10I'), (1, 'G-12I'), (1, 'G-K1'), (1, 'G-K2'), (1, 'G-K3'), (1, 'G-K4'), (1, 'G-K5'),
                            (2, '10I"'), (2, '12I"'), (2, 'K1"'), (2, 'K2"'), (2, 'K3"'), (2, 'K4"'), (2, 'K5"'), (2, 'G-10I"'), (2, 'G-12I"'), (2, 'G-K1"'), (2, 'G-K2"'), (2, 'G-K3"'), (2, 'G-K4"'), (2, 'G-K5"')`, function (err) {
                            if (err) console.error('Direk tipleri ekleme hatası:', err);
                            console.log('Tipler eklendi.');
                        });
                    });
                } else {
                    console.log('Cinsler zaten mevcut.');
                }
            });

            // İletken tipleri
            console.log('İletken tipleri kontrol ediliyor...');
            db.get(`SELECT COUNT(*) as count FROM iletken_tipleri`, (err, row) => {
                if (err) return console.error('İletken tipleri kontrol hatası:', err);
                if (row && row.count === 0) {
                    db.run(`INSERT INTO iletken_tipleri (kod, ad, renk) VALUES 
                        ('AAC', 'AAC (Alüminyum)', '#ef4444'),
                        ('AAAC', 'AAAC (Alüminyum Alaşımlı)', '#3b82f6'),
                        ('ACSR', 'ACSR (Çelik Çekirdekli)', '#10b981'),
                        ('ACAR', 'ACAR (Alüminyum Alaşımlı)', '#f59e0b'),
                        ('BUNDLE', 'Bölünmüş İletken', '#8b5cf6')`, (err) => {
                        if (err) console.error(err);
                        console.log('İletken tipleri eklendi.');
                    });
                } else {
                    console.log('İletken tipleri zaten var.');
                }
            });

            // Malzeme Cinsleri varsayılan veriler
            console.log('Malzeme cinsleri kontrol ediliyor...');
            db.get(`SELECT COUNT(*) as count FROM malzeme_cinsleri`, (err, row) => {
                if (err) return console.error('Malzeme cinsleri kontrol hatası:', err);
                if (row && row.count === 0) {
                    db.run(`INSERT INTO malzeme_cinsleri (ad) VALUES 
                        ('TOPRAKLAMA'),
                        ('PARAFUDR'),
                        ('GALVANİZLİ_GAZ_BORUSU'),
                        ('TEL_KAFESLİ_ÇİT'),
                        ('TEHLİKE_LEVHASI')`, function (err) {
                        if (err) return console.error('Malzeme cinsleri ekleme hatası:', err);

                        // Malzeme Tipleri varsayılan veriler
                        db.run(`INSERT INTO malzeme_tipleri (cins_id, ad, birim) VALUES 
                            (1, 'TOPRAKLAMA KAZIĞI', 'ad/ad'),
                            (1, '1X95 Nyy Alm.', 'mt/mt'),
                            (1, 'TOPRAKLAMA ŞERİDİ', 'mt/mt'),
                            (1, 'GALVANİZLİ ÖRGÜLÜ ÇELİK TEL VE GÖMÜLMESİ', 'mt/mt'),
                            (1, 'TOPRAKLAMA KAZIĞI + 5m. ŞERİT', 'ad/ad'),
                            (2, '3/4"', 'mt/mt'),
                            (3, 'GALVANİZLİ GAZ BORUSU 3/4"', 'mt/mt')`, (err) => {
                            if (err) return console.error('Malzeme tipleri ekleme hatası:', err);
                            console.log('Malzeme tipleri eklendi.');
                        });
                    });
                } else {
                    console.log('Malzeme cinsleri zaten var.');
                }
            });

            // Assume resolve after the serialize stack is defined
            setTimeout(() => {
                console.log('✅ Veritabanı varsayılan verileri eklendi.');
                resolve();
            }, 500);
        });
    });
}

module.exports = db;