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

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Get real IP if behind proxy
app.set('trust proxy', true);

app.use(express.static(path.join(__dirname, 'public')));

// === AUTH API ===
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({ error: "Email ve şifre zorunludur." });

    const storeId = 'store-' + Math.random().toString(36).substr(2, 9);
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Postgres: Use RETURNING id
        const result = await db.query(
            `INSERT INTO users (email, password, "storeId") VALUES ($1, $2, $3) RETURNING id`,
            [email, hashedPassword, storeId]
        );
        const userId = result.rows[0].id;
        
        // Varsayılan ayarları oluştur
        await db.query(`INSERT INTO settings ("storeId") VALUES ($1)`, [storeId]);
        
        const token = jwt.sign({ userId, storeId, email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, storeId, email });

    } catch(e) {
        if (e.code === '23505') { // Postgres unique constraint error code
            return res.status(400).json({ error: "Bu email zaten kayıtlı." });
        }
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
    const { theme, position, delay, displayTime, primaryColor, hideOnMobile, hideOnUrls, soundEnabled } = req.body;
    
    try {
        const result = await db.query(
            `UPDATE settings SET theme = $1, position = $2, delay = $3, "displayTime" = $4, "primaryColor" = $5, "hideOnMobile" = $6, "hideOnUrls" = $7, "soundEnabled" = $8 WHERE "storeId" = $9`,
            [theme, position, delay, displayTime, primaryColor, hideOnMobile ? true : false, hideOnUrls || '', soundEnabled === false ? false : true, storeId]
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

    const title = `${customerName} (${resolvedCity})`;
    const message = `Az önce "${productName}" satın aldı.`;

    try {
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

    const type = event === 'cart' ? 'cart' : 'sales';
    const title = event === 'cart' ? 'Sepete Eklendi' : `Biri (${location})`;
    const message = event === 'cart' 
        ? `Biri (${location}) az önce "${productName || 'bir ürün'}" sepetine ekledi.` 
        : `Az önce "${productName || 'bir ürün'}" satın aldı.`;

    const finalImg = imageUrl || 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=150&q=80&fit=crop';

    try {
        const result = await db.query(
            `INSERT INTO notifications ("storeId", type, title, message, "imageUrl", "productUrl", "isActive") VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
            [storeId, type, title, message, finalImg, productUrl || '']
        );
        
        const newNotif = { id: result.rows[0].id, storeId, type, title, message, imageUrl: finalImg, productUrl };
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
        await db.query(`INSERT INTO users (email, password, "storeId") VALUES ($1, $2, $3)`, [email, tempPassword, storeId]);
        await db.query(`INSERT INTO settings ("storeId") VALUES ($1)`, [storeId]);
        res.send(`<h1>Tebrikler!</h1><p>Bidlirim başarıyla <b>${shop}</b> mağazasına kuruldu!</p><p>Sistem Mağaza Kimliğiniz: <b>${storeId}</b></p><a href="${FRONTEND_URL}">Yönetim Paneline Git</a>`);
    } catch (e) {
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
});
