const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/pg');
const { authenticateToken } = require('../middleware/auth');

// Kayıt
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Tüm alanlar gerekli' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const { rows } = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [username, email, hashedPassword]
        );

        const token = jwt.sign(
            { id: rows[0].id, username, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Kullanıcı oluşturuldu',
            token,
            user: { id: rows[0].id, username, role: 'user' }
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Kullanıcı adı veya email zaten kullanımda' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Giriş
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const { rows } = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [username]
        );

        const user = rows[0];
        if (!user) {
            return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Geçersiz şifre' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Giriş başarılı',
            token,
            user: { id: user.id, username: user.username, role: user.role, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tüm kullanıcıları getir (admin)
router.get('/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    }

    try {
        const { rows } = await pool.query(
            'SELECT id, username, email, role, created_at FROM users ORDER BY id'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
