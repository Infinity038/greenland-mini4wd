'use client';

import { useState, useEffect, useRef } from 'react';
import { getMemberData, isRegistered, generatePaymentRef } from '@/lib/member';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

type ModalStep = 'confirm' | 'payment' | 'upload' | 'done';

interface Product {
  id: string;
  name: string;
  category: string;
  chassis: string;
  price_dkk: number;
  stock_qty: number;
  status: string;
  description: string;
  image_url: string;
  product_type: string;
}

const STOCK_COLORS: Record<string, string> = {
  'in stock': '#22C55E',
  'preorder only': '#3B82F6',
  'limited': '#FACC15',
  'sold out': '#6B7280',
  'coming soon': '#A855F7',
};

const FILTER_TABS = [
  { key: 'all', label: 'All Products' },
  { key: 'standard', label: 'Standard' },
  { key: 'premium', label: 'Premium' },
  { key: 'limited', label: 'Limited / Rare' },
];

function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  if (!product.image_url || failed) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <span style={{ ...F, fontWeight: 900, fontSize: 40, color: 'rgba(255,255,255,0.06)', letterSpacing: 2 }}>{product.chassis}</span>
      <span style={{ ...FB, fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>Image coming soon</span>
    </div>
  );
  return <img src={product.image_url} alt={product.name} onError={() => setFailed(true)} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />;
}

