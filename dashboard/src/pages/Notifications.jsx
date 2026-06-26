import React, { useState, useEffect } from 'react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

import { Plus, Trash2, Edit2, Eye, EyeOff, MousePointer } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Notifications({ storeId }) {
  const [notifications, setNotifications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'sales',
    title: '',
    message: '',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80&fit=crop',
    productUrl: ''
  });
  const STORE_ID = storeId;

  const fetchNotifications = () => {
    fetch(``$API_URL/api/notifications/${STORE_ID}`)
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(err => console.error("Bildirimler çekilemedi:", err));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleDelete = (id) => {
    if(window.confirm("Bu bildirimi silmek istediğinize emin misiniz?")) {
      fetch(``$API_URL/api/notifications/${id}`, { method: 'DELETE' })
        .then(() => fetchNotifications());
    }
  };

  const toggleStatus = (id, currentStatus) => {
    const notif = notifications.find(n => n.id === id);
    if(!notif) return;
    
    fetch(``$API_URL/api/notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...notif, isActive: !currentStatus })
    }).then(() => fetchNotifications());
  };

  const handleEdit = (notif) => {
    setFormData({
      type: notif.type,
      title: notif.title,
      message: notif.message,
      imageUrl: notif.imageUrl,
      productUrl: notif.productUrl || ''
    });
    setEditingId(notif.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const url = editingId 
      ? ``$API_URL/api/notifications/${editingId}`
      : ``$API_URL/api/notifications`;
      
    const method = editingId ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, storeId: STORE_ID, isActive: true })
    }).then(() => {
      setShowForm(false);
      setEditingId(null);
      setFormData({ type: 'sales', title: '', message: '', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80&fit=crop', productUrl: '' });
      fetchNotifications();
    });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Bildirimler</h1>
          <p className="page-subtitle">Ziyaretçilerinize göstereceğiniz bildirimleri yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Yeni Bildirim Ekle
        </button>
      </div>

      {showForm && (
        <div className="glass-panel">
          <h3>Yeni Bildirim Oluştur</h3>
          <form onSubmit={handleSubmit} className="grid-2" style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Bildirim Tipi</label>
              <select className="form-control" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="sales">Satış (Örn: Ahmet ürünü aldı)</option>
                <option value="cart">Sepet (Örn: Biri sepete ekledi)</option>
                <option value="visitor">Ziyaretçi (Örn: 15 kişi inceliyor)</option>
                <option value="campaign">Kampanya (Örn: %50 İndirim Başladı)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Başlık</label>
              <input type="text" className="form-control" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Örn: Ayşe (Ankara)" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Mesaj İçeriği</label>
              <input type="text" className="form-control" required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="Örn: Harika bir ürün satın aldı!" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Görsel URL (İsteğe Bağlı)</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.imageUrl} 
                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} 
                placeholder="https://..."
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Yönlendirme Linki (Tıklanınca Gideceği Sayfa)</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.productUrl || ''} 
                onChange={(e) => setFormData({...formData, productUrl: e.target.value})} 
                placeholder="Örn: https://siteniz.com/urun/kirmizi-kazak"
              />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Boş bırakırsanız bildirim tıklanabilir olmaz.</p>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>İptal</button>
              <button type="submit" className="btn btn-primary">{editingId ? 'Güncelle' : 'Kaydet'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="notifications-list">
        {notifications.map(notif => (
          <div key={notif.id} className={`notification-card ${notif.isActive ? '' : 'inactive'}`}>
            <div className="notification-card-header">
              <span className="badge">{notif.type === 'sales' ? 'Satış' : notif.type === 'visitor' ? 'Ziyaretçi' : 'Sepet'}</span>
              <div className="notification-actions">
                <button className="icon-btn" onClick={() => toggleStatus(notif.id, notif.isActive)} title={notif.isActive ? "Pasif Yap" : "Aktif Yap"}>
                  {notif.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button className="icon-btn" onClick={() => handleEdit(notif)} title="Düzenle">
                  <Edit2 size={16} />
                </button>
                <button className="icon-btn delete" onClick={() => handleDelete(notif.id)} title="Sil">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center' }}>
              <img src={notif.imageUrl} alt="preview" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{notif.title}</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{notif.message}</p>
                {notif.productUrl && <a href={notif.productUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary-color)', textDecoration: 'none', display: 'block', marginTop: '4px' }}>🔗 Link Ekli</a>}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <Eye size={14} /> <span>{notif.views || 0} Görüntülenme</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <MousePointer size={14} /> <span>{notif.clicks || 0} Tıklanma</span>
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--glass-bg)', borderRadius: '16px' }}>
            Henüz bildirim eklemediniz.
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
