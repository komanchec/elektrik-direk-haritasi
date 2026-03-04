const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../database/pg');

// Tüm projeleri getir
router.get('/', authenticateToken, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const query = isAdmin
            ? 'SELECT p.*, u.username as owner FROM projeler p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC'
            : 'SELECT p.*, u.username as owner FROM projeler p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1 ORDER BY p.created_at DESC';

        const { rows } = await pool.query(query, isAdmin ? [] : [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Proje oluştur
router.post('/', authenticateToken, async (req, res) => {
    const { ad, aciklama } = req.body;

    try {
        const { rows } = await pool.query(
            'INSERT INTO projeler (ad, aciklama, user_id) VALUES ($1, $2, $3) RETURNING id',
            [ad, aciklama, req.user.id]
        );
        res.json({ id: rows[0].id, message: 'Proje oluşturuldu' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Proje sil
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const query = isAdmin
            ? 'DELETE FROM projeler WHERE id = $1 RETURNING id'
            : 'DELETE FROM projeler WHERE id = $1 AND user_id = $2 RETURNING id';

        const { rows } = await pool.query(
            query,
            isAdmin ? [req.params.id] : [req.params.id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        res.json({ message: 'Proje silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
