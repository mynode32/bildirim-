(function() {
    // Bidlirim - Premium Sales Notification Widget
    const currentScript = document.currentScript;
    const B_URL = currentScript ? new URL(currentScript.src).origin : "http://localhost:3001";
    const storeId = currentScript ? currentScript.getAttribute('data-store') : 'demo-store-123';

    if (!storeId) return;

    let config = null;
    let notificationQueue = [];
    let isDisplaying = false;

    function injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .bidlirim-container {
                position: fixed;
                z-index: 2147483647;
                display: flex;
                flex-direction: column;
                pointer-events: none;
                gap: 20px;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .bidlirim-bottom-left { bottom: 40px; left: 40px; }
            .bidlirim-bottom-right { bottom: 40px; right: 40px; }
            .bidlirim-top-left { top: 40px; left: 40px; }
            .bidlirim-top-right { top: 40px; right: 40px; }
            .bidlirim-bottom-center { bottom: 40px; left: 50%; transform: translateX(-50%); }
            .bidlirim-top-center { top: 40px; left: 50%; transform: translateX(-50%); }

            .bidlirim-notification {
                background: rgba(255, 255, 255, 0.98);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.8);
                border-radius: 24px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05);
                padding: 18px 24px;
                display: flex;
                align-items: center;
                gap: 20px;
                width: max-content;
                max-width: 420px;
                min-width: 360px;
                transform: translateY(30px) scale(0.95);
                opacity: 0;
                transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                pointer-events: auto;
                cursor: pointer;
                overflow: hidden;
                position: relative;
            }

            .bidlirim-notification.bidlirim-dark {
                background: rgba(15, 15, 20, 0.90);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0,0,0,0.1);
                color: #fff;
            }

            .bidlirim-notification.bidlirim-luxury {
                background: linear-gradient(145deg, #1a1a1a, #000000);
                border: 1px solid #d4af37;
                color: #fdf5e6;
                border-radius: 4px;
            }
            .bidlirim-notification.bidlirim-luxury .bidlirim-title { color: #d4af37; font-family: 'Georgia', serif; font-style: italic; }
            .bidlirim-notification.bidlirim-luxury .bidlirim-message { color: #fdf5e6; }
            .bidlirim-notification.bidlirim-luxury .bidlirim-image-container { border-radius: 4px; border: 1px solid #d4af37; }

            .bidlirim-notification.bidlirim-minimal {
                background: #ffffff;
                border: 1px solid #eee;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border-radius: 8px;
                padding: 12px 16px;
            }
            .bidlirim-notification.bidlirim-minimal .bidlirim-image-container { border-radius: 4px; border: none; width: 50px; height: 50px; }
            .bidlirim-notification.bidlirim-minimal .bidlirim-progress { border-radius: 0 0 8px 8px; }

            .bidlirim-notification.bidlirim-boutique {
                background: #fffafa;
                border: 1px solid #ffe4e1;
                border-radius: 30px;
                box-shadow: 0 10px 20px rgba(205, 92, 92, 0.1);
            }
            .bidlirim-notification.bidlirim-boutique .bidlirim-title { color: #cd5c5c; }


            .bidlirim-notification.bidlirim-show {
                transform: translateY(0) scale(1);
                opacity: 1;
            }

            .bidlirim-notification:hover {
                transform: translateY(-5px) scale(1.02);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            }
            .bidlirim-dark.bidlirim-notification:hover {
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
            }

            .bidlirim-image-container {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                overflow: hidden;
                flex-shrink: 0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                border: 3px solid #fff;
            }
            .bidlirim-dark .bidlirim-image-container {
                border-color: #2a2a35;
            }

            .bidlirim-image-container img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .bidlirim-content {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .bidlirim-title {
                font-size: 16px;
                font-weight: 700;
                margin: 0 0 4px 0;
                color: #1a1a2e;
                letter-spacing: -0.2px;
            }
            .bidlirim-dark .bidlirim-title { color: #f8f9fa; }

            .bidlirim-message {
                font-size: 15px;
                color: #4b5563;
                margin: 0;
                line-height: 1.4;
                font-weight: 500;
            }
            .bidlirim-dark .bidlirim-message { color: #9ca3af; }

            .bidlirim-meta {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 8px;
            }

            .bidlirim-time {
                font-size: 12px;
                color: #6b7280;
                font-weight: 500;
            }
            .bidlirim-dark .bidlirim-time { color: #888; }
            
            .bidlirim-verified {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                font-weight: 600;
                color: #10b981;
                background: rgba(16, 185, 129, 0.1);
                padding: 4px 10px;
                border-radius: 12px;
            }

            .bidlirim-close {
                position: absolute;
                top: 14px;
                right: 14px;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: rgba(0,0,0,0.04);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 14px;
                color: #888;
                opacity: 0;
                transition: all 0.3s ease;
            }
            .bidlirim-close:hover {
                background: rgba(0,0,0,0.08);
                color: #333;
            }

            .bidlirim-dark .bidlirim-close { background: rgba(255,255,255,0.05); color: #888; }
            .bidlirim-dark .bidlirim-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
            
            .bidlirim-notification:hover .bidlirim-close { opacity: 1; }

            .bidlirim-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 4px;
                background: #8a2be2;
                width: 100%;
                transform-origin: left;
                border-radius: 0 0 24px 24px;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }

    function createContainer(position) {
        let container = document.getElementById('bidlirim-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'bidlirim-container';
            container.className = "bidlirim-container bidlirim-" + position;
            document.body.appendChild(container);
        } else {
            container.className = "bidlirim-container bidlirim-" + position;
        }
        return container;
    }

    function isQuietHour() {
        if (!config || !config.settings || !config.settings.quietHoursEnabled) return false;
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const start = config.settings.quietHoursStart.split(':').map(Number); // [22, 0]
        const end = config.settings.quietHoursEnd.split(':').map(Number); // [8, 0]
        
        const currentMins = currentHour * 60 + currentMinute;
        const startMins = start[0] * 60 + start[1];
        const endMins = end[0] * 60 + end[1];

        if (startMins < endMins) {
            return currentMins >= startMins && currentMins <= endMins;
        } else {
            // Gece yarısını geçiyorsa (örn 22:00 - 08:00)
            return currentMins >= startMins || currentMins <= endMins;
        }
    }

    function showNotification(notification) {
        if (!config || isDisplaying || isQuietHour()) return;
        isDisplaying = true;

        const container = createContainer(config.settings.position);
        
        let themeClass = '';
        if (config.settings.theme === 'dark') themeClass = 'bidlirim-dark';
        else if (config.settings.theme === 'luxury') themeClass = 'bidlirim-luxury';
        else if (config.settings.theme === 'minimal') themeClass = 'bidlirim-minimal';
        else if (config.settings.theme === 'boutique') themeClass = 'bidlirim-boutique';

        const el = document.createElement('div');
        el.className = "bidlirim-notification " + themeClass;
        
        const times = ['Az önce', '1 dakika önce', '2 dakika önce', '5 dakika önce'];
        const randomTime = times[Math.floor(Math.random() * times.length)];

        // SVG Checkmark for verified
        const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

        let imageHtml = '';
        if (!config.settings.hideImage) {
            imageHtml = `
            <div class="bidlirim-image-container">
                <img src="${notification.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80&fit=crop'}" alt="Product">
            </div>`;
        }

        let verifyHtml = '';
        if (config.settings.showVerification !== false) {
            verifyHtml = `<span class="bidlirim-verified">${checkIcon} Doğrulandı</span>`;
        }

        let messageHtml = '';
        if (notification.message) {
            messageHtml = `<div class="bidlirim-message">${notification.message}</div>`;
        }

        el.innerHTML = `
            ${imageHtml}
            <div class="bidlirim-content">
                <div class="bidlirim-title">${notification.title}</div>
                ${messageHtml}
                <div class="bidlirim-meta">
                    <span class="bidlirim-time">${randomTime}</span>
                    ${verifyHtml}
                </div>
            </div>
            <div class="bidlirim-close">✕</div>
            <div class="bidlirim-progress" style="background-color: ${config.settings.primaryColor}"></div>
        `;

        el.querySelector('.bidlirim-close').addEventListener('click', (e) => {
            e.stopPropagation();
            hideNotification(el);
        });

        container.appendChild(el);

        // Tıklanabilirlik ve Analitik (Click)
        el.style.cursor = notification.productUrl ? 'pointer' : 'default';
        el.addEventListener('click', (e) => {
            // Çarpı ikonuna tıklandıysa yönlendirme yapma
            if (e.target.closest('.bidlirim-close')) return;
            
            fetch(B_URL + "/api/widget/track/click/" + notification.id).catch(e=>console.log(e));
            
            if (notification.productUrl) {
                window.open(notification.productUrl, '_blank');
            }
        });

        // Görüntülenme analitiği (View)
        fetch(B_URL + "/api/widget/track/view/" + notification.id).catch(e=>console.log(e));

        const progress = el.querySelector('.bidlirim-progress');
        progress.style.transition = "transform " + config.settings.displayTime + "s linear";
        
        setTimeout(() => {
            el.classList.add('bidlirim-show');
            progress.style.transform = 'scaleX(0)';
            
            if (config.settings.soundEnabled) {
                playPopSound();
            }
        }, 50);

        setTimeout(() => {
            hideNotification(el);
        }, config.settings.displayTime * 1000);
    }

    function playPopSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            // Start at a higher frequency and drop quickly for a "pop" sound
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            // Quick attack, quick release
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
            // Autoplay blocked or AudioContext not supported, ignore silently
            console.log("Bidlirim: Ses çalınamadı", e);
        }
    }

    function hideNotification(el) {
        if (!el || !el.parentNode) return;
        
        el.classList.remove('bidlirim-show');
        el.style.transform = "translateY(30px) scale(0.95)";
        el.style.opacity = "0";
        
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
            isDisplaying = false;
            setTimeout(processQueue, config.settings.delay * 1000);
        }, 600);
    }

    function processQueue() {
        if (notificationQueue.length === 0 || isDisplaying) return;
        
        // Rastgele seçip sonsuz döngüye sokmak yerine, sıradakini alıp kuyruktan çıkarıyoruz.
        // Böylece "zırt pırt" aynı bildirimler çıkmıyor.
        const notification = notificationQueue.shift();
        
        showNotification(notification);
    }

    async function init() {
        try {
            const fontLink = document.createElement('link');
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);

            const response = await fetch(B_URL + "/api/widget/config/" + storeId);
            if (!response.ok) throw new Error('Network response was not ok');
            
            config = await response.json();
            
            // Socket.io Bağlantısı Kur (Gerçek Zamanlı)
            const socketScript = document.createElement('script');
            socketScript.src = "https://cdn.socket.io/4.7.5/socket.io.min.js";
            socketScript.onload = () => {
                const socket = io(B_URL);
                socket.emit('join_store', storeId);
                socket.on('new_notification', (notif) => {
                    console.log("Bidlirim: Canlı bildirim alındı!");
                    // Eğer kuyrukta çok fazla yoksa anında başa ekle
                    notificationQueue.unshift(notif);
                    // Eğer şu an bir şey gösterilmiyorsa hemen göster
                    if (!isDisplaying) {
                        processQueue();
                    }
                });
            };
            document.head.appendChild(socketScript);

            // Her durumda stilleri enjekte et (çünkü canlı bildirim gelebilir)
            injectStyles();

            if (config.notifications && config.notifications.length > 0) {
                
                // --- AKILLI HEDEFLEME KONTROLLERİ ---
                // 1. Mobil Gizleme Kontrolü
                if (config.settings.hideOnMobile && window.innerWidth < 768) {
                    console.log("Bidlirim: Mobil cihazda gizleme aktif.");
                    return;
                }

                // 2. URL Blacklist Kontrolü
                if (config.settings.hideOnUrls) {
                    const blacklistedUrls = config.settings.hideOnUrls.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
                    const currentUrl = window.location.href.toLowerCase();
                    
                    for (let word of blacklistedUrls) {
                        if (currentUrl.includes(word)) {
                            console.log("Bidlirim: Bu sayfada gizleme aktif (" + word + ").");
                            return;
                        }
                    }
                }
                // Ziyaretçiyi boğmamak için sadece en son 2 bildirimi kuyruğa alıyoruz.
                notificationQueue = config.notifications.slice(0, 2);
                setTimeout(processQueue, config.settings.delay * 1000);
            }
        } catch (error) {
            console.error("Bidlirim Yükleme Hatası:", error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // --- JAVASCRIPT TRACKING API ---
    window.Bidlirim = window.Bidlirim || {};
    window.Bidlirim.track = async function(event, data = {}) {
        try {
            const payload = {
                event: event,
                productName: data.productName,
                imageUrl: data.imageUrl,
                productUrl: data.productUrl,
                location: data.location || 'Türkiye'
            };
            
            const res = await fetch(B_URL + "/api/widget/event/" + storeId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if(res.ok) {
                console.log("Bidlirim: Event başarıyla gönderildi (" + event + ")");
            }
        } catch(e) {
            console.error("Bidlirim Track Error:", e);
        }
    };
})();
