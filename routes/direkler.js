const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { direkEkleValidation, direkGuncelleValidation, hatEkleValidation } = require('../middleware/validation');
const db = require('../database/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload klasörü oluştur
const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'direkler');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'direk-' + unique + path.extname(file.originalname));
    }
});

const uploadImage = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Sadece resim dosyaları'));
    }
});

const uploadGpx = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.gpx' || ext === '.kml') cb(null, true);
        else cb(new Error('Sadece GPX veya KML dosyaları'));
    }
});

// ============================================
// DİREK CRUD İŞLEMLERİ
// ============================================

// Projedeki direkleri getir
router.get('/proje/:projeId', authenticateToken, (req, res) => {
    const { projeId } = req.params;

    db.all(`
        SELECT d.*, dt.ad as tip_adi, dt.renk, dc.ad as cins_adi 
        FROM direkler d
        JOIN direk_tipleri dt ON d.tip_id = dt.id
        JOIN direk_cinsleri dc ON d.cins_id = dc.id
        WHERE d.proje_id = ?
    `, [projeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Direk ara (numara ile)
router.get('/ara/:projeId', authenticateToken, (req, res) => {
    const { q } = req.query;

    db.all(`
        SELECT d.*, dt.ad as tip_adi, dt.renk, dc.ad as cins_adi 
        FROM direkler d
        JOIN direk_tipleri dt ON d.tip_id = dt.id
        JOIN direk_cinsleri dc ON d.cins_id = dc.id
        WHERE d.proje_id = ? AND d.numara LIKE ?
    `, [req.params.projeId, `%${q}%`], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Direk ekle (validated)
router.post('/', authenticateToken, direkEkleValidation, (req, res) => {
    const { proje_id, tip_id, cins_id, numara, lat, lng, aciklama, durum } = req.body;

    db.run(
        'INSERT INTO direkler (proje_id, tip_id, cins_id, numara, lat, lng, aciklama, durum, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [proje_id, tip_id, cins_id, numara, lat, lng, aciklama || '', durum || 'MEVCUT', req.user.id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Bu numarada direk zaten var' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Direk eklendi' });
        }
    );
});

// Direk güncelle (DÜZELTİLMİŞ - UNIQUE hatası çözüldü)
router.put('/:id', authenticateToken, (req, res) => {
    const { tip_id, cins_id, numara, lat, lng, durum } = req.body;

    if (!numara || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Eksik alanlar var' });
    }

    // Önce mevcut direğin bilgilerini al
    db.get('SELECT proje_id, numara as eski_numara FROM direkler WHERE id = ?',
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Direk bulunamadı' });

            // Eğer numara değişmemişse, UNIQUE kontrolü yapma
            if (row.eski_numara === numara) {
                // Sadece diğer alanları güncelle
                db.run(
                    'UPDATE direkler SET tip_id = ?, cins_id = ?, lat = ?, lng = ?, durum = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [tip_id, cins_id, lat, lng, durum || 'MEVCUT', req.params.id],
                    function (err) {
                        if (err) {
                            console.error('Direk güncelleme hatası:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ message: 'Direk güncellendi' });
                    }
                );
            } else {
                // Numara değişmiş, yeni numara kontrolü yap
                db.get('SELECT id FROM direkler WHERE proje_id = ? AND numara = ? AND id != ?',
                    [row.proje_id, numara, req.params.id],
                    (err, existing) => {
                        if (err) return res.status(500).json({ error: err.message });
                        if (existing) {
                            return res.status(400).json({ error: 'Bu numarada başka bir direk zaten var' });
                        }

                        // Güvenle güncelle
                        db.run(
                            'UPDATE direkler SET tip_id = ?, cins_id = ?, numara = ?, lat = ?, lng = ?, durum = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [tip_id, cins_id, numara, lat, lng, durum || 'MEVCUT', req.params.id],
                            function (err) {
                                if (err) {
                                    console.error('Direk güncelleme hatası:', err);
                                    return res.status(500).json({ error: err.message });
                                }
                                res.json({ message: 'Direk güncellendi' });
                            }
                        );
                    }
                );
            }
        }
    );
});

// Açıklama güncelle
router.put('/:id/aciklama', authenticateToken, (req, res) => {
    const { aciklama } = req.body;

    db.run('UPDATE direkler SET aciklama = ? WHERE id = ?',
        [aciklama || '', req.params.id],
        function (err) {
            if (err) {
                console.error('Açıklama güncelleme hatası:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Açıklama güncellendi' });
        });
});

// Fotoğraf yükle
router.post('/:id/foto', authenticateToken, uploadImage.single('foto'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    const fotoYolu = '/uploads/direkler/' + req.file.filename;

    db.get('SELECT foto_yolu FROM direkler WHERE id = ?', [req.params.id], (err, row) => {
        if (row && row.foto_yolu) {
            const eskiYol = path.join(__dirname, '..', 'public', row.foto_yolu);
            if (fs.existsSync(eskiYol)) {
                fs.unlinkSync(eskiYol);
            }
        }

        db.run('UPDATE direkler SET foto_yolu = ? WHERE id = ?',
            [fotoYolu, req.params.id],
            function (err) {
                if (err) {
                    fs.unlinkSync(req.file.path);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ foto_yolu: fotoYolu, message: 'Fotoğraf yüklendi' });
            });
    });
});

// Direk sil
router.delete('/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM direkler WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Direk silindi' });
    });
});

// ============================================
// MALZEME YÖNETİMİ
// ============================================

// Direk malzemelerini getir
router.get('/:id/malzemeler', authenticateToken, (req, res) => {
    db.all(`
        SELECT dm.*, mt.ad as malzeme_tipi_adi, mt.birim, mc.ad as malzeme_cinsi_adi
        FROM direk_malzemeleri dm
        JOIN malzeme_tipleri mt ON dm.malzeme_tip_id = mt.id
        JOIN malzeme_cinsleri mc ON mt.cins_id = mc.id
        WHERE dm.direk_id = ?
        ORDER BY mc.ad, mt.ad
    `, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Direğe malzeme ekle
router.post('/:id/malzemeler', authenticateToken, (req, res) => {
    const { malzeme_tip_id, miktar, durum } = req.body;

    if (!malzeme_tip_id) {
        return res.status(400).json({ error: 'Malzeme tipi seçilmeli' });
    }

    db.run(
        'INSERT INTO direk_malzemeleri (direk_id, malzeme_tip_id, miktar, durum) VALUES (?, ?, ?, ?)',
        [req.params.id, malzeme_tip_id, miktar || 1, durum || 'M+M'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Malzeme eklendi' });
        }
    );
});

// Malzeme sil
router.delete('/:direkId/malzemeler/:id', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM direk_malzemeleri WHERE id = ?',
        [req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Malzeme silindi' });
        }
    );
});

// ============================================
// TOPLU İŞLEMLER
// ============================================

// Toplu import (Excel/CSV)
router.post('/import/:projeId', authenticateToken, (req, res) => {
    const { direkler } = req.body;
    const imported = [];
    const errors = [];

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const stmt = db.prepare(`
            INSERT INTO direkler (proje_id, tip_id, cins_id, numara, lat, lng, aciklama, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        direkler.forEach((d, index) => {
            stmt.run(
                req.params.projeId,
                d.tip_id || 1,
                d.cins_id || 1,
                d.numara,
                d.lat,
                d.lng,
                d.aciklama || '',
                req.user.id,
                function (err) {
                    if (err) errors.push({ satir: index + 1, hata: err.message });
                    else imported.push({ id: this.lastID, numara: d.numara });
                }
            );
        });

        stmt.finalize();
        db.run('COMMIT', (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            res.json({ imported: imported.length, errors, total: direkler.length });
        });
    });
});

// Proje toplam malzeme listesi
router.get('/proje/:projeId/malzemeler', authenticateToken, (req, res) => {
    db.all(`
        SELECT 
            mc.ad as cins_adi,
            mt.id,
            mt.ad,
            mt.birim,
            SUM(dm.miktar) as toplam_miktar,
            mt.birim_fiyat
        FROM direk_malzemeleri dm
        JOIN direkler d ON dm.direk_id = d.id
        JOIN malzeme_tipleri mt ON dm.malzeme_tip_id = mt.id
        JOIN malzeme_cinsleri mc ON mt.cins_id = mc.id
        WHERE d.proje_id = ?
        GROUP BY mt.id, mc.ad, mt.ad, mt.birim, mt.birim_fiyat
        ORDER BY mc.ad, mt.ad
    `, [req.params.projeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        let toplamMaliyet = 0;
        rows.forEach(r => {
            if (r.birim_fiyat) {
                r.maliyet = r.toplam_miktar * r.birim_fiyat;
                toplamMaliyet += r.maliyet;
            }
        });

        res.json({ malzemeler: rows, toplam_maliyet: toplamMaliyet });
    });
});

// ============================================
// HAT YÖNETİMİ
// ============================================

// Hat ekle
router.post('/hat', authenticateToken, (req, res) => {
    const { proje_id, direk1_id, direk2_id, iletken_tipi, iletken_cinsi, kesit_mm2, mesafe_metre } = req.body;

    db.run(`INSERT INTO hatlar (proje_id, direk1_id, direk2_id, iletken_tipi, iletken_cinsi, kesit_mm2, mesafe_metre) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [proje_id, direk1_id, direk2_id, iletken_tipi, iletken_cinsi, kesit_mm2, mesafe_metre],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Hat eklendi' });
        });
});

// Projedeki tüm hatları getir
router.get('/proje/:projeId/hatlar', authenticateToken, (req, res) => {
    db.all(`
        SELECT h.*, 
            d1.numara as direk1_numara, d1.lat as direk1_lat, d1.lng as direk1_lng,
            d2.numara as direk2_numara, d2.lat as direk2_lat, d2.lng as direk2_lng
        FROM hatlar h
        JOIN direkler d1 ON h.direk1_id = d1.id
        JOIN direkler d2 ON h.direk2_id = d2.id
        WHERE h.proje_id = ?
    `, [req.params.projeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Hat güncelle
router.put('/hat/:id', authenticateToken, (req, res) => {
    const { iletken_tipi, iletken_cinsi, kesit_mm2 } = req.body;

    db.run(
        'UPDATE hatlar SET iletken_tipi = ?, iletken_cinsi = ?, kesit_mm2 = ? WHERE id = ?',
        [iletken_tipi, iletken_cinsi, kesit_mm2, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Hat bulunamadı' });
            res.json({ message: 'Hat güncellendi' });
        }
    );
});

// Hat sil
router.delete('/hat/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM hatlar WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Hat silindi' });
    });
});

