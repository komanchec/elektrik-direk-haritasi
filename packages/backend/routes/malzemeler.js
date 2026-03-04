const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../database/pg');

// ── Malzeme Cinsleri ──────────────────────────────────────────

router.get('/cinsler', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM malzeme_cinsleri ORDER BY ad');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/cinsler', authenticateToken, requireAdmin, async (req, res) => {
    const { ad } = req.body;
    if (!ad) return res.status(400).json({ error: 'Cins adı gerekli' });

    try {
        const { rows } = await pool.query(
            'INSERT INTO malzeme_cinsleri (ad) VALUES ($1) RETURNING id',
            [ad.toUpperCase()]
        );
        res.json({ id: rows[0].id, message: 'Malzeme cinsi eklendi' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Bu cins zaten var' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.delete('/cinsler/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM malzeme_cinsleri WHERE id = $1', [req.params.id]);
        res.json({ message: 'Malzeme cinsi silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Malzeme Tipleri ───────────────────────────────────────────

router.get('/tipler/:cinsId', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM malzeme_tipleri WHERE cins_id = $1 ORDER BY ad',
            [req.params.cinsId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/tipler', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT mt.*, mc.ad as cins_adi
            FROM malzeme_tipleri mt
            JOIN malzeme_cinsleri mc ON mt.cins_id = mc.id
            ORDER BY mc.ad, mt.ad
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/tipler', authenticateToken, requireAdmin, async (req, res) => {
    const { cins_id, ad, birim, birim_fiyat, aciklama } = req.body;
    if (!cins_id || !ad) return res.status(400).json({ error: 'Cins ID ve tip adı gerekli' });

    try {
        const { rows } = await pool.query(
            'INSERT INTO malzeme_tipleri (cins_id, ad, birim, birim_fiyat, aciklama) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [cins_id, ad, birim || 'adet', birim_fiyat || 0, aciklama || '']
        );
        res.json({ id: rows[0].id, message: 'Malzeme tipi eklendi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/tipler/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM malzeme_tipleri WHERE id = $1', [req.params.id]);
        res.json({ message: 'Malzeme tipi silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Eski Malzemeler (geriye uyumluluk) ───────────────────────

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM malzemeler ORDER BY kod');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { kod, ad, birim, aciklama } = req.body;
    if (!kod || !ad) return res.status(400).json({ error: 'Kod ve ad gerekli' });

    try {
        const { rows } = await pool.query(
            'INSERT INTO malzemeler (kod, ad, birim, aciklama) VALUES ($1, $2, $3, $4) RETURNING id',
            [kod, ad, birim || 'adet', aciklama || '']
        );
        res.json({ id: rows[0].id, message: 'Malzeme eklendi' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Bu kodda malzeme zaten var' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM malzemeler WHERE id = $1', [req.params.id]);
        res.json({ message: 'Malzeme silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
