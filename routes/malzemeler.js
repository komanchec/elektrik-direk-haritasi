const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database/db');

// ============================================
// MALZEME CİNSLERİ (Kategoriler)
// ============================================

// Tüm cinsleri getir
router.get('/cinsler', authenticateToken, (req, res) => {
    db.all('SELECT * FROM malzeme_cinsleri ORDER BY ad', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Cins ekle (admin)
router.post('/cinsler', authenticateToken, requireAdmin, (req, res) => {
    const { ad } = req.body;

    if (!ad) {
        return res.status(400).json({ error: 'Cins adı gerekli' });
    }

    db.run(
        'INSERT INTO malzeme_cinsleri (ad) VALUES (?)',
        [ad.toUpperCase()],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Bu cins zaten var' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Malzeme cinsi eklendi' });
        }
    );
});

// Cins sil (admin)
router.delete('/cinsler/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM malzeme_cinsleri WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Malzeme cinsi silindi' });
    });
});

// ============================================
// MALZEME TİPLERİ (Alt tipler)
// ============================================

// Bir cinse ait tipleri getir
router.get('/tipler/:cinsId', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM malzeme_tipleri WHERE cins_id = ? ORDER BY ad',
        [req.params.cinsId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Tüm tipleri getir (opsiyonel)
router.get('/tipler', authenticateToken, (req, res) => {
    db.all(
        `SELECT mt.*, mc.ad as cins_adi 
         FROM malzeme_tipleri mt 
         JOIN malzeme_cinsleri mc ON mt.cins_id = mc.id 
         ORDER BY mc.ad, mt.ad`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Tip ekle (admin)
router.post('/tipler', authenticateToken, requireAdmin, (req, res) => {
    const { cins_id, ad, birim, birim_fiyat, aciklama } = req.body;

    if (!cins_id || !ad) {
        return res.status(400).json({ error: 'Cins ID ve tip adı gerekli' });
    }

    db.run(
        'INSERT INTO malzeme_tipleri (cins_id, ad, birim, birim_fiyat, aciklama) VALUES (?, ?, ?, ?, ?)',
        [cins_id, ad, birim || 'adet', birim_fiyat || 0, aciklama || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Malzeme tipi eklendi' });
        }
    );
});

// Tip sil (admin)
router.delete('/tipler/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM malzeme_tipleri WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Malzeme tipi silindi' });
    });
});

// ============================================
// ESKİ MALZEMELER (geriye uyumluluk)
// ============================================

// Tüm malzemeleri getir
router.get('/', authenticateToken, (req, res) => {
    db.all('SELECT * FROM malzemeler ORDER BY kod', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Malzeme ekle (sadece admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
    const { kod, ad, birim, aciklama } = req.body;

    if (!kod || !ad) {
        return res.status(400).json({ error: 'Kod ve ad gerekli' });
    }

    db.run(
        'INSERT INTO malzemeler (kod, ad, birim, aciklama) VALUES (?, ?, ?, ?)',
        [kod, ad, birim || 'adet', aciklama || ''],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Bu kodda malzeme zaten var' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Malzeme eklendi' });
        }
    );
});

// Malzeme sil
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM malzemeler WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Malzeme silindi' });
    });
});

module.exports = router;