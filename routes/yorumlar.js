const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/db');

// Yorumları getir (entity bazlı)
router.get('/:entityType/:entityId', authenticateToken, (req, res) => {
    const { entityType, entityId } = req.params;
    db.all(`SELECT y.*, u.username 
            FROM yorumlar y 
            JOIN users u ON y.user_id = u.id 
            WHERE y.entity_type = ? AND y.entity_id = ?
            ORDER BY y.created_at DESC`,
        [entityType, entityId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Yorum ekle
router.post('/', authenticateToken, (req, res) => {
    const { proje_id, entity_type, entity_id, yorum } = req.body;
    if (!yorum || !entity_type || !entity_id) {
        return res.status(400).json({ error: 'Yorum, entity_type ve entity_id gerekli' });
    }

    db.run(
        `INSERT INTO yorumlar (proje_id, entity_type, entity_id, user_id, yorum) VALUES (?, ?, ?, ?, ?)`,
        [proje_id, entity_type, entity_id, req.user.id, yorum],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Audit log
            db.run(`INSERT INTO islem_gecmisi (proje_id, user_id, islem, entity_type, entity_id, detay) VALUES (?, ?, 'yorum_ekle', ?, ?, ?)`,
                [proje_id, req.user.id, entity_type, entity_id, yorum.substring(0, 100)]);

            res.json({ id: this.lastID, message: 'Yorum eklendi' });
        }
    );
});

// Yorum sil
router.delete('/:id', authenticateToken, (req, res) => {
    const query = req.user.role === 'admin'
        ? 'DELETE FROM yorumlar WHERE id = ?'
        : 'DELETE FROM yorumlar WHERE id = ? AND user_id = ?';
    const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Yorum bulunamadı' });
        res.json({ message: 'Yorum silindi' });
    });
});

module.exports = router;
