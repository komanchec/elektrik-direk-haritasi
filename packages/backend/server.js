require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.use((req, res, next) => {
    console.log(`➡️  [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ── Rate Limiting ─────────────────────────────────────────────
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'API limitine ulaşıldı.' }
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, require('./routes/auth'));
app.use('/api/projeler',  apiLimiter,  require('./routes/projeler'));
app.use('/api/direkler',  apiLimiter,  require('./routes/direkler'));
app.use('/api/tipler',    apiLimiter,  require('./routes/tipler'));
app.use('/api/malzemeler',apiLimiter,  require('./routes/malzemeler'));
app.use('/api/yorumlar',  apiLimiter,  require('./routes/yorumlar'));
app.use('/api/audit',     apiLimiter,  require('./routes/audit'));

// ── SPA Fallback (Vue frontend build'i için) ─────────────────
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: 'Frontend build bulunamadı. npm run build çalıştırın.' });
    }
});

// ── Başlat ────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    console.log(`🗄️  Veritabanı: ${process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@') ?? 'YOK'}`);
});
