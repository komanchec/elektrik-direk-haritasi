const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/db');

// İşlem geçmişini getir (proje bazlı)
router.get('/proje/:projeId', authenticateToken, (req, res) => {
    db.all(`SELECT ig.*, u.username 
            FROM islem_gecmisi ig 
            JOIN users u ON ig.user_id = u.id 
            WHERE ig.proje_id = ?
            ORDER BY ig.created_at DESC
            LIMIT 100`,
        [req.params.projeId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Tüm işlem geçmişi (admin)
router.get('/', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    db.all(`SELECT ig.*, u.username 
            FROM islem_gecmisi ig 
            JOIN users u ON ig.user_id = u.id 
            ORDER BY ig.created_at DESC
            LIMIT 200`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// İşlem kaydı ekle (dahili kullanım için de export)
router.post('/', authenticateToken, (req, res) => {
    const { proje_id, islem, entity_type, entity_id, detay } = req.body;

    db.run(
        `INSERT INTO islem_gecmisi (proje_id, user_id, islem, entity_type, entity_id, detay) VALUES (?, ?, ?, ?, ?, ?)`,
        [proje_id, req.user.id, islem, entity_type, entity_id, detay],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

module.exports = router;
