-- ============================================================
-- Elektrik Direk Haritası — Varsayılan Veriler
-- Migrasyon 002: Seed data
-- bcrypt hash 'admin123' (10 rounds)
-- ============================================================

-- Admin kullanıcısı
INSERT INTO users (id, username, email, password_hash, role)
VALUES (1, 'admin', 'admin@system.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'admin')
ON CONFLICT (username) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 1));

-- ── Direk Cinsleri ───────────────────────────────────────────
INSERT INTO direk_cinsleri (ad, aciklama) VALUES
    ('AG_DEMİR',   'Alçak Gerilim Demir Direk'),
    ('MÜŞ_DEMİR',  'Müşterek Demir Direk'),
    ('BETON',      'Beton Direk'),
    ('ENH',        'Enerji Nakil Hattı Direği')
ON CONFLICT DO NOTHING;

-- ── AG_DEMİR Tipleri ────────────────────────────────────────
INSERT INTO direk_tipleri (cins_id, ad)
SELECT id, unnest(ARRAY[
    '8I','10I','12I','K1','K2','K3','K4','K5',
    'G-10I','G-12I','G-K1','G-K2','G-K3','G-K4','G-K5'
])
FROM direk_cinsleri WHERE ad = 'AG_DEMİR'
ON CONFLICT DO NOTHING;

-- ── MÜŞ_DEMİR Tipleri ───────────────────────────────────────
INSERT INTO direk_tipleri (cins_id, ad)
SELECT id, unnest(ARRAY[
    '10I"','12I"','K1"','K2"','K3"','K4"','K5"',
    'G-10I"','G-12I"','G-K1"','G-K2"','G-K3"','G-K4"','G-K5"'
])
FROM direk_cinsleri WHERE ad = 'MÜŞ_DEMİR'
ON CONFLICT DO NOTHING;

-- ── İletken Tipleri ──────────────────────────────────────────
INSERT INTO iletken_tipleri (kod, ad, renk) VALUES
    ('AAC',    'AAC (Alüminyum)',            '#ef4444'),
    ('AAAC',   'AAAC (Alüminyum Alaşımlı)', '#3b82f6'),
    ('ACSR',   'ACSR (Çelik Çekirdekli)',    '#10b981'),
    ('ACAR',   'ACAR (Alüminyum Alaşımlı)', '#f59e0b'),
    ('BUNDLE', 'Bölünmüş İletken',           '#8b5cf6')
ON CONFLICT (kod) DO NOTHING;

-- ── Malzeme Cinsleri ─────────────────────────────────────────
INSERT INTO malzeme_cinsleri (ad) VALUES
    ('TOPRAKLAMA'),
    ('PARAFUDR'),
    ('GALVANİZLİ_GAZ_BORUSU'),
    ('TEL_KAFESLİ_ÇİT'),
    ('TEHLİKE_LEVHASI')
ON CONFLICT (ad) DO NOTHING;

-- ── Malzeme Tipleri ──────────────────────────────────────────
INSERT INTO malzeme_tipleri (cins_id, ad, birim)
SELECT id, 'TOPRAKLAMA KAZIĞI', 'ad/ad'
FROM malzeme_cinsleri WHERE ad = 'TOPRAKLAMA' ON CONFLICT DO NOTHING;

INSERT INTO malzeme_tipleri (cins_id, ad, birim)
SELECT id, '1X95 Nyy Alm.', 'mt/mt'
FROM malzeme_cinsleri WHERE ad = 'TOPRAKLAMA' ON CONFLICT DO NOTHING;

INSERT INTO malzeme_tipleri (cins_id, ad, birim)
SELECT id, 'TOPRAKLAMA ŞERİDİ', 'mt/mt'
FROM malzeme_cinsleri WHERE ad = 'TOPRAKLAMA' ON CONFLICT DO NOTHING;

INSERT INTO malzeme_tipleri (cins_id, ad, birim)
SELECT id, 'GALVANİZLİ ÖRGÜLÜ ÇELİK TEL VE GÖMÜLMESİ', 'mt/mt'
FROM malzeme_cinsleri WHERE ad = 'TOPRAKLAMA' ON CONFLICT DO NOTHING;

INSERT INTO malzeme_tipleri (cins_id, ad, birim)
SELECT id, 'TOPRAKLAMA KAZIĞI + 5m. ŞERİT', 'ad/ad'
FROM malzeme_cinsleri WHERE ad = 'TOPRAKLAMA' ON CONFLICT DO NOTHING;

INSERT INTO malzeme_tipleri (cins_id, ad, birim)
SELECT id, '3/4"', 'mt/mt'
FROM malzeme_cinsleri WHERE ad = 'PARAFUDR' ON CONFLICT DO NOTHING;

INSERT INTO malzeme_tipleri (cins_id, ad, birim)
SELECT id, 'GALVANİZLİ GAZ BORUSU 3/4"', 'mt/mt'
FROM malzeme_cinsleri WHERE ad = 'GALVANİZLİ_GAZ_BORUSU' ON CONFLICT DO NOTHING;
