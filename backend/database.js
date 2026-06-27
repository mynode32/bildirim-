const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bidlirim',
    // Eğer ücretsiz/Render kullanıyorsan ssl gerekebilir:
    // ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
    console.log('PostgreSQL veritabanına bağlanıldı.');
});

pool.on('error', (err) => {
    console.error('Veritabanı hatası:', err);
});

async function initDb() {
    try {
        // Ayarlar Tablosu
        await pool.query(`CREATE TABLE IF NOT EXISTS settings (
            "storeId" VARCHAR(255) PRIMARY KEY,
            theme VARCHAR(50) DEFAULT 'light',
            position VARCHAR(50) DEFAULT 'bottom-left',
            delay INTEGER DEFAULT 5,
            "displayTime" INTEGER DEFAULT 5,
            "primaryColor" VARCHAR(50) DEFAULT '#8A2BE2',
            "hideOnMobile" BOOLEAN DEFAULT false,
            "hideOnUrls" TEXT DEFAULT '',
            "soundEnabled" BOOLEAN DEFAULT true,
            "templateText" VARCHAR(255) DEFAULT '{customerName} ({cityFrom}) az önce {productName} satın aldı.',
            "maskName" BOOLEAN DEFAULT false,
            "quietHoursEnabled" BOOLEAN DEFAULT false,
            "quietHoursStart" VARCHAR(5) DEFAULT '22:00',
            "quietHoursEnd" VARCHAR(5) DEFAULT '08:00',
            "hideImage" BOOLEAN DEFAULT false,
            "showVerification" BOOLEAN DEFAULT true,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Eski mağazalar için kolonları ekle (hata verirse yoksay)
        const alterCommands = [
            `ALTER TABLE settings ADD COLUMN "templateText" VARCHAR(255) DEFAULT '{customerName} ({cityFrom}) az önce {productName} satın aldı.';`,
            `ALTER TABLE settings ADD COLUMN "maskName" BOOLEAN DEFAULT false;`,
            `ALTER TABLE settings ADD COLUMN "quietHoursEnabled" BOOLEAN DEFAULT false;`,
            `ALTER TABLE settings ADD COLUMN "quietHoursStart" VARCHAR(5) DEFAULT '22:00';`,
            `ALTER TABLE settings ADD COLUMN "quietHoursEnd" VARCHAR(5) DEFAULT '08:00';`,
            `ALTER TABLE settings ADD COLUMN "hideImage" BOOLEAN DEFAULT false;`,
            `ALTER TABLE settings ADD COLUMN "showVerification" BOOLEAN DEFAULT true;`
        ];

        for (let cmd of alterCommands) {
            try { await pool.query(cmd); } catch (e) {}
        }

        // Bildirimler Tablosu (Satış, Ziyaretçi vb.)
        await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            "storeId" VARCHAR(255) REFERENCES settings("storeId"),
            type VARCHAR(50), 
            title TEXT,
            message TEXT,
            "imageUrl" TEXT,
            "productUrl" TEXT DEFAULT '',
            views INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            "isActive" BOOLEAN DEFAULT true,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Kullanıcılar (Users) tablosu
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE,
            password TEXT,
            "storeId" VARCHAR(255) UNIQUE REFERENCES settings("storeId"),
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

    } catch (err) {
        console.error("Tablo oluşturma hatası:", err);
    }
}

initDb();

module.exports = {
    query: (text, params) => pool.query(text, params)
};
