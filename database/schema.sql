-- Kullanıcılar
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Direk Tipleri (Admin yönetir)
CREATE TABLE IF NOT EXISTS direk_tipleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    renk TEXT DEFAULT '#FF0000',
    simge TEXT DEFAULT 'circle',
    aciklama TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Direk Cinsleri (Admin yönetir)
CREATE TABLE IF NOT EXISTS direk_cinsleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    aciklama TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Malzemeler (Admin yönetir)
CREATE TABLE IF NOT EXISTS malzemeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kod TEXT UNIQUE NOT NULL,
    ad TEXT NOT NULL,
    birim TEXT DEFAULT 'adet',
    aciklama TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Projeler
CREATE TABLE IF NOT EXISTS projeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    aciklama TEXT,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Direkler
CREATE TABLE IF NOT EXISTS direkler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id INTEGER NOT NULL,
    tip_id INTEGER NOT NULL,
    cins_id INTEGER NOT NULL,
    numara TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proje_id) REFERENCES projeler(id) ON DELETE CASCADE,
    FOREIGN KEY (tip_id) REFERENCES direk_tipleri(id),
    FOREIGN KEY (cins_id) REFERENCES direk_cinsleri(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(proje_id, numara)
);

-- Direk Malzemeleri
CREATE TABLE IF NOT EXISTS direk_malzemeleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    direk_id INTEGER NOT NULL,
    malzeme_id INTEGER NOT NULL,
    miktar REAL DEFAULT 1,
    aciklama TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (direk_id) REFERENCES direkler(id) ON DELETE CASCADE,
    FOREIGN KEY (malzeme_id) REFERENCES malzemeler(id)
);

-- Hatlar (Direkler arası bağlantı)
CREATE TABLE IF NOT EXISTS hatlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id INTEGER NOT NULL,
    direk1_id INTEGER NOT NULL,
    direk2_id INTEGER NOT NULL,
    hat_tipi TEXT DEFAULT 'enerji',
    mesafe_metre REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proje_id) REFERENCES projeler(id) ON DELETE CASCADE,
    FOREIGN KEY (direk1_id) REFERENCES direkler(id) ON DELETE CASCADE,
    FOREIGN KEY (direk2_id) REFERENCES direkler(id) ON DELETE CASCADE
);

-- Varsayılan admin kullanıcısı (şifre: admin123)
INSERT OR IGNORE INTO users (id, username, email, password_hash, role) 
VALUES (1, 'admin', 'admin@system.com', '$2a$10$YourHashedPasswordHere', 'admin');

-- Örnek direk tipleri
INSERT OR IGNORE INTO direk_tipleri (id, ad, renk, aciklama) VALUES 
(1, 'Beton Direk', '#FF5722', 'Betonarme direk'),
(2, 'Demir Direk', '#2196F3', 'Metal direk'),
(3, 'Ağaç Direk', '#4CAF50', 'Ahşap direk');

-- Örnek direk cinsleri
INSERT OR IGNORE INTO direk_cinsleri (id, ad, aciklama) VALUES 
(1, 'Ana Hat', 'Ana dağıtım hattı'),
(2, 'Sokak Aydınlatma', 'Aydınlatma direği'),
(3, 'Trafo', 'Trafo direği');