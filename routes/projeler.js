const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/db');

// Tüm projeleri getir
router.get('/', authenticateToken, (req, res) => {
    const query = req.user.role === 'admin' 
        ? 'SELECT p.*, u.username as owner FROM projeler p JOIN users u ON p.user_id = u.id'
        : 'SELECT p.*, u.username as owner FROM projeler p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?';
    
    const params = req.user.role === 'admin' ? [] : [req.user.id];
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Proje oluştur
router.post('/', authenticateToken, (req, res) => {
    const { ad, aciklama } = req.body;
    
    db.run(
        'INSERT INTO projeler (ad, aciklama, user_id) VALUES (?, ?, ?)',
        [ad, aciklama, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Proje oluşturuldu' });
        }
    );
});

// Proje sil
router.delete('/:id', authenticateToken, (req, res) => {
    const query = req.user.role === 'admin'
        ? 'DELETE FROM projeler WHERE id = ?'
        : 'DELETE FROM projeler WHERE id = ? AND user_id = ?';
    
    const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];
    
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Proje bulunamadı' });
        res.json({ message: 'Proje silindi' });
    });
});

module.exports = router;