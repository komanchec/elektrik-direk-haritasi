const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { direkEkleValidation } = require('../middleware/validation');
const pool = require('../database/pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload klasörü
const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'direkler');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.gpx' || ext === '.kml') cb(null, true);
        else cb(new Error('Sadece GPX veya KML dosyaları'));
    }
});

// ── Direk CRUD ────────────────────────────────────────────────

// Projedeki direkleri getir
router.get('/proje/:projeId', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT d.*, dt.ad as tip_adi, dt.renk, dc.ad as cins_adi
            FROM direkler d
            JOIN direk_tipleri dt ON d.tip_id = dt.id
            JOIN direk_cinsleri dc ON d.cins_id = dc.id
            WHERE d.proje_id = $1
            ORDER BY d.numara
        `, [req.params.projeId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Direk ara (numara ile)
router.get('/ara/:projeId', authenticateToken, async (req, res) => {
    const { q } = req.query;
    try {
        const { rows } = await pool.query(`
            SELECT d.*, dt.ad as tip_adi, dt.renk, dc.ad as cins_adi
            FROM direkler d
            JOIN direk_tipleri dt ON d.tip_id = dt.id
            JOIN direk_cinsleri dc ON d.cins_id = dc.id
            WHERE d.proje_id = $1 AND d.numara ILIKE $2
        `, [req.params.projeId, `%${q}%`]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Yakındaki direkleri getir (PostGIS spatial sorgu)
router.get('/yakin/:projeId', authenticateToken, async (req, res) => {
    const { lat, lng, mesafe = 500 } = req.query;
    try {
        const { rows } = await pool.query(`
            SELECT d.*, dt.ad as tip_adi, dt.renk, dc.ad as cins_adi,
                   ST_Distance(d.geom::geography, ST_MakePoint($2, $1)::geography) as uzaklik_metre
            FROM direkler d
            JOIN direk_tipleri dt ON d.tip_id = dt.id
            JOIN direk_cinsleri dc ON d.cins_id = dc.id
            WHERE d.proje_id = $3
              AND ST_DWithin(d.geom::geography, ST_MakePoint($2, $1)::geography, $4)
            ORDER BY uzaklik_metre
        `, [lat, lng, req.params.projeId, mesafe]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Direk ekle
router.post('/', authenticateToken, direkEkleValidation, async (req, res) => {
    const { proje_id, tip_id, cins_id, numara, lat, lng, aciklama, durum } = req.body;

    try {
        const { rows } = await pool.query(
            `INSERT INTO direkler (proje_id, tip_id, cins_id, numara, lat, lng, aciklama, durum, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [proje_id, tip_id, cins_id, numara, lat, lng, aciklama || '', durum || 'MEVCUT', req.user.id]
        );
        res.json({ id: rows[0].id, message: 'Direk eklendi' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Bu numarada direk zaten var' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Direk güncelle
router.put('/:id', authenticateToken, async (req, res) => {
    const { tip_id, cins_id, numara, lat, lng, durum } = req.body;

    if (!numara || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Eksik alanlar var' });
    }

    try {
        const { rows: current } = await pool.query(
            'SELECT proje_id, numara as eski_numara FROM direkler WHERE id = $1',
            [req.params.id]
        );
        if (current.length === 0) return res.status(404).json({ error: 'Direk bulunamadı' });

        const { proje_id, eski_numara } = current[0];

        if (eski_numara !== numara) {
            const { rows: existing } = await pool.query(
                'SELECT id FROM direkler WHERE proje_id = $1 AND numara = $2 AND id != $3',
                [proje_id, numara, req.params.id]
            );
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Bu numarada başka bir direk zaten var' });
            }
        }

        await pool.query(
            `UPDATE direkler
             SET tip_id = $1, cins_id = $2, numara = $3, lat = $4, lng = $5, durum = $6
             WHERE id = $7`,
            [tip_id, cins_id, numara, lat, lng, durum || 'MEVCUT', req.params.id]
        );
        res.json({ message: 'Direk güncellendi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Açıklama güncelle
router.put('/:id/aciklama', authenticateToken, async (req, res) => {
    const { aciklama } = req.body;
    try {
        await pool.query(
            'UPDATE direkler SET aciklama = $1 WHERE id = $2',
            [aciklama || '', req.params.id]
        );
        res.json({ message: 'Açıklama güncellendi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fotoğraf yükle
router.post('/:id/foto', authenticateToken, uploadImage.single('foto'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });

    const fotoYolu = '/uploads/direkler/' + req.file.filename;

    try {
        const { rows } = await pool.query('SELECT foto_yolu FROM direkler WHERE id = $1', [req.params.id]);
        if (rows[0]?.foto_yolu) {
            const eskiYol = path.join(__dirname, '..', 'public', rows[0].foto_yolu);
            if (fs.existsSync(eskiYol)) fs.unlinkSync(eskiYol);
        }

        await pool.query('UPDATE direkler SET foto_yolu = $1 WHERE id = $2', [fotoYolu, req.params.id]);
        res.json({ foto_yolu: fotoYolu, message: 'Fotoğraf yüklendi' });
    } catch (err) {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

// Direk sil
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM direkler WHERE id = $1', [req.params.id]);
        res.json({ message: 'Direk silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Malzeme Yönetimi ──────────────────────────────────────────

// Direk malzemelerini getir
router.get('/:id/malzemeler', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT dm.*, mt.ad as malzeme_tipi_adi, mt.birim, mc.ad as malzeme_cinsi_adi
            FROM direk_malzemeleri dm
            JOIN malzeme_tipleri mt ON dm.malzeme_tip_id = mt.id
            JOIN malzeme_cinsleri mc ON mt.cins_id = mc.id
            WHERE dm.direk_id = $1
            ORDER BY mc.ad, mt.ad
        `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Direğe malzeme ekle
router.post('/:id/malzemeler', authenticateToken, async (req, res) => {
    const { malzeme_tip_id, miktar, durum } = req.body;
    if (!malzeme_tip_id) return res.status(400).json({ error: 'Malzeme tipi seçilmeli' });

    try {
        const { rows } = await pool.query(
            'INSERT INTO direk_malzemeleri (direk_id, malzeme_tip_id, miktar, durum) VALUES ($1, $2, $3, $4) RETURNING id',
            [req.params.id, malzeme_tip_id, miktar || 1, durum || 'M+M']
        );
        res.json({ id: rows[0].id, message: 'Malzeme eklendi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Malzeme sil
router.delete('/:direkId/malzemeler/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM direk_malzemeleri WHERE id = $1', [req.params.id]);
        res.json({ message: 'Malzeme silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Toplu İşlemler ────────────────────────────────────────────

// Toplu import (JSON body)
router.post('/import/:projeId', authenticateToken, async (req, res) => {
    const { direkler } = req.body;
    if (!Array.isArray(direkler) || direkler.length === 0) {
        return res.status(400).json({ error: 'Direk listesi boş' });
    }

    const client = await pool.connect();
    const imported = [];
    const errors = [];

    try {
        await client.query('BEGIN');

        for (let i = 0; i < direkler.length; i++) {
            const d = direkler[i];
            try {
                const { rows } = await client.query(
                    `INSERT INTO direkler (proje_id, tip_id, cins_id, numara, lat, lng, aciklama, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                    [req.params.projeId, d.tip_id || 1, d.cins_id || 1,
                     d.numara, d.lat, d.lng, d.aciklama || '', req.user.id]
                );
                imported.push({ id: rows[0].id, numara: d.numara });
            } catch (rowErr) {
                errors.push({ satir: i + 1, hata: rowErr.message });
            }
        }

        await client.query('COMMIT');
        res.json({ imported: imported.length, errors, total: direkler.length });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Proje toplam malzeme listesi
router.get('/proje/:projeId/malzemeler', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`
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
            WHERE d.proje_id = $1
            GROUP BY mt.id, mc.ad, mt.ad, mt.birim, mt.birim_fiyat
            ORDER BY mc.ad, mt.ad
        `, [req.params.projeId]);

        let toplamMaliyet = 0;
        rows.forEach(r => {
            if (r.birim_fiyat) {
                r.maliyet = parseFloat(r.toplam_miktar) * parseFloat(r.birim_fiyat);
                toplamMaliyet += r.maliyet;
            }
        });

        res.json({ malzemeler: rows, toplam_maliyet: toplamMaliyet });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Hat Yönetimi ──────────────────────────────────────────────

// Hat ekle
router.post('/hat', authenticateToken, async (req, res) => {
    const { proje_id, direk1_id, direk2_id, iletken_tipi, iletken_cinsi, kesit_mm2, mesafe_metre } = req.body;

    try {
        const { rows } = await pool.query(
            `INSERT INTO hatlar (proje_id, direk1_id, direk2_id, iletken_tipi, iletken_cinsi, kesit_mm2, mesafe_metre)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [proje_id, direk1_id, direk2_id, iletken_tipi, iletken_cinsi, kesit_mm2, mesafe_metre]
        );
        res.json({ id: rows[0].id, message: 'Hat eklendi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Projedeki tüm hatları getir
router.get('/proje/:projeId/hatlar', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT h.*,
                d1.numara as direk1_numara, d1.lat as direk1_lat, d1.lng as direk1_lng,
                d2.numara as direk2_numara, d2.lat as direk2_lat, d2.lng as direk2_lng
            FROM hatlar h
            JOIN direkler d1 ON h.direk1_id = d1.id
            JOIN direkler d2 ON h.direk2_id = d2.id
            WHERE h.proje_id = $1
        `, [req.params.projeId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Hat güncelle
router.put('/hat/:id', authenticateToken, async (req, res) => {
    const { iletken_tipi, iletken_cinsi, kesit_mm2 } = req.body;

    try {
        const { rows } = await pool.query(
            'UPDATE hatlar SET iletken_tipi = $1, iletken_cinsi = $2, kesit_mm2 = $3 WHERE id = $4 RETURNING id',
            [iletken_tipi, iletken_cinsi, kesit_mm2, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Hat bulunamadı' });
        res.json({ message: 'Hat güncellendi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Hat sil
router.delete('/hat/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM hatlar WHERE id = $1', [req.params.id]);
        res.json({ message: 'Hat silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GPS / GPX-KML Import ──────────────────────────────────────

// GPX/KML dosyası yükle
router.post('/gpx-import/:projeId', authenticateToken, uploadGpx.single('gpx'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });

    const xml2js = require('xml2js');

    try {
        const data = fs.readFileSync(req.file.path, 'utf8');
        const result = await xml2js.parseStringPromise(data);
        const points = [];

        if (result.gpx) {
            (result.gpx.wpt || []).forEach(wpt => {
                points.push({
                    lat: parseFloat(wpt.$.lat),
                    lng: parseFloat(wpt.$.lon),
                    ad: wpt.name?.[0] ?? 'Nokta',
                    yukseklik: wpt.ele ? parseFloat(wpt.ele[0]) : null
                });
            });

            (result.gpx.trk || []).forEach(trk => {
                (trk.trkseg || []).forEach(seg => {
                    (seg.trkpt || []).forEach(pt => {
                        points.push({
                            lat: parseFloat(pt.$.lat),
                            lng: parseFloat(pt.$.lon),
                            ad: 'Track',
                            yukseklik: pt.ele ? parseFloat(pt.ele[0]) : null
                        });
                    });
                });
            });
        } else if (result.kml?.Document) {
            const doc = result.kml.Document[0];
            let placemarks = [...(doc.Placemark || [])];
            (doc.Folder || []).forEach(f => { placemarks = placemarks.concat(f.Placemark || []); });

            placemarks.forEach(pm => {
                if (pm.Point?.[0]?.coordinates) {
                    const coords = pm.Point[0].coordinates[0].trim().split(',');
                    if (coords.length >= 2) {
                        points.push({
                            lng: parseFloat(coords[0]),
                            lat: parseFloat(coords[1]),
                            ad: pm.name?.[0] ?? 'Nokta',
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const numara = p.ad && !['Nokta', 'Track'].includes(p.ad)
                    ? p.ad
                    : `KML-D-${Date.now()}-${i}`;

                try {
                    await client.query(
                        `INSERT INTO direkler (proje_id, tip_id, cins_id, numara, lat, lng, durum, created_by)
                         VALUES ($1, $2, $3, $4, $5, $6, 'YENİ', $7)`,
                        [req.params.projeId, 1, 1, numara, p.lat, p.lng, req.user.id]
                    );
                } catch (rowErr) {
                    if (rowErr.code !== '23505') throw rowErr; // UNIQUE dışındaki hataları yeniden fırlat
                }
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }

        fs.unlinkSync(req.file.path);
        res.json({ imported: points.length, points });
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

// GPS kayıtlarını getir
router.get('/proje/:projeId/gps', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM gps_kayitlari WHERE proje_id = $1 ORDER BY olcum_tarihi',
            [req.params.projeId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
