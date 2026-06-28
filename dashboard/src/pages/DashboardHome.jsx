import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function DashboardHome({ storeId }) {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState({ activeNotifs: 0, totalNotifs: 0 });
  const STORE_ID = storeId;

  useEffect(() => {
    fetch(`${API_URL}/api/settings/${STORE_ID}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setSettings(data);
      })
      .catch(err => console.error("Ayarlar çekilemedi:", err));

    fetch(`${API_URL}/api/stats/${STORE_ID}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setStats({
          totalNotifs: data.total_notifications || 0,
          totalViews: data.total_views || 0,
          totalClicks: data.total_clicks || 0
        });
      })
      .catch(err => console.error("İstatistikler çekilemedi:", err));
  }, []);

  const saveSettings = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/settings/${STORE_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) alert("Ayarlar başarıyla kaydedildi!");
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gösterge Paneli</h1>
        <p className="page-subtitle">Bidlirim uygulamanızın genel durumunu ve ayarlarını yönetin.</p>
      </div>

      <div className="grid-3">
        <div className="stat-card">
          <div className="stat-value">{stats.totalNotifs}</div>
          <div className="stat-label">Tetiklenen Bildirimler</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#8a2be2' }}>{stats.totalViews}</div>
          <div className="stat-label">Gerçek Gösterim Sayısı</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#10b981' }}>{stats.totalClicks}</div>
          <div className="stat-label">Ürüne Tıklanma / Yönlendirme</div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '32px' }}>
        <h3>Genel Görünüm Ayarları</h3>
        <p className="page-subtitle" style={{ marginBottom: '24px' }}>Sitenizde görünecek bildirimlerin renk, zamanlama ve pozisyonlarını ayarlayın.</p>
        
        {settings ? (
          <form onSubmit={saveSettings} className="grid-2">
            <div className="form-group">
              <label>Tema Tasarımı</label>
              <select className="form-control" value={settings.theme} onChange={(e) => setSettings({...settings, theme: e.target.value})}>
                <option value="light">Aydınlık (Klasik)</option>
                <option value="dark">Karanlık Mod</option>
                <option value="minimal">Minimal (Sade)</option>
                <option value="boutique">Butik (Zarif)</option>
                <option value="luxury">Lüks Siyah (Altın Detaylı)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Ekranda Çıkacağı Konum</label>
              <select 
                className="form-control" 
                value={settings.position} 
                onChange={(e) => setSettings({...settings, position: e.target.value})}
              >
                <option value="bottom-left">Sol Alt</option>
                <option value="bottom-right">Sağ Alt</option>
                <option value="top-left">Sol Üst</option>
                <option value="top-right">Sağ Üst</option>
                <option value="bottom-center">Alt Orta (Önerilen)</option>
                <option value="top-center">Üst Orta</option>
              </select>
            </div>

            <div className="form-group">
              <label>Bildirimler Arası Gecikme (Saniye)</label>
              <input 
                type="number" 
                className="form-control" 
                value={settings.delay} 
                onChange={(e) => setSettings({...settings, delay: parseInt(e.target.value)})} 
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Ekranda Kalma Süresi (Saniye)</label>
              <input 
                type="number" 
                className="form-control" 
                value={settings.displayTime} 
                onChange={(e) => setSettings({...settings, displayTime: parseInt(e.target.value)})} 
                min="1"
              />
            </div>
            
            <div className="form-group">
              <label>Vurgu Rengi (Primary Color)</label>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <input 
                  type="color" 
                  style={{width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer'}} 
                  value={settings.primaryColor} 
                  onChange={(e) => setSettings({...settings, primaryColor: e.target.value})} 
                />
                <input 
                  type="text" 
                  className="form-control" 
                  value={settings.primaryColor} 
                  onChange={(e) => setSettings({...settings, primaryColor: e.target.value})} 
                />
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <hr style={{ borderColor: 'var(--panel-border)', margin: '10px 0 20px 0' }} />
              <h4 style={{ marginBottom: '16px' }}>Akıllı Hedefleme ve Kurallar</h4>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="hideOnMobile"
                  checked={settings.hideOnMobile === 1 || settings.hideOnMobile === true} 
                  onChange={(e) => setSettings({...settings, hideOnMobile: e.target.checked})} 
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="hideOnMobile" style={{ margin: 0 }}>Mobil Cihazlarda Gizle (Bildirimler sadece masaüstünde çıkar)</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="soundEnabled"
                  checked={settings.soundEnabled === 1 || settings.soundEnabled === true} 
                  onChange={(e) => setSettings({...settings, soundEnabled: e.target.checked})} 
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="soundEnabled" style={{ margin: 0 }}>Bildirim Sesi Çal (Hafif ve zarif bir "pop" sesi çalar)</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="maskName"
                  checked={settings.maskName === 1 || settings.maskName === true} 
                  onChange={(e) => setSettings({...settings, maskName: e.target.checked})} 
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="maskName" style={{ margin: 0 }}>Müşteri Adını Maskele (Örn: Ahmet yerine A*** gösterir)</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="hideImage"
                  checked={settings.hideImage === 1 || settings.hideImage === true} 
                  onChange={(e) => setSettings({...settings, hideImage: e.target.checked})} 
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="hideImage" style={{ margin: 0 }}>Ürün Görselini Gizle (Sadece metin olarak gösterir)</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="showVerification"
                  checked={settings.showVerification !== false && settings.showVerification !== 0} 
                  onChange={(e) => setSettings({...settings, showVerification: e.target.checked})} 
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="showVerification" style={{ margin: 0 }}>Mavi Doğrulama Tiki Göster (Güven artırıcı)</label>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label>Bildirim Metni Şablonu</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={settings.templateText || ''} 
                  onChange={(e) => setSettings({...settings, templateText: e.target.value})} 
                  placeholder="{customerName} ({cityFrom}) az önce {productName} satın aldı."
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Değişkenler: {'{customerName}'}, {'{cityFrom}'}, {'{productName}'}, {'{timeText}'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="quietHoursEnabled"
                  checked={settings.quietHoursEnabled === 1 || settings.quietHoursEnabled === true} 
                  onChange={(e) => setSettings({...settings, quietHoursEnabled: e.target.checked})} 
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="quietHoursEnabled" style={{ margin: 0 }}>Sessiz Saatleri Etkinleştir (Bu saatlerde bildirim çıkmaz)</label>
              </div>

              {settings.quietHoursEnabled && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label>Başlangıç Saati</label>
                    <input type="time" className="form-control" value={settings.quietHoursStart || '22:00'} onChange={(e) => setSettings({...settings, quietHoursStart: e.target.value})} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Bitiş Saati</label>
                    <input type="time" className="form-control" value={settings.quietHoursEnd || '08:00'} onChange={(e) => setSettings({...settings, quietHoursEnd: e.target.value})} />
                  </div>
                </div>
              )}

              <div>
                <label>Hariç Tutulacak Sayfalar (Bu kelimeleri içeren URL'lerde bildirim çıkmaz)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={settings.hideOnUrls || ''} 
                  onChange={(e) => setSettings({...settings, hideOnUrls: e.target.value})} 
                  placeholder="Örn: checkout, cart, odeme (Virgülle ayırın)"
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Ödeme aşamasında müşterinin dikkatini dağıtmamak için sepet veya ödeme sayfalarını buraya ekleyebilirsiniz.
                </p>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gridColumn: 'span 2' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Ayarları Kaydet</button>
            </div>
          </form>
        ) : (
          <p>Yükleniyor...</p>
        )}
      </div>
    </div>
  );
}

export default DashboardHome;
