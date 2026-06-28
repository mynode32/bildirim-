import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Auth({ onLogin }) {
  const [storeId, setStoreId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const performLogin = async (idToLogin) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/magic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: idToLogin })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Bir hata oluştu');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('storeId', data.storeId);
      localStorage.setItem('email', data.email);
      onLogin(data);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop') || urlParams.get('storeId') || urlParams.get('store_id');
    
    if (shop) {
      setStoreId(shop);
      performLogin(shop);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    performLogin(storeId);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
      <div className="glass-panel" style={{ width: '400px', textAlign: 'center', padding: '40px' }}>
        <h2 style={{ marginBottom: '10px' }}>Bidlirim Login</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
          Yönetim paneline girmek için İkas mağaza adınızı yazın.
        </p>

        {error && <div style={{ color: '#ef4444', background: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
          <div className="form-group">
            <label>İkas Mağaza Adı (Store ID)</label>
            <input 
              type="text" 
              className="form-control" 
              required 
              value={storeId} 
              onChange={e => setStoreId(e.target.value)} 
              placeholder="Örn: dev-mytradeee"
            />
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>
              Mağaza adınızı yazdığınızda şifre gerekmeden otomatik giriş yapacaksınız.
            </small>
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Panele Gir'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Auth;
