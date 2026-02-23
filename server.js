require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');  // BU GEREKLİ!

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// STATIC DOSYALAR - ÖNCE BU OLMALI!
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// REQUEST LOGGING
app.use((req, res, next) => {
    console.log(`➡️ [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// RATE LIMITING
const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Çok fazla istek. 15 dakika sonra tekrar deneyin.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'API limitine ulaşıldı.' }
});

// API ROUTES
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/projeler', apiLimiter, require('./routes/projeler'));
app.use('/api/direkler', apiLimiter, require('./routes/direkler'));
app.use('/api/tipler', apiLimiter, require('./routes/tipler'));
app.use('/api/malzemeler', apiLimiter, require('./routes/malzemeler'));
app.use('/api/yorumlar', apiLimiter, require('./routes/yorumlar'));
app.use('/api/audit', apiLimiter, require('./routes/audit'));

// ANA SAYFA - STATIC'DEN SONRA
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.get('/harita', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 404 HATA YAKALAMA
app.use((req, res) => {
    res.status(404).send('Sayfa bulunamadı: ' + req.url);
});

app.listen(PORT, () => {
    console.log(`✅ Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    console.log(`📁 Public klasörü: ${path.join(__dirname, 'public')}`);
});