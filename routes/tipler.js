const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database/db');

// ============================================
// DİREK TİPLERİ
// ============================================

// Tüm tipleri getir
router.get('/', authenticateToken, (req, res) => {
    db.all(`
        SELECT dt.*, dc.ad as cins_adi 
        FROM direk_tipleri dt 
        JOIN direk_cinsleri dc ON dt.cins_id = dc.id 
        ORDER BY dc.ad, dt.ad
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Bir cinse ait tipleri getir
router.get('/:cinsId', authenticateToken, (req, res, next) => {
    // Sadece sayısal ID olup olmadığını basitçe kontrol edelim
    if (isNaN(req.params.cinsId)) {
        return next(); // /cins route'u ile çakışmaması için next() kullanmalıyız
    }
    db.all(
        'SELECT * FROM direk_tipleri WHERE cins_id = ? ORDER BY ad',
        [req.params.cinsId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Tip ekle (sadece admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
    const { cins_id, ad, renk, aciklama } = req.body;

    if (!cins_id || !ad) {
        return res.status(400).json({ error: 'Cins seçimi ve tip adı gerekli' });
    }

    db.run(
        'INSERT INTO direk_tipleri (cins_id, ad, renk, aciklama) VALUES (?, ?, ?, ?)',
        [cins_id, ad, renk || '#3b82f6', aciklama || ''],
        function (err) {
            if (err) {
                console.error('Tip ekleme hatası:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Tip eklendi' });
        }
    );
});

// Tip sil (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM direk_tipleri WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Tip silindi' });
    });
});

// ============================================
// DİREK CİNSLERİ
// ============================================

// Cinsleri getir
router.get('/cins', authenticateToken, (req, res) => {
    db.all('SELECT * FROM direk_cinsleri ORDER BY ad', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Cins ekle (sadece admin)
router.post('/cins', authenticateToken, requireAdmin, (req, res) => {
    const { ad, aciklama } = req.body;

    if (!ad) {
        return res.status(400).json({ error: 'Cins adı gerekli' });
    }

    db.run(
        'INSERT INTO direk_cinsleri (ad, aciklama) VALUES (?, ?)',
        [ad, aciklama || ''],
        function (err) {
            if (err) {
                console.error('Cins ekleme hatası:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Cins eklendi' });
        }
    );
});

// Cins sil (admin)
router.delete('/cins/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM direk_cinsleri WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cins silindi' });
    });
});

// ============================================
// İLETKEN TİPLERİ
// ============================================

// İletken tiplerini getir
router.get('/iletken', authenticateToken, (req, res) => {
    db.all('SELECT * FROM iletken_tipleri ORDER BY ad', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// İletken tipi ekle (admin)
router.post('/iletken', authenticateToken, requireAdmin, (req, res) => {
    const { kod, ad, renk, aciklama } = req.body;

    if (!kod || !ad) {
        return res.status(400).json({ error: 'Kod ve ad gerekli' });
    }

    db.run(
        'INSERT INTO iletken_tipleri (kod, ad, renk, aciklama) VALUES (?, ?, ?, ?)',
        [kod.toUpperCase(), ad, renk || '#3b82f6', aciklama || ''],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Bu kodda iletken zaten var' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'İletken tipi eklendi' });
        }
    );
});

// İletken sil (admin)
router.delete('/iletken/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM iletken_tipleri WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'İletken tipi silindi' });
    });
});

module.exports = router;