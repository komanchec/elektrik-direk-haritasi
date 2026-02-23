const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Tüm alanlar gerekli' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Kullanıcı adı veya email zaten kullanımda' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                
                const token = jwt.sign(
                    { id: this.lastID, username, role: 'user' },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                res.json({ 
                    message: 'Kullanıcı oluşturuldu', 
                    token,
                    user: { id: this.lastID, username, role: 'user' }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, username],
        async (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
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
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    email: user.email
                }
            });
        }
    );
});

// Tüm kullanıcıları getir (admin)
router.get('/users', (req, res) => {
    const authHeader = req.headers['authorization'];
    const tokenStr = authHeader && authHeader.split(' ')[1];

    if (!tokenStr) {
        return res.status(401).json({ error: 'Token gerekli' });
    }

    jwt.verify(tokenStr, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Geçersiz token' });
        if (user.role !== 'admin') return res.status(403).json({ error: 'Admin yetkisi gerekli' });

        db.all('SELECT id, username, email, role, created_at FROM users ORDER BY id', [], (dbErr, rows) => {
            if (dbErr) return res.status(500).json({ error: dbErr.message });
            res.json(rows);
        });
    });
});

module.exports = router;