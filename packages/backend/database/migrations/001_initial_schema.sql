-- ============================================================
-- Elektrik Direk Haritası — PostgreSQL/PostGIS Şema
-- Migrasyon 001: İlk şema oluşturma
-- ============================================================

-- PostGIS uzantısını etkinleştir
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Kullanıcılar ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role        TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Direk Cinsleri ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direk_cinsleri (
    id          SERIAL PRIMARY KEY,
    ad          TEXT NOT NULL,
    aciklama    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Direk Tipleri ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direk_tipleri (
    id          SERIAL PRIMARY KEY,
    cins_id     INTEGER NOT NULL REFERENCES direk_cinsleri(id) ON DELETE CASCADE,
    ad          TEXT NOT NULL,
    renk        TEXT DEFAULT '#3b82f6',
    aciklama    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── İletken Tipleri ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iletken_tipleri (
    id          SERIAL PRIMARY KEY,
    kod         TEXT UNIQUE NOT NULL,
    ad          TEXT NOT NULL,
    renk        TEXT DEFAULT '#3b82f6',
    aciklama    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Malzeme Cinsleri ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS malzeme_cinsleri (
    id          SERIAL PRIMARY KEY,
    ad          TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Malzeme Tipleri ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS malzeme_tipleri (
    id          SERIAL PRIMARY KEY,
    cins_id     INTEGER NOT NULL REFERENCES malzeme_cinsleri(id) ON DELETE CASCADE,
    ad          TEXT NOT NULL,
    birim       TEXT DEFAULT 'adet',
    birim_fiyat DOUBLE PRECISION DEFAULT 0,
    aciklama    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Malzemeler (geriye uyumluluk) ────────────────────────────
CREATE TABLE IF NOT EXISTS malzemeler (
    id          SERIAL PRIMARY KEY,
    kod         TEXT UNIQUE NOT NULL,
    ad          TEXT NOT NULL,
    birim       TEXT DEFAULT 'adet',
    aciklama    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Projeler ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projeler (
    id          SERIAL PRIMARY KEY,
    ad          TEXT NOT NULL,
    aciklama    TEXT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Direkler (PostGIS geometry kolonu ile) ───────────────────
CREATE TABLE IF NOT EXISTS direkler (
    id          SERIAL PRIMARY KEY,
    proje_id    INTEGER NOT NULL REFERENCES projeler(id) ON DELETE CASCADE,
    tip_id      INTEGER NOT NULL REFERENCES direk_tipleri(id),
    cins_id     INTEGER NOT NULL REFERENCES direk_cinsleri(id),
    numara      TEXT NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    geom        geometry(POINT, 4326),        -- PostGIS konum
    durum       TEXT DEFAULT 'MEVCUT',
    aciklama    TEXT,
    foto_yolu   TEXT,
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(proje_id, numara)
);

-- Spatial index (bbox sorguları için kritik)
CREATE INDEX IF NOT EXISTS idx_direkler_geom
    ON direkler USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_direkler_proje
    ON direkler (proje_id);

-- Trigger: lat/lng değişince geom ve updated_at otomatik güncele
CREATE OR REPLACE FUNCTION sync_direk_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom       := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_direk_geom ON direkler;
CREATE TRIGGER trg_sync_direk_geom
    BEFORE INSERT OR UPDATE OF lat, lng
    ON direkler
    FOR EACH ROW EXECUTE FUNCTION sync_direk_geom();

-- ── Direk Malzemeleri ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direk_malzemeleri (
    id              SERIAL PRIMARY KEY,
    direk_id        INTEGER NOT NULL REFERENCES direkler(id) ON DELETE CASCADE,
    malzeme_tip_id  INTEGER NOT NULL REFERENCES malzeme_tipleri(id),
    miktar          DOUBLE PRECISION DEFAULT 1,
    durum           TEXT DEFAULT 'M+M',
    birim_fiyat     DOUBLE PRECISION DEFAULT 0,
    aciklama        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hatlar ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hatlar (
    id              SERIAL PRIMARY KEY,
    proje_id        INTEGER NOT NULL REFERENCES projeler(id) ON DELETE CASCADE,
    direk1_id       INTEGER NOT NULL REFERENCES direkler(id),
    direk2_id       INTEGER NOT NULL REFERENCES direkler(id),
    iletken_tipi    TEXT,
    iletken_cinsi   TEXT,
    kesit_mm2       DOUBLE PRECISION,
    hat_tipi        TEXT DEFAULT 'enerji',
    mesafe_metre    DOUBLE PRECISION,
    durum           TEXT DEFAULT 'MEVCUT',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── GPS Kayıtları ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gps_kayitlari (
    id              SERIAL PRIMARY KEY,
    proje_id        INTEGER NOT NULL REFERENCES projeler(id) ON DELETE CASCADE,
    ad              TEXT,
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    yukseklik       DOUBLE PRECISION,
    accuracy        DOUBLE PRECISION,
    olcum_tarihi    TIMESTAMPTZ,
    cihaz_id        TEXT
);

-- ── Yorumlar ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS yorumlar (
    id          SERIAL PRIMARY KEY,
    proje_id    INTEGER NOT NULL REFERENCES projeler(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('direk', 'hat', 'proje')),
    entity_id   INTEGER NOT NULL,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    yorum       TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── İşlem Geçmişi (Audit Log) ────────────────────────────────
CREATE TABLE IF NOT EXISTS islem_gecmisi (
    id          SERIAL PRIMARY KEY,
    proje_id    INTEGER,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    islem       TEXT NOT NULL,
    entity_type TEXT,
    entity_id   INTEGER,
    detay       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
