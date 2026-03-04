const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../database/pg');

// İşlem geçmişi — proje bazlı
router.get('/proje/:projeId', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT ig.*, u.username
            FROM islem_gecmisi ig
            JOIN users u ON ig.user_id = u.id
            WHERE ig.proje_id = $1
            ORDER BY ig.created_at DESC
            LIMIT 100
        `, [req.params.projeId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tüm işlem geçmişi (admin)
router.get('/', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    try {
        const { rows } = await pool.query(`
            SELECT ig.*, u.username
            FROM islem_gecmisi ig
            JOIN users u ON ig.user_id = u.id
            ORDER BY ig.created_at DESC
            LIMIT 200
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// İşlem kaydı ekle
router.post('/', authenticateToken, async (req, res) => {
    const { proje_id, islem, entity_type, entity_id, detay } = req.body;

    try {
        const { rows } = await pool.query(
            `INSERT INTO islem_gecmisi (proje_id, user_id, islem, entity_type, entity_id, detay)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [proje_id, req.user.id, islem, entity_type, entity_id, detay]
        );
        res.json({ id: rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
