import React, { useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

import { Copy, CheckCircle } from 'lucide-react';


function Installation({ storeId }) {
  const STORE_ID = storeId;
  const WIDGET_URL = `${API_URL}/widget.js`;
  const embedCode = `<!-- Bidlirim Widget ve Otomatik Radar Sistemi -->
<script src="${WIDGET_URL}" data-store="${STORE_ID}" async></script>
<script>
  // Sepete Ekleme ve Satın Alma Radarı
  window.addEventListener('click', function(e) {
    if (e.target && (e.target.innerText.includes('Sepete Ekle') || e.target.closest('button')?.innerText.includes('Sepete Ekle'))) {
       let pName = document.querySelector('h1')?.innerText || 'Harika Bir Ürün';
       if (window.Bidlirim) window.Bidlirim.track('cart', { productName: pName });
    }
  });

  window.addEventListener('load', function() {
    if (window.location.href.includes('success') || window.location.href.includes('thank-you') || window.location.href.includes('basarili')) {
       if (window.Bidlirim) window.Bidlirim.track('purchase', { productName: 'Harika Bir Ürün' });
    }
  });
</script>`;
  const [copied, setCopied] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = `${API_URL}/api/webhooks/order/${STORE_ID}`;

  const copyToClipboard = (text, setCopiedState) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 3000);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Kurulum ve Otomasyon</h1>
        <p className="page-subtitle">Bidlirim widget'ını sitenize eklemek ve siparişleri otomatikleştirmek için aşağıdaki adımları izleyin.</p>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px' }}>1. Script Kodunu Sitenize Ekleyin</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          Aşağıdaki kodu kopyalayın ve sitenizin kaynak kodunda <code>&lt;/body&gt;</code> etiketinden hemen önce yapıştırın.
          Eğer Ikas, Shopify veya WooCommerce gibi bir platform kullanıyorsanız, özel script veya entegrasyon bölümüne bu kodu ekleyebilirsiniz.
        </p>

        <div className="code-block">
          <button 
            onClick={() => copyToClipboard(embedCode, setCopied)}
            className="btn btn-secondary" 
            style={{ position: 'absolute', top: '10px', right: '10px', padding: '6px 12px' }}
          >
            {copied ? <><CheckCircle size={14} color="var(--success)" /> Kopyalandı</> : <><Copy size={14} /> Kopyala</>}
          </button>
          <code>
            {embedCode}
          </code>
        </div>
      </div>

      <div className="glass-panel" style={{ borderLeft: '4px solid var(--primary-color)' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>YENİ</span> 
          2. Webhook ile Tam Otomasyon (Gerçek Veri)
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          E-ticaret platformunuzdan (Shopify vb.) "Sipariş Oluşturulduğunda" tetiklenecek bir Webhook ayarlayın ve aşağıdaki URL'yi hedef (Endpoint) olarak girin.
          Böylece her satışta, widget'ınıza otomatik olarak bildirim düşecektir!
        </p>

        <div className="code-block" style={{ background: 'rgba(138, 43, 226, 0.05)' }}>
          <button 
            onClick={() => copyToClipboard(webhookUrl, setCopiedWebhook)}
            className="btn btn-secondary" 
            style={{ position: 'absolute', top: '10px', right: '10px', padding: '6px 12px' }}
          >
            {copiedWebhook ? <><CheckCircle size={14} color="var(--success)" /> Kopyalandı</> : <><Copy size={14} /> Kopyala</>}
          </button>
          <code style={{ color: '#fff' }}>
            {webhookUrl}
          </code>
        </div>

        <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
          * Webhook Payload'ı içerisinde <code>customer_name</code> (veya <code>billing.first_name</code>), <code>customer_city</code> ve <code>product_name</code> alanları aranır. Bulunamazsa jenerik "Bir Müşteri", "Harika Bir Ürün" gibi metinler kullanılır.
        </p>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px' }}>Platformlara Göre Kurulum Rehberi</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#fff', marginBottom: '8px' }}>Ikas İçin Kurulum:</h4>
          <ol style={{ paddingLeft: '20px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <li>Ikas yönetici paneline giriş yapın.</li>
            <li><strong>Ayarlar &gt; Satış Kanalları &gt; Online Mağaza</strong> menüsüne gidin.</li>
            <li><strong>Özel Kodlar (Custom Scripts)</strong> bölümünü bulun.</li>
            <li>Kopyaladığınız kodu <strong>Body Sonu (End of Body)</strong> kısmına yapıştırın ve kaydedin.</li>
          </ol>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#fff', marginBottom: '8px' }}>Shopify İçin Kurulum:</h4>
          <ol style={{ paddingLeft: '20px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <li>Shopify Admin paneline gidin.</li>
            <li><strong>Online Store &gt; Themes</strong> kısmında aktif temanızın yanındaki üç noktaya basıp <strong>Edit Code</strong> deyin.</li>
            <li><code>theme.liquid</code> dosyasını açın.</li>
            <li>En alta inip <code>&lt;/body&gt;</code> etiketinin hemen üstüne kodu yapıştırın ve kaydedin.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default Installation;
