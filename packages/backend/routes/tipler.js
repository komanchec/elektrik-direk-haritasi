const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../database/pg');

// ── Direk Tipleri ─────────────────────────────────────────────

// Tüm tipleri getir
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT dt.*, dc.ad as cins_adi
            FROM direk_tipleri dt
            JOIN direk_cinsleri dc ON dt.cins_id = dc.id
            ORDER BY dc.ad, dt.ad
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bir cinse ait tipleri getir
router.get('/:cinsId', authenticateToken, async (req, res, next) => {
    if (isNaN(req.params.cinsId)) return next();
    try {
        const { rows } = await pool.query(
            'SELECT * FROM direk_tipleri WHERE cins_id = $1 ORDER BY ad',
            [req.params.cinsId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tip ekle (admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { cins_id, ad, renk, aciklama } = req.body;

    if (!cins_id || !ad) {
        return res.status(400).json({ error: 'Cins seçimi ve tip adı gerekli' });
    }

    try {
        const { rows } = await pool.query(
            'INSERT INTO direk_tipleri (cins_id, ad, renk, aciklama) VALUES ($1, $2, $3, $4) RETURNING id',
            [cins_id, ad, renk || '#3b82f6', aciklama || '']
        );
        res.json({ id: rows[0].id, message: 'Tip eklendi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tip sil (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM direk_tipleri WHERE id = $1', [req.params.id]);
        res.json({ message: 'Tip silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Direk Cinsleri ────────────────────────────────────────────

router.get('/cins', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM direk_cinsleri ORDER BY ad');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/cins', authenticateToken, requireAdmin, async (req, res) => {
    const { ad, aciklama } = req.body;
    if (!ad) return res.status(400).json({ error: 'Cins adı gerekli' });

    try {
        const { rows } = await pool.query(
            'INSERT INTO direk_cinsleri (ad, aciklama) VALUES ($1, $2) RETURNING id',
            [ad, aciklama || '']
        );
        res.json({ id: rows[0].id, message: 'Cins eklendi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/cins/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM direk_cinsleri WHERE id = $1', [req.params.id]);
        res.json({ message: 'Cins silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── İletken Tipleri ───────────────────────────────────────────

router.get('/iletken', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM iletken_tipleri ORDER BY ad');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/iletken', authenticateToken, requireAdmin, async (req, res) => {
    const { kod, ad, renk, aciklama } = req.body;
    if (!kod || !ad) return res.status(400).json({ error: 'Kod ve ad gerekli' });

    try {
        const { rows } = await pool.query(
            'INSERT INTO iletken_tipleri (kod, ad, renk, aciklama) VALUES ($1, $2, $3, $4) RETURNING id',
            [kod.toUpperCase(), ad, renk || '#3b82f6', aciklama || '']
        );
        res.json({ id: rows[0].id, message: 'İletken tipi eklendi' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Bu kodda iletken zaten var' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.delete('/iletken/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM iletken_tipleri WHERE id = $1', [req.params.id]);
        res.json({ message: 'İletken tipi silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