// ============================================
// GPS IMPORT
// ============================================

// GPX/KML dosyası yükle
router.post('/gpx-import/:projeId', authenticateToken, uploadGpx.single('gpx'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });

    const xml2js = require('xml2js');

    fs.readFile(req.file.path, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: err.message });

        xml2js.parseString(data, (err, result) => {
            if (err) return res.status(500).json({ error: 'GPX parse hatası' });

            const points = [];

            // --- GPX PARSING ---
            if (result.gpx) {
                // Waypoints
                if (result.gpx.wpt) {
                    result.gpx.wpt.forEach(wpt => {
                        points.push({
                            lat: parseFloat(wpt.$.lat),
                            lng: parseFloat(wpt.$.lon),
                            ad: wpt.name ? wpt.name[0] : 'Nokta',
                            yukseklik: wpt.ele ? parseFloat(wpt.ele[0]) : null
                        });
                    });
                }

                // Track points
                if (result.gpx.trk) {
                    result.gpx.trk.forEach(trk => {
                        if (trk.trkseg) {
                            trk.trkseg.forEach(seg => {
                                if (seg.trkpt) {
                                    seg.trkpt.forEach(pt => {
                                        points.push({
                                            lat: parseFloat(pt.$.lat),
                                            lng: parseFloat(pt.$.lon),
                                            ad: 'Track',
                                            yukseklik: pt.ele ? parseFloat(pt.ele[0]) : null
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
            }
            // --- KML PARSING ---
            else if (result.kml && result.kml.Document) {
                const doc = result.kml.Document[0];
                let placemarks = [];

                // Placemarks can be direct children of Document or inside Folders
                if (doc.Placemark) placemarks = placemarks.concat(doc.Placemark);
                if (doc.Folder) {
                    doc.Folder.forEach(f => {
                        if (f.Placemark) placemarks = placemarks.concat(f.Placemark);
                    });
                }

                placemarks.forEach(pm => {
                    if (pm.Point && pm.Point[0].coordinates) {
                        const coords = pm.Point[0].coordinates[0].trim().split(',');
                        if (coords.length >= 2) {
                            points.push({
                                lng: parseFloat(coords[0]),
                                lat: parseFloat(coords[1]),
                                ad: pm.name ? pm.name[0] : 'Nokta',
                                yukseklik: coords[2] ? parseFloat(coords[2]) : null
                            });
                        }
                    }
                });
            }

            if (points.length === 0) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'Dosyada geçerli nokta bulunamadı' });
            }

            // Veritabanına kaydet (direkler tablosuna)
            let islemHata = null;

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Numara (ad) boş veya tekrar eden olanlar için sayaç
                const stmt = db.prepare(`INSERT INTO direkler 
                    (proje_id, tip_id, cins_id, numara, lat, lng, durum, created_by) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

                points.forEach((p, i) => {
                    let numara = p.ad && !['Nokta', 'Track'].includes(p.ad)
                        ? p.ad
                        : `KML-D-${Date.now()}-${i}`;

                    stmt.run(
                        req.params.projeId,
                        1, // tip_id: 1 (AG_DEMIR - 8I varsayılan)
                        1, // cins_id: 1 (AG_DEMIR varsayılan)
                        numara,
                        p.lat,
                        p.lng,
                        'YENİ', // durum: YENİ
                        req.user.id,
                        (err) => {
                            if (err && !err.message.includes('UNIQUE')) {
                                // UNIQUE hatasını yoksay veya farklı handle et
                                islemHata = err;
                            }
                        }
                    );
                });

                stmt.finalize();

                db.run('COMMIT', (err) => {
                    if (err || islemHata) {
                        db.run('ROLLBACK');
                        fs.unlinkSync(req.file.path);
                        return res.status(500).json({ error: islemHata ? islemHata.message : err.message });
                    }

                    fs.unlinkSync(req.file.path);
                    res.json({ imported: points.length, points });
                });
            });
        });
    });
});

// GPS kayıtlarını getir
router.get('/proje/:projeId/gps', authenticateToken, (req, res) => {
    db.all('SELECT * FROM gps_kayitlari WHERE proje_id = ? ORDER BY olcum_tarihi',
        [req.params.projeId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
});

module.exports = router;