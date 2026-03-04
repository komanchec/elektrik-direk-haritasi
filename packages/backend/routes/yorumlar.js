const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../database/pg');

// Yorumları getir (entity bazlı)
router.get('/:entityType/:entityId', authenticateToken, async (req, res) => {
    const { entityType, entityId } = req.params;
    try {
        const { rows } = await pool.query(`
            SELECT y.*, u.username
            FROM yorumlar y
            JOIN users u ON y.user_id = u.id
            WHERE y.entity_type = $1 AND y.entity_id = $2
            ORDER BY y.created_at DESC
        `, [entityType, entityId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Yorum ekle
router.post('/', authenticateToken, async (req, res) => {
    const { proje_id, entity_type, entity_id, yorum } = req.body;
    if (!yorum || !entity_type || !entity_id) {
        return res.status(400).json({ error: 'Yorum, entity_type ve entity_id gerekli' });
    }

    try {
        const { rows } = await pool.query(
            'INSERT INTO yorumlar (proje_id, entity_type, entity_id, user_id, yorum) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [proje_id, entity_type, entity_id, req.user.id, yorum]
        );

        // Audit log (fire and forget)
        pool.query(
            `INSERT INTO islem_gecmisi (proje_id, user_id, islem, entity_type, entity_id, detay)
             VALUES ($1, $2, 'yorum_ekle', $3, $4, $5)`,
            [proje_id, req.user.id, entity_type, entity_id, yorum.substring(0, 100)]
        ).catch(() => {});

        res.json({ id: rows[0].id, message: 'Yorum eklendi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Yorum sil
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const query = isAdmin
            ? 'DELETE FROM yorumlar WHERE id = $1 RETURNING id'
            : 'DELETE FROM yorumlar WHERE id = $1 AND user_id = $2 RETURNING id';

        const { rows } = await pool.query(
            query,
            isAdmin ? [req.params.id] : [req.params.id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Yorum bulunamadı' });
        }
        res.json({ message: 'Yorum silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
