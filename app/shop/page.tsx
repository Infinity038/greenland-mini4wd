'use client';

import { useState, useEffect, useRef } from 'react';
import { getMemberData, isRegistered, generatePaymentRef } from '@/lib/member';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const PRODUCTS = [
  { id: 'ar-boxed', name: 'Tamiya AR Chassis Kit', chassis: 'AR', type: 'boxed', price_dkk: 280, description: 'Build-your-own AR chassis. Great beginner kit with wide compatibility.', badge: 'POPULAR', badgeColor: '#22C55E' },
  { id: 'ma-boxed', name: 'Tamiya MA Chassis Kit', chassis: 'MA', type: 'boxed', price_dkk: 290, description: 'Mid-range all-rounder. Ideal for technical tracks.', badge: null, badgeColor: null },
  { id: 'vs-boxed', name: 'Tamiya VS Chassis Kit', chassis: 'VS', type: 'boxed', price_dkk: 295, description: 'Vertical layout for low center of gravity and speed.', badge: null, badgeColor: null },
  { id: 'ar-built', name: 'AR Race-Ready (Built)', chassis: 'AR', type: 'built', price_dkk: 450, description: 'Assembled, tuned, and tested. Race the same day you pick it up.', badge: 'READY TO RACE', badgeColor: '#DC2626' },
  { id: 'ms-boxed', name: 'Tamiya MS Chassis Kit', chassis: 'MS', type: 'boxed', price_dkk: 310, description: 'Mid-ship layout for balance and acceleration.', badge: 'PREORDER', badgeColor: '#FACC15' },
  { id: 'fma-boxed', name: 'Tamiya FM-A Chassis Kit', chassis: 'FM-A', type: 'boxed', price_dkk: 300, description: 'Front motor for unique handling. Great for experienced builders.', badge: 'PREORDER', badgeColor: '#FACC15' },
];

