'use client';

import { useState, useEffect, useRef } from 'react';
import { getMemberData, isRegistered, generatePaymentRef } from '@/lib/member';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

type ProductType = 'boxed' | 'built';
type Category = 'all' | 'standard' | 'premium' | 'limited' | 'built' | 'unbuilt';

interface Product {
  id: string;
  name: string;
  category: 'standard' | 'premium' | 'limited';
  chassis: string;
  price_boxed: number;
  price_built: number;
  description: string;
  badge?: string;
  badgeColor?: string;
  image_url: string;
  stock: 'in stock' | 'preorder only' | 'limited' | 'sold out' | 'coming soon';
}

const PRODUCTS: Product[] = [
  // STANDARD
  {
    id: 'ray-spear',
    name: 'Ray Spear',
    category: 'standard',
    chassis: 'AR',
    price_boxed: 449,
    price_built: 649,
    description: 'Classic aerodynamic design on the versatile AR chassis. Perfect entry point for new racers.',
    image_url: 'https://www.tamiya.com/english/products/18091ray_spear/ray.jpg',
    stock: 'in stock',
  },
  {
    id: 'flame-astute',
    name: 'Flame Astute',
    category: 'standard',
    chassis: 'MA',
    price_boxed: 449,
    price_built: 649,
    description: 'High-speed body design with the balanced MA chassis. Great for technical tracks.',
    image_url: 'https://www.tamiya.com/english/products/18090flame_astute/flame.jpg',
    stock: 'in stock',
  },
  {
    id: 'shadow-shark',
    name: 'Shadow Shark',
    category: 'standard',
    chassis: 'MS',
    price_boxed: 499,
    price_built: 699,
    description: 'Aggressive shark-inspired body on the mid-ship MS chassis. Excellent stability at speed.',
    image_url: 'https://www.tamiya.com/english/products/95567shadow_shark/shadow.jpg',
    stock: 'in stock',
  },
  {
    id: 'diospada-premium',
    name: 'Diospada Premium',
    category: 'standard',
    chassis: 'AR',
    price_boxed: 549,
    price_built: 799,
    description: 'Premium sword-inspired body with upgraded AR chassis components. Race-tuned out of the box.',
    image_url: 'https://www.tamiya.com/english/products/95542diospada/dios.jpg',
    stock: 'preorder only',
    badge: 'PREORDER',
    badgeColor: '#3B82F6',
  },
  {
    id: 'gun-bluster',
    name: 'Gun Bluster XTO Premium',
    category: 'standard',
    chassis: 'FM-A',
    price_boxed: 599,
    price_built: 849,
    description: 'Front-motor FM-A chassis with the iconic Gun Bluster body. Unique handling characteristics.',
    image_url: 'https://www.tamiya.com/english/products/95569gun_bluster/gun.jpg',
    stock: 'preorder only',
    badge: 'PREORDER',
    badgeColor: '#3B82F6',
  },
  {
    id: 'beak-stinger',
    name: 'Beak Stinger G',
    category: 'standard',
    chassis: 'VS',
    price_boxed: 649,
    price_built: 899,
    description: 'Vertical layout VS chassis with the aggressive Beak Stinger G body. Low center of gravity speed machine.',
    image_url: 'https://www.tamiya.com/english/products/95570beak_stinger/beak.jpg',
    stock: 'preorder only',
    badge: 'PREORDER',
    badgeColor: '#3B82F6',
  },
  // PREMIUM
  {
    id: 'exflowly-purple',
    name: 'Exflowly Polycarbonate Body Special',
    category: 'premium',
    chassis: 'MA',
    price_boxed: 799,
    price_built: 1099,
    description: 'Stunning purple polycarbonate body with the precision MA chassis. A showpiece and a racer.',
    image_url: 'https://www.tamiya.com/english/products/95557exflowly/exflowly.jpg',
    stock: 'limited',
    badge: 'SPECIAL EDITION',
    badgeColor: '#A855F7',
  },
  {
    id: 'mach-frame-ph',
    name: 'Mach Frame Philippine Cup Special',
    category: 'premium',
    chassis: 'AR',
    price_boxed: 999,
    price_built: 1299,
    description: 'Philippine Cup exclusive colorway on the Mach Frame body. Built for champions, designed for collectors.',
    image_url: 'https://www.tamiya.com/english/products/95554mach_frame/mach.jpg',
    stock: 'limited',
    badge: 'EXCLUSIVE',
    badgeColor: '#DC2626',
  },
  // LIMITED
  {
    id: 'cyclone-25th',
    name: 'Cyclone Magnum 25th Anniversary',
    category: 'limited',
    chassis: 'AR',
    price_boxed: 1299,
    price_built: 1699,
    description: '25th anniversary edition of the legendary Cyclone Magnum. Gold-accented chassis, collector packaging.',
    image_url: 'https://www.tamiya.com/english/products/95551cyclone_magnum/cyclone.jpg',
    stock: 'limited',
    badge: '25TH ANNIVERSARY',
    badgeColor: '#FACC15',
  },
  {
    id: 'geo-glider-2026',
    name: 'Geo Glider Asia Challenge 2026',
    category: 'limited',
    chassis: 'MS',
    price_boxed: 1499,
    price_built: 1899,
    description: 'Asia Challenge 2026 special edition. Produced in extremely limited quantities. May not be restocked.',
    image_url: 'https://www.tamiya.com/english/products/95568geo_glider/geo.jpg',
    stock: 'limited',
    badge: 'COLLECTOR',
    badgeColor: '#FACC15',
  },
];

