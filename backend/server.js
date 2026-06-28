require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'bidlirim_super_secret_key_2026';

app.use(cors());
app.use(express.json());

// Get real IP if behind proxy
app.set('trust proxy', true);

app.use(express.static(path.join(__dirname, 'public')));

// === AUTH API ===
app.post('/api/auth/magic', async (req, res) => {
    let { storeId } = req.body;
    if (!storeId) return res.status(400).json({ error: "Mağaza Adı zorunludur." });
    
    // Temizle (boşlukları sil, küçük harf yap)
    storeId = storeId.trim().toLowerCase();
    const email = `${storeId}@demo.com`;

    try {
        // Mağaza varsa token dön, yoksa oluştur
        let userResult = await db.query(`SELECT * FROM users WHERE "storeId" = $1`, [storeId]);
        
        if (userResult.rows.length === 0) {
            // İlk kez giriyor, oluştur
            await db.query(`INSERT INTO settings ("storeId") VALUES ($1)`, [storeId]);
            const tempPassword = await bcrypt.hash(storeId, 10);
            userResult = await db.query(
                `INSERT INTO users (email, password, "storeId") VALUES ($1, $2, $3) RETURNING id, "storeId"`,
                [email, tempPassword, storeId]
            );
        }

        const user = userResult.rows[0];
        const token = jwt.sign({ userId: user.id, storeId: user.storeId, email }, JWT_SECRET, { expiresIn: '30d' });
        
        res.json({ token, storeId: user.storeId, email });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const user = result.rows[0];
        
        if (!user) return res.status(400).json({ error: "Kullanıcı bulunamadı." });

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) return res.status(400).json({ error: "Hatalı şifre." });

        const token = jwt.sign({ userId: user.id, storeId: user.storeId, email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, storeId: user.storeId, email });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// === YÖNETİM PANELİ (DASHBOARD) API'LERİ ===

app.get('/api/settings/:storeId', async (req, res) => {
    const { storeId } = req.params;
    try {
        const result = await db.query('SELECT * FROM settings WHERE "storeId" = $1', [storeId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Store not found" });
        res.json(result.rows[0]);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/settings/:storeId', async (req, res) => {
    const { storeId } = req.params;
    const { theme, position, delay, displayTime, primaryColor, hideOnMobile, hideOnUrls, soundEnabled, templateText, maskName, quietHoursEnabled, quietHoursStart, quietHoursEnd, hideImage, showVerification } = req.body;
    
    try {
        const result = await db.query(
            `UPDATE settings SET theme = $1, position = $2, delay = $3, "displayTime" = $4, "primaryColor" = $5, "hideOnMobile" = $6, "hideOnUrls" = $7, "soundEnabled" = $8, "templateText" = $9, "maskName" = $10, "quietHoursEnabled" = $11, "quietHoursStart" = $12, "quietHoursEnd" = $13, "hideImage" = $14, "showVerification" = $15 WHERE "storeId" = $16`,
            [
                theme, position, delay, displayTime, primaryColor, hideOnMobile ? true : false, hideOnUrls || '', soundEnabled === false ? false : true,
                templateText || '{customerName} ({cityFrom}) az önce {productName} satın aldı.',
                maskName ? true : false,
                quietHoursEnabled ? true : false,
                quietHoursStart || '22:00',
                quietHoursEnd || '08:00',
                hideImage ? true : false,
                showVerification === false ? false : true,
                storeId
            ]
        );
        res.json({ success: true, changes: result.rowCount });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/notifications/:storeId', async (req, res) => {
    const { storeId } = req.params;
    try {
        const result = await db.query('SELECT * FROM notifications WHERE "storeId" = $1 ORDER BY id DESC', [storeId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/notifications', async (req, res) => {
    const { storeId, type, title, message, imageUrl, productUrl } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO notifications ("storeId", type, title, message, "imageUrl", "productUrl") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [storeId, type, title, message, imageUrl, productUrl || '']
        );
        
        const newId = result.rows[0].id;
        const newNotif = { id: newId, storeId, type, title, message, imageUrl, productUrl };
        
        io.to(storeId).emit('new_notification', newNotif); // Yeni eklendiğinde widget'lara canlı gönder
        res.json(newNotif);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/notifications/:id', async (req, res) => {
    const { id } = req.params;
    const { type, title, message, imageUrl, productUrl, isActive } = req.body;
    try {
        const result = await db.query(
            `UPDATE notifications SET type = $1, title = $2, message = $3, "imageUrl" = $4, "productUrl" = $5, "isActive" = $6 WHERE id = $7`,
            [type, title, message, imageUrl, productUrl || '', isActive ? true : false, id]
        );
        res.json({ success: true, changes: result.rowCount });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/notifications/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("DELETE FROM notifications WHERE id = $1", [id]);
        res.json({ success: true, changes: result.rowCount });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// === WIDGET (PUBLIC) API'LERİ ===

app.get('/api/widget/config/:storeId', async (req, res) => {
    const { storeId } = req.params;
    
    try {
        const setRes = await db.query('SELECT theme, position, delay, "displayTime", "primaryColor", "hideOnMobile", "hideOnUrls", "soundEnabled" FROM settings WHERE "storeId" = $1', [storeId]);
        if (setRes.rows.length === 0) return res.status(404).json({ error: "Store not found" });
        const settings = setRes.rows[0];

        const notRes = await db.query('SELECT id, type, title, message, "imageUrl", "productUrl" FROM notifications WHERE "storeId" = $1 AND "isActive" = true ORDER BY id DESC LIMIT 50', [storeId]);
        const notifications = notRes.rows;
        
        res.json({ settings, notifications });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/widget/track/view/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("UPDATE notifications SET views = views + 1 WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/widget/track/click/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("UPDATE notifications SET clicks = clicks + 1 WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// === İSTATİSTİK API'Sİ ===
app.get('/api/stats/:storeId', async (req, res) => {
    const { storeId } = req.params;
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_notifications,
                COALESCE(SUM(views), 0) as total_views,
                COALESCE(SUM(clicks), 0) as total_clicks
            FROM notifications 
            WHERE "storeId" = $1
        `, [storeId]);
        
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// === OTOMASYON (WEBHOOK & EVENT) API'LERİ ===

app.post('/api/webhooks/order/:storeId', async (req, res) => {
    const { storeId } = req.params;
    
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let geo = geoip.lookup(clientIp);
    
    const b = req.body || {};
    
    let resolvedCity = b.customer_city 
                    || b.billing_address?.city 
                    || b.shipping_address?.city 
                    || b.billing?.city
                    || (geo ? geo.city : 'Bölgenizden');

    let customerName = b.customer_name 
                    || b.customer?.first_name 
                    || b.billing_address?.first_name 
                    || b.billing?.first_name 
                    || 'Bir Müşteri';
    
    customerName = customerName.split(' ')[0];

    let productName = b.product_name 
                   || b.line_items?.[0]?.title 
                   || b.line_items?.[0]?.name 
                   || 'Harika Bir Ürün';

    let productImage = b.product_image 
                    || b.line_items?.[0]?.image_url
                    || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&q=80&fit=crop';
    
    let productUrl = b.product_url || b.line_items?.[0]?.url || '';

    let title = `${customerName} (${resolvedCity})`;
    let message = `Az önce "${productName}" satın aldı.`;

    try {
        const settingsRes = await db.query('SELECT "templateText", "maskName" FROM settings WHERE "storeId" = $1', [storeId]);
        if (settingsRes.rows.length > 0) {
            const s = settingsRes.rows[0];
            if (s.maskName && customerName.length > 1) {
                customerName = customerName.charAt(0) + '***';
            }
            if (s.templateText) {
                // If template text is provided, use it as title and clear message
                title = s.templateText
                    .replace(/{customerName}/g, customerName)
                    .replace(/{cityFrom}/g, resolvedCity)
                    .replace(/{productName}/g, productName)
                    .replace(/{timeText}/g, 'az önce');
                message = '';
            }
        }

        const result = await db.query(
            `INSERT INTO notifications ("storeId", type, title, message, "imageUrl", "productUrl", "isActive") VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
            [storeId, 'sales', title, message, productImage, productUrl]
        );
        
        const newNotif = { id: result.rows[0].id, storeId, type: 'sales', title, message, imageUrl: productImage, productUrl };
        io.to(storeId).emit('new_notification', newNotif);
        
        res.json({ success: true, message: 'Webhook alındı ve canlı yayına verildi.', notificationId: result.rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/widget/event/:storeId', async (req, res) => {
    const { storeId } = req.params;
    const { event, productName, imageUrl, productUrl } = req.body;
    
    if (!['cart', 'purchase'].includes(event)) {
        return res.status(400).json({ error: 'Invalid event type' });
    }

    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp === '::1' || clientIp === '127.0.0.1') clientIp = '8.8.8.8';
    
    let geo = geoip.lookup(clientIp);
    let location = (geo && geo.city) ? geo.city : (req.body.location || 'Türkiye');

    let title = event === 'cart' ? 'Sepete Eklendi' : `Biri (${location})`;
    let message = event === 'cart' 
        ? `Biri (${location}) az önce "${productName || 'bir ürün'}" sepetine ekledi.` 
        : `Az önce "${productName || 'bir ürün'}" satın aldı.`;

    const finalImg = imageUrl || 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=150&q=80&fit=crop';

    try {
        const settingsRes = await db.query('SELECT "templateText", "maskName" FROM settings WHERE "storeId" = $1', [storeId]);
        if (settingsRes.rows.length > 0 && event === 'purchase') {
            const s = settingsRes.rows[0];
            let cName = 'Bir Müşteri';
            if (s.maskName) cName = 'B***';
            if (s.templateText) {
                title = s.templateText
                    .replace(/{customerName}/g, cName)
                    .replace(/{cityFrom}/g, location)
                    .replace(/{productName}/g, productName || 'bir ürün')
                    .replace(/{timeText}/g, 'az önce');
                message = '';
            }
        }

        const result = await db.query(
            `INSERT INTO notifications ("storeId", type, title, message, "imageUrl", "productUrl", "isActive") VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
            [storeId, event, title, message, finalImg, productUrl || '']
        );
        
        const newNotif = { id: result.rows[0].id, storeId, type: event, title, message, imageUrl: finalImg, productUrl };
        io.to(storeId).emit('new_notification', newNotif);
        
        res.json({ success: true, notificationId: result.rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// === OAUTH / APP STORE KURULUM API'LERİ (FAZ 5) ===
app.get('/api/oauth/install', (req, res) => {
    const shop = req.query.shop || req.query.store_id;
    if (!shop) return res.status(400).send("Mağaza bilgisi eksik.");
    res.send(`OAuth Adım 1: ${shop} mağazasından yetki isteniyor... (Gerçek API anahtarlarıyla yönlendirme yapılacak)`);
});

app.get('/api/oauth/callback', async (req, res) => {
    const { shop, code } = req.query;
    if (!shop || !code) return res.status(400).send("Geçersiz OAuth dönüşü.");

    const storeId = 'store-' + Math.random().toString(36).substr(2, 9);
    const email = `${shop}@merchant.com`;
    const tempPassword = await bcrypt.hash(storeId, 10);

    try {
        // Insert settings first due to foreign key constraint
        await db.query(`INSERT INTO settings ("storeId") VALUES ($1)`, [storeId]);
        const result = await db.query(`INSERT INTO users (email, password, "storeId") VALUES ($1, $2, $3) RETURNING id`, [email, tempPassword, storeId]);
        
        const token = jwt.sign({ userId: result.rows[0].id, storeId, email }, JWT_SECRET, { expiresIn: '7d' });
        res.redirect(`${FRONTEND_URL}/?token=${token}&storeId=${storeId}&email=${email}`);
    } catch (e) {
        if (e.code === '23505') { // Postgres unique constraint error code (already installed)
             const existingUser = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
             if(existingUser.rows.length > 0) {
                 const user = existingUser.rows[0];
                 const token = jwt.sign({ userId: user.id, storeId: user.storeId, email }, JWT_SECRET, { expiresIn: '7d' });
                 return res.redirect(`${FRONTEND_URL}/?token=${token}&storeId=${user.storeId}&email=${email}`);
             }
        }
        res.status(500).send(e.message);
    }
});

// === SOCKET.IO BAĞLANTILARI ===
io.on('connection', (socket) => {
    socket.on('join_store', (storeId) => {
        socket.join(storeId);
        console.log(`Socket ${socket.id} joined store: ${storeId}`);
    });
});

server.listen(PORT, () => {
    console.log(`Bidlirim API ${PORT} portunda çalışıyor. Socket.io aktif.`);
    
    // === ÇÖPÇÜ ROBOT (CRON JOB) ===
    // Her 24 saatte bir çalışır ve 30 günden eski bildirimleri siler
    setInterval(async () => {
        try {
            const result = await db.query(`DELETE FROM notifications WHERE "createdAt" < NOW() - INTERVAL '30 days'`);
            console.log(`Çöpçü Robot: 30 günden eski ${result.rowCount} adet bildirim temizlendi.`);
        } catch (e) {
            console.error('Çöpçü Robot Hatası:', e.message);
        }
    }, 24 * 60 * 60 * 1000);
});