export default function ShopPage() {
  const [member, setMember] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Product | null>(null);
  const [step, setStep] = useState<ModalStep>('confirm');
  const [orderId, setOrderId] = useState('');
  const [payRef, setPayRef] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMember(getMemberData());
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });
    setProducts(data || []);
    setLoading(false);
  }

  const filtered = products.filter(p => {
    if (filter === 'standard') return p.category === 'standard';
    if (filter === 'premium') return p.category === 'premium';
    if (filter === 'limited') return p.category === 'limited' || p.status === 'limited';
    return true;
  });

  const collectors = products.filter(p => p.category === 'limited' || p.status === 'limited');

  const openModal = (p: Product) => {
    if (!isRegistered()) { window.location.href = '/register'; return; }
    if (p.status === 'sold out') return;
    setSelected(p); setStep('confirm');
    setOrderId(''); setPayRef(''); setProofFile(null); setProofPreview(null); setError('');
  };

  const placeOrder = async () => {
    if (!selected || !member) return;
    setUploading(true); setError('');
    try {
      const { data, error: err } = await supabase.from('orders').insert({
        member_email: member.email, member_name: member.name,
        product_name: selected.name,
        chassis: selected.chassis,
        type: selected.product_type || 'boxed',
        status: 'pending',
        payment_status: 'awaiting_payment',
        notes: `Price: ${selected.price_dkk} DKK | Category: ${selected.category}`,
        price: selected.price_dkk,
      }).select().single();
      if (err || !data) throw new Error('failed');
      const ref = generatePaymentRef(data.id);
      await supabase.from('orders').update({ payment_reference: ref }).eq('id', data.id);
      setOrderId(data.id); setPayRef(ref); setStep('payment');
    } catch { setError('Something went wrong. Please try again.'); }
    setUploading(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setProofFile(file);
    const r = new FileReader(); r.onloadend = () => setProofPreview(r.result as string); r.readAsDataURL(file);
  };

  const uploadProof = async () => {
    if (!proofFile || !orderId) return;
    setUploading(true); setError('');
    const r = new FileReader();
    r.onloadend = async () => {
      try {
        await supabase.from('payment_proofs').insert({ order_id: orderId, member_email: member.email, proof_url: r.result as string, status: 'pending' });
        await supabase.from('orders').update({ payment_status: 'proof_uploaded' }).eq('id', orderId);
        setStep('done');
      } catch { setError('Upload failed. Try again.'); }
      setUploading(false);
    };
    r.readAsDataURL(proofFile);
  };

  const closeModal = () => setSelected(null);

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>

        {/* Header */}
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(220,38,38,0.15)', padding: '48px 24px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>PREORDER SHOP</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(36px, 8vw, 72px)', color: '#F5F5F5', margin: '0 0 10px', lineHeight: 0.95 }}>MINI 4WD CARS & KITS</h1>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', margin: 0, maxWidth: 560 }}>Preorder only — no online payment. Pay via MobilePay after reserving. Pickup in Nuuk, Greenland.</p>
          </div>
        </section>

        {/* Collector's Vault */}
        {collectors.length > 0 && (
          <section style={{ background: 'linear-gradient(135deg, #050505 0%, #0a0f1a 50%, #050505 100%)', borderBottom: '1px solid rgba(250,204,21,0.1)', padding: '40px 24px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#FACC15' }}>🏆 COLLECTOR'S VAULT</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(250,204,21,0.3), transparent)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {collectors.map(p => (
                  <div key={p.id} style={{ background: 'linear-gradient(135deg, #0a0f1a, #071426)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 18, padding: 20, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #FACC15, transparent)' }} />
                    <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#FACC15', marginBottom: 4 }}>✦ COLLECTOR</div>
                    <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                      <ProductImage product={p} />
                    </div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 4, lineHeight: 1.1 }}>{p.name}</div>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', marginBottom: 12 }}>{p.chassis} CHASSIS</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ ...F, fontSize: 9, letterSpacing: 3, color: '#FACC15' }}>FROM</div>
                        <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#FACC15' }}>{p.price_dkk?.toLocaleString()} kr</div>
                      </div>
                      <button onClick={() => openModal(p)} style={{ background: '#FACC15', color: '#050505', border: 'none', borderRadius: 8, padding: '9px 18px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>RESERVE</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main catalog */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 32 }}>
            {FILTER_TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, padding: '10px 18px', border: filter === tab.key ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: 10, background: filter === tab.key ? '#DC2626' : '#071426', color: filter === tab.key ? '#fff' : '#B8C1CC', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280', ...FB, fontSize: 14 }}>Loading products...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280', ...FB, fontSize: 14 }}>No products available yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {filtered.map(p => {
                const sc = STOCK_COLORS[p.status] || '#6B7280';
                const isCollector = p.category === 'limited' || p.status === 'limited';
                return (
                  <div key={p.id}
                    style={{ background: isCollector ? 'linear-gradient(135deg, #0a0f1a, #071426)' : '#071426', border: `1px solid ${isCollector ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'transform 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = isCollector ? 'rgba(250,204,21,0.5)' : 'rgba(220,38,38,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isCollector ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {isCollector && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #FACC15, transparent)', zIndex: 1 }} />}
                    {p.status === 'preorder only' && <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 20, background: '#3B82F622', color: '#3B82F6', border: '1px solid #3B82F644' }}>PREORDER</div>}

                    <div style={{ height: 180, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }} onClick={() => openModal(p)}>
                      <ProductImage product={p} />
                    </div>

                    <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{p.chassis}</span>
                        <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: sc + '18', color: sc }}>● {p.status?.toUpperCase()}</span>
                      </div>
                      <h3 style={{ ...F, fontWeight: 900, fontSize: 19, color: '#F5F5F5', margin: '0 0 6px', lineHeight: 1.1 }}>{p.name}</h3>
                      <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.6, flex: 1, margin: '0 0 14px' }}>{p.description}</p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ ...F, fontSize: 9, letterSpacing: 3, color: '#B8C1CC' }}>KIT PRICE</div>
                          <div style={{ ...F, fontWeight: 900, fontSize: 26, color: isCollector ? '#FACC15' : '#F5F5F5' }}>{p.price_dkk?.toLocaleString()} kr</div>
                        </div>
                        <button onClick={() => openModal(p)} disabled={p.status === 'sold out'}
                          style={{ background: p.status === 'sold out' ? '#1a1a1a' : '#DC2626', color: p.status === 'sold out' ? '#444' : '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: p.status === 'sold out' ? 'not-allowed' : 'pointer' }}
                          onMouseEnter={e => { if (p.status !== 'sold out') (e.target as HTMLElement).style.background = '#B91C1C'; }}
                          onMouseLeave={e => { if (p.status !== 'sold out') (e.target as HTMLElement).style.background = '#DC2626'; }}>
                          {p.status === 'sold out' ? 'SOLD OUT' : 'RESERVE →'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 48, background: '#071426', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '20px 24px', ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.7 }}>
            <strong style={{ color: '#F5F5F5', ...F, fontSize: 15, letterSpacing: 1 }}>📋 PREORDER NOTICE</strong><br />
            All orders are reservation-based. No online payment required. After reserving you will receive a MobilePay reference — send payment, upload your proof, and we will confirm your order and arrange pickup in Nuuk.
          </div>
        </div>
      </main>

      {/* MODAL */}
      {selected && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', margin: 0 }}>
                {step === 'confirm' && 'CONFIRM PREORDER'}
                {step === 'payment' && 'PAY VIA MOBILEPAY'}
                {step === 'upload' && 'UPLOAD PROOF'}
                {step === 'done' && '🏁 ORDER PLACED!'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {step === 'confirm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5' }}>{selected.name}</div>
                    <div style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC', margin: '4px 0 12px' }}>{selected.chassis} CHASSIS</div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 32, color: '#FACC15' }}>{selected.price_dkk?.toLocaleString()} DKK</div>
                  </div>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>👤 <span style={{ color: '#F5F5F5' }}>{member?.name}</span></div>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>📧 <span style={{ color: '#F5F5F5' }}>{member?.email}</span></div>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>📍 Pickup: Nuuk, Greenland</div>
                  </div>
                  <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: 12, ...FB, fontSize: 13, color: '#93C5FD' }}>
                    Your preorder will be received. We will contact you for payment and pickup confirmation.
                  </div>
                  {error && <div style={{ ...FB, fontSize: 12, color: '#DC2626' }}>{error}</div>}
                  <button onClick={placeOrder} disabled={uploading} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '15px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
                    {uploading ? 'PLACING ORDER...' : 'CONFIRM PREORDER →'}
                  </button>
                </div>
              )}
              {step === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 12, padding: 18 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#FACC15', marginBottom: 12 }}>💳 MOBILEPAY INSTRUCTIONS</div>
                    <ol style={{ ...FB, fontSize: 14, color: '#F5F5F5', lineHeight: 2.2, margin: 0, paddingLeft: 20 }}>
                      <li>Open MobilePay on your phone</li>
                      <li>Send <strong>{selected.price_dkk?.toLocaleString()} DKK</strong> to <strong>+299 XXXX XXXX</strong></li>
                      <li>Reference: <strong style={{ color: '#FACC15', fontFamily: 'monospace' }}>{payRef}</strong></li>
                      <li>Screenshot the confirmation</li>
                      <li>Upload it on the next step</li>
                    </ol>
                  </div>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 4, color: '#B8C1CC', marginBottom: 4 }}>PAYMENT REFERENCE</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#FACC15', letterSpacing: 4 }}>{payRef}</div>
                  </div>
                  <button onClick={() => setStep('upload')} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '15px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>
                    I'VE PAID — UPLOAD PROOF →
                  </button>
                  <button onClick={closeModal} style={{ background: 'none', border: 'none', ...FB, fontSize: 13, color: '#6B7280', cursor: 'pointer', padding: 8 }}>
                    I'll pay later (order is saved)
                  </button>
                </div>
              )}
              {step === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', margin: 0 }}>Upload your MobilePay screenshot. Admin will verify and confirm your order.</p>
                  <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer' }}>
                    {proofPreview
                      ? <img src={proofPreview} alt="proof" style={{ maxHeight: 160, borderRadius: 8, margin: '0 auto', display: 'block' }} />
                      : <><div style={{ fontSize: 36, marginBottom: 8 }}>📷</div><div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5' }}>Tap to select screenshot</div><div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 4 }}>JPG, PNG, HEIC</div></>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                  {error && <div style={{ ...FB, fontSize: 12, color: '#DC2626' }}>{error}</div>}
                  <button onClick={uploadProof} disabled={!proofFile || uploading} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '15px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, cursor: 'pointer', opacity: !proofFile || uploading ? 0.4 : 1 }}>
                    {uploading ? 'UPLOADING...' : 'SUBMIT PROOF →'}
                  </button>
                </div>
              )}
              {step === 'done' && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>🏁</div>
                  <h3 style={{ ...F, fontWeight: 900, fontSize: 26, color: '#F5F5F5', margin: '0 0 10px' }}>PROOF SUBMITTED!</h3>
                  <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 18, lineHeight: 1.6 }}>Admin will verify your payment and confirm your order. We'll contact you for pickup.</p>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 4, color: '#B8C1CC', marginBottom: 4 }}>REFERENCE</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: '#FACC15' }}>{payRef}</div>
                  </div>
                  <a href="/orders" style={{ display: 'block', background: '#DC2626', color: '#fff', borderRadius: 12, padding: '15px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>VIEW MY ORDERS →</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}