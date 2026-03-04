#!/usr/bin/env node
// ============================================================
// Veritabanı Migrasyon Koşucusu
// Kullanım: node database/migrate.js
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../../..', '.env') });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
    const client = await pool.connect();
    try {
        // Migrasyon takip tablosu
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id         SERIAL PRIMARY KEY,
                filename   TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Uygulanan migrasyonları getir
        const { rows: applied } = await client.query(
            'SELECT filename FROM _migrations ORDER BY filename'
        );
        const appliedSet = new Set(applied.map(r => r.filename));

        // Migrasyon dosyalarını sırala
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort();

        let count = 0;
        for (const file of files) {
            if (appliedSet.has(file)) {
                console.log(`  ⏭  ${file} (zaten uygulandı)`);
                continue;
            }

            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
            console.log(`  ▶  ${file} uygulanıyor...`);

            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO _migrations (filename) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
                console.log(`  ✅ ${file} tamamlandı`);
                count++;
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`  ❌ ${file} başarısız:`, err.message);
                process.exit(1);
            }
        }

        if (count === 0) {
            console.log('✅ Tüm migrasyonlar zaten uygulanmış.');
        } else {
            console.log(`\n✅ ${count} migrasyon başarıyla uygulandı.`);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Migrasyon hatası:', err.message);
    process.exit(1);
});
