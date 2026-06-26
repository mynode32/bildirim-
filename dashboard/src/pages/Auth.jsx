import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const url = isLogin ? '`$API_URL/api/auth/login' : '`$API_URL/api/auth/register';
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
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
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
      <div className="glass-panel" style={{ width: '400px', textAlign: 'center', padding: '40px' }}>
        <h2 style={{ marginBottom: '10px' }}>Bidlirim</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
          {isLogin ? 'Hesabınıza giriş yapın' : 'Yeni bir mağaza hesabı oluşturun'}
        </p>

        {error && <div style={{ color: '#ef4444', background: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              className="form-control" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="ornek@magaza.com"
            />
          </div>
          <div className="form-group">
            <label>Şifre</label>
            <input 
              type="password" 
              className="form-control" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <p style={{ marginTop: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
          {isLogin ? "Hesabınız yok mu? " : "Zaten hesabınız var mı? "}
          <span 
            style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }} 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Auth;