const CATEGORY_TABS: { key: Category; label: string }[] = [
  { key: 'all', label: 'All Products' },
  { key: 'standard', label: 'Standard' },
  { key: 'premium', label: 'Premium' },
  { key: 'limited', label: 'Limited / Rare' },
  { key: 'built', label: 'Built Only' },
  { key: 'unbuilt', label: 'Unbuilt Only' },
];

const STOCK_COLORS: Record<string, string> = {
  'in stock': '#22C55E',
  'preorder only': '#3B82F6',
  'limited': '#FACC15',
  'sold out': '#DC2626',
  'coming soon': '#6B7280',
};

type ModalStep = 'confirm' | 'payment' | 'upload' | 'done';

export default function ShopPage() {
  const [member, setMember] = useState<any>(null);
  const [filter, setFilter] = useState<Category>('all');
  const [typeToggle, setTypeToggle] = useState<Record<string, ProductType>>({});
  const [selected, setSelected] = useState<Product | null>(null);
  const [step, setStep] = useState<ModalStep>('confirm');
  const [orderId, setOrderId] = useState('');
  const [payRef, setPayRef] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMember(getMemberData()); }, []);

  const getType = (id: string): ProductType => typeToggle[id] || 'boxed';
  const toggleType = (id: string, t: ProductType) => setTypeToggle(prev => ({ ...prev, [id]: t }));

  const getPrice = (p: Product) => getType(p.id) === 'built' ? p.price_built : p.price_boxed;

  const filtered = PRODUCTS.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'standard') return p.category === 'standard';
    if (filter === 'premium') return p.category === 'premium';
    if (filter === 'limited') return p.category === 'limited';
    if (filter === 'built') return true;
    if (filter === 'unbuilt') return true;
    return true;
  });

  const featured = PRODUCTS.filter(p => p.category === 'limited').slice(0, 2);

  const openModal = (product: Product) => {
    if (!isRegistered()) { window.location.href = '/register'; return; }
    setSelected(product);
    setStep('confirm');
    setOrderId(''); setPayRef(''); setProofFile(null); setProofPreview(null); setError('');
  };

  const placeOrder = async () => {
    if (!selected || !member) return;
    setUploading(true); setError('');
    const productType = getType(selected.id);
    const price = getPrice(selected);
    try {
      const { data, error: err } = await supabase.from('orders').insert({
        member_email: member.email,
        member_name: member.name,
        product_name: `${selected.name} (${productType === 'built' ? 'Built/Ready' : 'Unbuilt/Boxed'})`,
        chassis: selected.chassis,
        type: productType,
        status: 'pending',
        payment_status: 'awaiting_payment',
        notes: `Price: ${price} DKK | Category: ${selected.category}`,
      }).select().single();
      if (err || !data) throw new Error('failed');
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
  const selectedPrice = selected ? getPrice(selected) : 0;
  const selectedTypeName = selected ? (getType(selected.id) === 'built' ? 'Built / Ready-to-Race' : 'Unbuilt / Boxed Kit') : '';

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>

        {/* Header */}
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(220,38,38,0.2)', padding: '48px 24px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>PREORDER SHOP</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(36px, 8vw, 72px)', color: '#F5F5F5', margin: '0 0 12px', lineHeight: 0.95 }}>MINI 4WD CARS & KITS</h1>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', margin: '0 0 4px', maxWidth: 600 }}>
              Preorder only — no online payment required. Pay via MobilePay after reserving. Pickup in Nuuk.
            </p>
            <p style={{ ...FB, fontSize: 12, color: '#6B7280', margin: 0 }}>
              Prices include local Greenland availability, import handling, and limited stock access. Rare and collector models may not be restocked once sold.
            </p>
          </div>
        </section>

        {/* Featured / Collector Vault */}
        <section style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #071426 50%, #0a0a0a 100%)', borderBottom: '1px solid rgba(250,204,21,0.15)', padding: '40px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#FACC15' }}>🏆 COLLECTOR'S VAULT</div>
              <div style={{ flex: 1, height: 1, background: 'rgba(250,204,21,0.2)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {featured.map(p => (
                <div key={p.id} style={{ background: 'linear-gradient(135deg, #071426, #0D1B2A)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 20, padding: 24, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: 2, background: 'linear-gradient(90deg, transparent, #FACC15, transparent)' }} />
                  <div style={{ ...F, fontSize: 10, letterSpacing: 4, color: '#FACC15', marginBottom: 8 }}>✦ COLLECTOR EDITION</div>
                  <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <img src={p.image_url} alt={p.name} style={{ maxHeight: 110, maxWidth: '100%', objectFit: 'contain' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 4 }}>{p.name}</div>
                  <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 16 }}>{p.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#FACC15' }}>FROM</div>
                      <div style={{ ...F, fontWeight: 900, fontSize: 28, color: '#FACC15' }}>{p.price_boxed.toLocaleString()} kr</div>
                    </div>
                    <button onClick={() => openModal(p)} style={{ background: '#FACC15', color: '#050505', border: 'none', borderRadius: 10, padding: '10px 20px', ...F, fontWeight: 900, fontSize: 14, letterSpacing: 1, cursor: 'pointer' }}>
                      RESERVE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main shop */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 32, WebkitOverflowScrolling: 'touch' as any }}>
            {CATEGORY_TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, padding: '10px 20px', border: filter === tab.key ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: filter === tab.key ? '#DC2626' : '#071426', color: filter === tab.key ? '#fff' : '#B8C1CC', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filtered.map(p => {
              const type = getType(p.id);
              const price = type === 'built' ? p.price_built : p.price_boxed;
              const sc = STOCK_COLORS[p.stock] || '#6B7280';
              const isCollector = p.category === 'limited';

              return (
                <div key={p.id} style={{ background: isCollector ? 'linear-gradient(135deg, #071426, #0D1B2A)' : '#071426', border: `1px solid ${isCollector ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {isCollector && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #FACC15, transparent)' }} />}

                  {/* Badge */}
                  {p.badge && (
                    <div style={{ position: 'absolute', top: 12, left: 12, ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 20, background: (p.badgeColor || '#fff') + '22', color: p.badgeColor || '#fff', border: `1px solid ${p.badgeColor || '#fff'}55` }}>
                      {p.badge}
                    </div>
                  )}

                  {/* Image */}
                  <div style={{ height: 160, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <img src={p.image_url} alt={p.name} style={{ maxHeight: 140, maxWidth: '100%', objectFit: 'contain' }}
                      onError={e => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = 'none';
                        el.parentElement!.innerHTML = `<span style="font-family:'Barlow Condensed',sans-serif;font-size:48px;font-weight:900;color:rgba(255,255,255,0.06)">${p.chassis}</span>`;
                      }} />
                  </div>

                  <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Category + stock */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{p.chassis}</span>
                      <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: sc + '18', color: sc }}>● {p.stock.toUpperCase()}</span>
                    </div>

                    <h3 style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', margin: '0 0 8px', lineHeight: 1.1 }}>{p.name}</h3>
                    <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.6, flex: 1, margin: '0 0 16px' }}>{p.description}</p>

                    {/* Built/Unbuilt toggle */}
                    <div style={{ display: 'flex', background: '#050505', borderRadius: 8, padding: 3, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                      {(['boxed', 'built'] as ProductType[]).map(t => (
                        <button key={t} onClick={() => toggleType(p.id, t)}
                          style={{ flex: 1, ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, padding: '8px 0', border: 'none', borderRadius: 6, background: type === t ? (t === 'built' ? '#DC2626' : 'rgba(255,255,255,0.1)') : 'transparent', color: type === t ? '#fff' : '#6B7280', cursor: 'pointer', transition: 'all 0.2s' }}>
                          {t === 'boxed' ? '🔧 UNBUILT' : '⚡ BUILT'}
                        </button>
                      ))}
                    </div>

                    {/* Price + CTA */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#B8C1CC' }}>{type === 'built' ? 'BUILT PRICE' : 'KIT PRICE'}</div>
                        <div style={{ ...F, fontWeight: 900, fontSize: 28, color: isCollector ? '#FACC15' : '#F5F5F5' }}>{price.toLocaleString()} kr</div>
                      </div>
                      <button onClick={() => openModal(p)}
                        style={{ background: p.stock === 'sold out' ? '#333' : '#DC2626', color: p.stock === 'sold out' ? '#666' : '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', ...F, fontWeight: 900, fontSize: 14, letterSpacing: 1, cursor: p.stock === 'sold out' ? 'not-allowed' : 'pointer' }}
                        disabled={p.stock === 'sold out'}>
                        {p.stock === 'sold out' ? 'SOLD OUT' : 'RESERVE →'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notice */}
          <div style={{ marginTop: 48, background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 28px', ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.7 }}>
            <strong style={{ color: '#F5F5F5', ...F, fontSize: 16, letterSpacing: 1 }}>📋 PREORDER NOTICE</strong><br />
            All orders are reservation-based. No online payment required. After reserving, you will receive a MobilePay payment reference. Send payment, upload your proof, and we will confirm your order and arrange pickup in Nuuk.
          </div>
        </div>
      </main>

      {/* Order Modal */}
      {selected && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', margin: 0 }}>
                {step === 'confirm' && 'CONFIRM PREORDER'}
                {step === 'payment' && 'PAY VIA MOBILEPAY'}
                {step === 'upload' && 'UPLOAD PROOF'}
                {step === 'done' && '🏁 PREORDER PLACED!'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              {step === 'confirm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', marginBottom: 4 }}>{selected.name}</div>
                    <div style={{ ...F, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 12 }}>{selectedTypeName} · {selected.chassis} CHASSIS</div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 36, color: '#FACC15' }}>{selectedPrice.toLocaleString()} DKK</div>
                  </div>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC' }}>👤 <span style={{ color: '#F5F5F5' }}>{member?.name}</span></div>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC' }}>📧 <span style={{ color: '#F5F5F5' }}>{member?.email}</span></div>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC' }}>📍 Pickup in Nuuk, Greenland</div>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC' }}>💳 Payment: MobilePay (after reservation)</div>
                  </div>
                  <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: 14, ...FB, fontSize: 13, color: '#93C5FD' }}>
                    Your preorder will be received and we will contact you for payment arrangement and pickup confirmation.
                  </div>
                  {error && <div style={{ ...FB, fontSize: 13, color: '#DC2626' }}>{error}</div>}
                  <button onClick={placeOrder} disabled={uploading} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
                    {uploading ? 'PLACING ORDER...' : 'CONFIRM PREORDER →'}
                  </button>
                </div>
              )}

              {step === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 12, padding: 20 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#FACC15', marginBottom: 12 }}>💳 MOBILEPAY INSTRUCTIONS</div>
                    <ol style={{ ...FB, fontSize: 14, color: '#F5F5F5', lineHeight: 2, margin: 0, paddingLeft: 20 }}>
                      <li>Open MobilePay on your phone</li>
                      <li>Send <strong>{selectedPrice.toLocaleString()} DKK</strong> to <strong>+299 XXXX XXXX</strong></li>
                      <li>Include this reference: <strong style={{ color: '#FACC15', fontFamily: 'monospace' }}>{payRef}</strong></li>
                      <li>Screenshot your confirmation</li>
                      <li>Upload it on the next step</li>
                    </ol>
                  </div>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 4, color: '#B8C1CC', marginBottom: 4 }}>PAYMENT REFERENCE</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#FACC15', letterSpacing: 4 }}>{payRef}</div>
                  </div>
                  <button onClick={() => setStep('upload')} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
                    I'VE PAID — UPLOAD PROOF →
                  </button>
                  <button onClick={closeModal} style={{ background: 'none', border: 'none', ...FB, fontSize: 14, color: '#B8C1CC', cursor: 'pointer', padding: 8 }}>
                    I'll pay later (order is saved)
                  </button>
                </div>
              )}

              {step === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', margin: 0 }}>Upload your MobilePay screenshot. Admin will verify and confirm your order.</p>
                  <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 12, padding: '40px 24px', textAlign: 'center', cursor: 'pointer' }}>
                    {proofPreview
                      ? <img src={proofPreview} alt="proof" style={{ maxHeight: 160, borderRadius: 8, margin: '0 auto', display: 'block' }} />
                      : <><div style={{ fontSize: 40, marginBottom: 8 }}>📷</div><div style={{ ...F, fontWeight: 700, fontSize: 16, color: '#F5F5F5' }}>Tap to select screenshot</div><div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 4 }}>JPG, PNG, or HEIC</div></>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  {error && <div style={{ ...FB, fontSize: 13, color: '#DC2626' }}>{error}</div>}
                  <button onClick={uploadProof} disabled={!proofFile || uploading} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: !proofFile || uploading ? 0.4 : 1 }}>
                    {uploading ? 'UPLOADING...' : 'SUBMIT PROOF →'}
                  </button>
                </div>
              )}

              {step === 'done' && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🏁</div>
                  <h3 style={{ ...F, fontWeight: 900, fontSize: 28, color: '#F5F5F5', margin: '0 0 12px' }}>PROOF SUBMITTED!</h3>
                  <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 20, lineHeight: 1.6 }}>Admin will verify your MobilePay payment and confirm your order. We'll contact you for pickup arrangement.</p>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 4, color: '#B8C1CC', marginBottom: 4 }}>REFERENCE</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: '#FACC15' }}>{payRef}</div>
                  </div>
                  <a href="/orders" style={{ display: 'block', background: '#DC2626', color: '#fff', borderRadius: 12, padding: '16px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, textDecoration: 'none' }}>
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