type ModalStep = 'confirm' | 'payment' | 'upload' | 'done';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export default function ShopPage() {
  const [member, setMember] = useState<any>(null);
  const [selected, setSelected] = useState<typeof PRODUCTS[0] | null>(null);
  const [step, setStep] = useState<ModalStep>('confirm');
  const [orderId, setOrderId] = useState('');
  const [payRef, setPayRef] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMember(getMemberData()); }, []);

  const openModal = (product: typeof PRODUCTS[0]) => {
    if (!isRegistered()) { window.location.href = '/register'; return; }
    setSelected(product);
    setStep('confirm');
    setOrderId(''); setPayRef(''); setProofFile(null); setProofPreview(null); setError('');
  };

  const placeOrder = async () => {
    if (!selected || !member) return;
    setUploading(true); setError('');
    try {
      const { data, error: err } = await supabase.from('orders').insert({
        member_email: member.email, member_name: member.name,
        product_name: selected.name, chassis: selected.chassis, type: selected.type,
        status: 'pending', payment_status: 'awaiting_payment',
        notes: `Price: ${selected.price_dkk} DKK`,
      }).select().single();
      if (err || !data) throw new Error('Order failed');
      const ref = generatePaymentRef(data.id);
      await supabase.from('orders').update({ payment_reference: ref }).eq('id', data.id);
      setOrderId(data.id); setPayRef(ref); setStep('payment');
    } catch { setError('Something went wrong. Please try again.'); }
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadProof = async () => {
    if (!proofFile || !orderId) return;
    setUploading(true); setError('');
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        await supabase.from('payment_proofs').insert({ order_id: orderId, member_email: member.email, proof_url: base64, status: 'pending' });
        await supabase.from('orders').update({ payment_status: 'proof_uploaded' }).eq('id', orderId);
        setStep('done');
      } catch { setError('Upload failed. Try again.'); }
      setUploading(false);
    };
    reader.readAsDataURL(proofFile);
  };

  const closeModal = () => setSelected(null);

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>

        {/* Header */}
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(220,38,38,0.2)', padding: '48px 24px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>SHOP</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(36px, 8vw, 64px)', color: '#F5F5F5', margin: '0 0 12px', lineHeight: 0.95 }}>MINI 4WD CARS & KITS</h1>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', margin: 0 }}>Preorder only — no online payment. Pay via MobilePay after reserving. Pickup in Nuuk.</p>
          </div>
        </section>

        {/* Product grid */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {PRODUCTS.map(p => (
              <div key={p.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                {/* Badge */}
                {p.badge && (
                  <div style={{ position: 'absolute', top: 0, right: 0, background: (p.badgeColor || '#fff') + '22', color: p.badgeColor || '#fff', borderLeft: `2px solid ${p.badgeColor}`, borderBottom: `2px solid ${p.badgeColor}`, padding: '4px 12px', ...F, fontSize: 11, fontWeight: 700, letterSpacing: 2, borderBottomLeftRadius: 8 }}>
                    {p.badge}
                  </div>
                )}
                {/* Chassis display */}
                <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <span style={{ ...F, fontWeight: 900, fontSize: 48, color: 'rgba(255,255,255,0.08)', letterSpacing: 4 }}>{p.chassis}</span>
                </div>
                <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 6 }}>
                  {p.type === 'built' ? '⚡ BUILT & READY' : '🔧 BUILD YOURSELF'}
                </div>
                <h3 style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', margin: '0 0 8px' }}>{p.name}</h3>
                <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6, flex: 1, margin: '0 0 20px' }}>{p.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ ...F, fontWeight: 900, fontSize: 28, color: '#FACC15' }}>{p.price_dkk} kr</span>
                  <button
                    onClick={() => openModal(p)}
                    style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', ...F, fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: 'pointer' }}
                  >
                    RESERVE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal */}
      {selected && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', margin: 0 }}>
                {step === 'confirm' && 'CONFIRM ORDER'}
                {step === 'payment' && 'PAY VIA MOBILEPAY'}
                {step === 'upload' && 'UPLOAD PROOF'}
                {step === 'done' && 'ORDER PLACED! 🎉'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 22, cursor: 'pointer', padding: 4 }}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              {/* CONFIRM */}
              {step === 'confirm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5' }}>{selected.name}</div>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginTop: 4 }}>{selected.description}</div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 32, color: '#FACC15', marginTop: 12 }}>{selected.price_dkk} DKK</div>
                  </div>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC' }}>👤 <span style={{ color: '#F5F5F5' }}>{member?.name}</span></div>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC' }}>📧 <span style={{ color: '#F5F5F5' }}>{member?.email}</span></div>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC' }}>📍 Pickup: Nuuk, Greenland</div>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC' }}>💳 Payment: MobilePay (after reservation)</div>
                  </div>
                  {error && <div style={{ ...FB, fontSize: 14, color: '#DC2626' }}>{error}</div>}
                  <button onClick={placeOrder} disabled={uploading} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
                    {uploading ? 'PLACING ORDER...' : 'RESERVE NOW →'}
                  </button>
                </div>
              )}

              {/* PAYMENT */}
              {step === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 12, padding: 20 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#FACC15', marginBottom: 12 }}>💳 MOBILEPAY INSTRUCTIONS</div>
                    <ol style={{ ...FB, fontSize: 14, color: '#F5F5F5', lineHeight: 2, margin: 0, paddingLeft: 20 }}>
                      <li>Open MobilePay on your phone</li>
                      <li>Send <strong>{selected.price_dkk} DKK</strong> to <strong>+299 XXXX XXXX</strong></li>
                      <li>Use reference: <strong style={{ color: '#FACC15', fontFamily: 'monospace' }}>{payRef}</strong></li>
                      <li>Screenshot the confirmation</li>
                      <li>Upload it on the next step</li>
                    </ol>
                  </div>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                    <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 4 }}>ORDER REFERENCE</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 24, color: '#FACC15', letterSpacing: 4 }}>{payRef}</div>
                  </div>
                  <button onClick={() => setStep('upload')} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
                    I'VE PAID — UPLOAD PROOF →
                  </button>
                  <button onClick={closeModal} style={{ background: 'none', border: 'none', ...FB, fontSize: 14, color: '#B8C1CC', cursor: 'pointer', padding: 8 }}>
                    I'll pay later (order is saved)
                  </button>
                </div>
              )}

              {/* UPLOAD */}
              {step === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', margin: 0 }}>Upload your MobilePay screenshot. Admin will verify and confirm your order.</p>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12, padding: '40px 24px', textAlign: 'center', cursor: 'pointer' }}
                  >
                    {proofPreview
                      ? <img src={proofPreview} alt="proof" style={{ maxHeight: 160, borderRadius: 8, margin: '0 auto', display: 'block' }} />
                      : <>
                          <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                          <div style={{ ...F, fontWeight: 700, fontSize: 16, color: '#F5F5F5' }}>Tap to select screenshot</div>
                          <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 4 }}>JPG, PNG, or HEIC</div>
                        </>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  {error && <div style={{ ...FB, fontSize: 14, color: '#DC2626' }}>{error}</div>}
                  <button onClick={uploadProof} disabled={!proofFile || uploading} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: !proofFile || uploading ? 0.4 : 1 }}>
                    {uploading ? 'UPLOADING...' : 'SUBMIT PROOF →'}
                  </button>
                </div>
              )}

              {/* DONE */}
              {step === 'done' && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🏁</div>
                  <h3 style={{ ...F, fontWeight: 900, fontSize: 28, color: '#F5F5F5', margin: '0 0 12px' }}>PROOF SUBMITTED!</h3>
                  <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 20 }}>Admin will verify your payment and confirm your order.</p>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', marginBottom: 4 }}>REFERENCE</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: '#FACC15' }}>{payRef}</div>
                  </div>
                  <a href="/profile" style={{ display: 'block', background: '#DC2626', color: '#fff', borderRadius: 12, padding: '16px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, textDecoration: 'none' }}>
                    VIEW MY ORDERS →
                  </a>
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