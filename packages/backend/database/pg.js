require('dotenv').config({ path: require('path').join(__dirname, '../../..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    console.log('✅ PostgreSQL/PostGIS veritabanına bağlandı');
});

pool.on('error', (err) => {
    console.error('PostgreSQL bağlantı hatası:', err.message);
});

module.exports = pool;
