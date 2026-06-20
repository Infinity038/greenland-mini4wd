// @ts-nocheck
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
  unbuilt_stock?: number;
  built_stock?: number;
  status: string;
  description: string;
  image_url: string;
}

// ── Variant pool system ──────────────────────────────────────────
const VARIANTS = [
  { key: 'unbuilt',      label: 'Unbuilt',        shortLabel: '🔧 Unbuilt / Boxed Kit',           icon: '🔧', isBuilt: false, needsCase: false },
  { key: 'unbuilt_case', label: 'Unbuilt + Case', shortLabel: '🔧 Unbuilt / Boxed Kit + Case',     icon: '📦', isBuilt: false, needsCase: true  },
  { key: 'built',        label: 'Built',          shortLabel: '⚡ Built / Ready-to-Race',          icon: '⚡', isBuilt: true,  needsCase: false },
  { key: 'built_case',   label: 'Built + Case',   shortLabel: '⚡ Built / Ready-to-Race + Case',   icon: '⚡', isBuilt: true,  needsCase: true  },
];

function isVariantAvailable(p: Product, key: string, caseStock: number): boolean {
  if (p.status === 'sold out' || p.status === 'coming soon') return false;
  const v = VARIANTS.find(x => x.key === key);
  if (!v) return false;
  const base = v.isBuilt ? (p.built_stock ?? 1) : (p.unbuilt_stock ?? 1);
  if (base <= 0) return false;
  if (v.needsCase && caseStock <= 0) return false;
  return true;
}

const VARIANT_PRICE_FIELDS: Record<string, { price: string; original: string }> = {
  unbuilt:      { price: 'unbuilt_price_dkk',      original: 'unbuilt_original_price_dkk' },
  unbuilt_case: { price: 'unbuilt_case_price_dkk', original: 'unbuilt_case_original_price_dkk' },
  built:        { price: 'built_price_dkk',        original: 'built_original_price_dkk' },
  built_case:   { price: 'built_case_price_dkk',   original: 'built_case_original_price_dkk' },
};

function variantPricing(p: any, key: string): { price: number; original: number | null } {
  const f = VARIANT_PRICE_FIELDS[key];
  if (!f) return { price: p.price_dkk || 0, original: null };
  const price = p[f.price] ?? p.price_dkk ?? 0;
  const original = p[f.original];
  return { price, original: original && original > price ? original : null };
}

function cheapestAvailableVariant(p: Product, caseStock: number) {
  const opts = VARIANTS.filter(v => isVariantAvailable(p, v.key, caseStock)).map(v => ({ key: v.key, ...variantPricing(p, v.key) }));
  if (opts.length === 0) return null;
  return opts.sort((a, b) => a.price - b.price)[0];
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
  { key: 'in stock', label: 'In Stock' },
  { key: 'preorder only', label: 'Preorder' },
  { key: 'limited', label: 'Limited / Rare' },
];

// Cloudinary's console/media-library "view" URL (res-console.cloudinary.com) requires an
// authenticated dashboard session — it loads on desktop if you're logged into Cloudinary in
// that browser tab, but always fails on mobile / other devices / logged-out sessions.
// Auto-rewrite it to the real public CDN delivery URL (res.cloudinary.com) so it works everywhere.
function fixImageUrl(url: string): string {
  if (!url) return url;
  return url.replace(
    /res-console\.cloudinary\.com\/([^/]+)\/thumbnails\/v1\/image\/upload\//,
    'res.cloudinary.com/$1/image/upload/'
  );
}

// Parse comma-separated image URLs
function parseImages(url: string): string[] {
  if (!url) return [];
  return url.split(',').map(u => fixImageUrl(u.trim())).filter(Boolean);
}

function ProductImage({ product, onClick }: { product: Product; onClick?: () => void }) {
  const images = parseImages(product.image_url);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const current = images[idx];
  const isFailed = failed[idx];

  if (!current || isFailed) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <span style={{ ...F, fontWeight: 900, fontSize: 40, color: 'rgba(255,255,255,0.06)', letterSpacing: 2 }}>{product.chassis}</span>
      <span style={{ ...FB, fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>Image coming soon</span>
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={current}
        alt={product.name}
        onError={() => setFailed(f => ({ ...f, [idx]: true }))}
        onClick={onClick}
        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', cursor: onClick ? 'zoom-in' : 'default' }}
      />
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
          {images.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, border: 'none', background: i === idx ? '#DC2626' : 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }} />
          ))}
        </div>
      )}
      {images.length > 1 && idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
          style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
      )}
      {images.length > 1 && idx < images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      )}
    </div>
  );
}

// Fullscreen lightbox
function Lightbox({ product, onClose }: { product: Product; onClose: () => void }) {
  const images = parseImages(product.image_url);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 40, height: 40, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!failed[idx] && images[idx] ? (
          <img src={images[idx]} alt={product.name} onError={() => setFailed(f => ({ ...f, [idx]: true }))}
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12 }} />
        ) : (
          <div style={{ ...F, color: '#B8C1CC', fontSize: 18 }}>Image not available</div>
        )}
        {images.length > 1 && idx > 0 && (
          <button onClick={() => setIdx(i => i - 1)} style={{ position: 'absolute', left: -50, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 40, height: 40, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        )}
        {images.length > 1 && idx < images.length - 1 && (
          <button onClick={() => setIdx(i => i + 1)} style={{ position: 'absolute', right: -50, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 40, height: 40, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        )}
      </div>

      <div style={{ marginTop: 16, ...F, fontSize: 16, color: '#F5F5F5', fontWeight: 700 }}>{product.name}</div>
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {images.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 4, border: 'none', background: i === idx ? '#DC2626' : 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }} />
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, ...FB, fontSize: 12, color: '#6B7280' }}>
        {images.length > 1 ? `${idx + 1} / ${images.length} · ` : ''}Press ESC or click outside to close
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [member, setMember] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [globalCaseStock, setGlobalCaseStock] = useState(0);

  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('unbuilt');
  const [step, setStep] = useState<ModalStep>('confirm');
  const [orderId, setOrderId] = useState('');
  const [payRef, setPayRef] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>('deposit');
  const [lightbox, setLightbox] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Quick preorder (sold-out variant) state
  const [preorderTarget, setPreorderTarget] = useState<{ product: Product; variantKey: string } | null>(null);
  const [preorderSending, setPreorderSending] = useState(false);
  const [preorderDone, setPreorderDone] = useState(false);

  // Wishlist
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Discount codes
  const [discountInput, setDiscountInput] = useState('');
  const [discountApplied, setDiscountApplied] = useState<{ code: string; percent: number; codeId: string } | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [discountChecking, setDiscountChecking] = useState(false);

  // Shareable product links
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const didDeepLink = useRef(false);

  useEffect(() => {
    setMember(getMemberData());
    fetchProducts();
    fetchInventory();
    fetchWishlist();
  }, []);

  async function fetchWishlist() {
    const m = getMemberData();
    if (!m?.email) return;
    const { data } = await supabase.from('wishlist').select('product_id').eq('member_email', m.email);
    setWishlistIds(new Set((data || []).map((w: any) => w.product_id)));
  }

  const toggleWishlist = async (p: Product) => {
    if (!isRegistered() || !member) { window.location.href = '/register'; return; }
    const has = wishlistIds.has(p.id);
    if (has) {
      await supabase.from('wishlist').delete().eq('member_email', member.email).eq('product_id', p.id);
      setWishlistIds(prev => { const next = new Set(prev); next.delete(p.id); return next; });
    } else {
      await supabase.from('wishlist').insert({ member_email: member.email, product_id: p.id });
      setWishlistIds(prev => new Set(prev).add(p.id));
    }
  };

  const TIER_ORDER: Record<string, number> = { non_member: 0, member: 1, season_3rd: 2, season_2nd: 3, season_1st: 4, hall_of_fame: 5 };

  const applyDiscountCode = async () => {
    if (!discountInput.trim() || !member) return;
    setDiscountChecking(true); setDiscountError('');
    try {
      const { data: code } = await supabase.from('discount_codes').select('*').eq('code', discountInput.trim().toUpperCase()).single();
      if (!code) { setDiscountError('Invalid code.'); setDiscountChecking(false); return; }
      const now = Date.now();
      if (new Date(code.valid_from).getTime() > now || new Date(code.valid_until).getTime() < now) {
        setDiscountError('This code has expired.'); setDiscountChecking(false); return;
      }
      if (code.max_uses != null && code.uses_count >= code.max_uses) {
        setDiscountError('This code has reached its usage limit.'); setDiscountChecking(false); return;
      }
      if (code.min_tier) {
        const { data: m } = await supabase.from('members').select('loyalty_tier').eq('email', member.email).single();
        const memberTierRank = TIER_ORDER[m?.loyalty_tier || 'member'] ?? 1;
        const requiredRank = TIER_ORDER[code.min_tier] ?? 0;
        if (memberTierRank < requiredRank) { setDiscountError(`This code requires ${code.min_tier.replace('_', ' ')} tier or higher.`); setDiscountChecking(false); return; }
      }
      const { data: already } = await supabase.from('discount_code_redemptions').select('id').eq('code_id', code.id).eq('member_email', member.email).single();
      if (already) { setDiscountError("You've already used this code."); setDiscountChecking(false); return; }
      setDiscountApplied({ code: code.code, percent: Number(code.percent_off), codeId: code.id });
    } catch { setDiscountError('Invalid code.'); }
    setDiscountChecking(false);
  };

  // Deep-link: /shop?product=<id> scrolls to and highlights that card
  useEffect(() => {
    if (didDeepLink.current || loading || products.length === 0) return;
    const pid = new URLSearchParams(window.location.search).get('product');
    if (pid) {
      didDeepLink.current = true;
      setTimeout(() => {
        const el = document.getElementById(`product-${pid}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightId(pid);
          setTimeout(() => setHighlightId(null), 2500);
        }
      }, 300);
    }
  }, [loading, products]);

  const shareProduct = (p: Product) => {
    const url = `${window.location.origin}/shop?product=${p.id}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  async function fetchProducts() {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: true });
    setProducts(data || []);
    setLoading(false);
  }

  async function fetchInventory() {
    const { data } = await supabase.from('shop_inventory').select('*').eq('id', 1).single();
    if (data) setGlobalCaseStock(data.case_stock ?? 0);
  }

  const filtered = filter === 'all' ? products : products.filter(p => p.status === filter);
  const collectors = products.filter(p => p.status === 'limited');

  const openModal = (p: Product, variantKey: string) => {
    if (!isRegistered()) { window.location.href = '/register'; return; }
    if (!isVariantAvailable(p, variantKey, globalCaseStock)) return;
    setSelected(p); setSelectedVariant(variantKey); setStep('confirm');
    setOrderId(''); setPayRef(''); setProofFile(null); setProofPreview(null); setError('');
    setPaymentOption('deposit');
    setDiscountInput(''); setDiscountApplied(null); setDiscountError('');
  };

  const openPreorder = (p: Product, variantKey: string) => {
    if (!isRegistered()) { window.location.href = '/register'; return; }
    setPreorderTarget({ product: p, variantKey });
    setPreorderDone(false);
  };

  const sendPreorder = async () => {
    if (!preorderTarget || !member) return;
    setPreorderSending(true);
    try {
      await supabase.from('preorders').insert({
        product_id: preorderTarget.product.id,
        product_name: preorderTarget.product.name,
        variant: preorderTarget.variantKey,
        member_email: member.email,
        member_name: member.name || member.email,
        status: 'pending',
      });
      setPreorderDone(true);
    } catch { /* swallow — show generic done state regardless to avoid blocking the customer */ setPreorderDone(true); }
    setPreorderSending(false);
  };

  const placeOrder = async () => {
    if (!selected || !member) return;
    setUploading(true); setError('');
    const v = VARIANTS.find(x => x.key === selectedVariant)!;
    const rawPrice = variantPricing(selected, selectedVariant).price;
    const price = discountApplied ? Math.round(rawPrice * (1 - discountApplied.percent / 100)) : rawPrice;
    try {
      const depositAmount = Math.ceil(price / 2);
      const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email;
      const { data, error: err } = await supabase.from('orders').insert({
        member_email: member.email,
        member_name: memberName,
        product_name: `${selected.name} (${v.label})`,
        chassis: selected.chassis,
        type: v.isBuilt ? 'built' : 'boxed',
        variant: selectedVariant,
        quantity: 1,
        status: 'pending',
        payment_status: 'awaiting_payment',
        spend_amount_dkk: price,
        notes: (discountApplied ? `Code ${discountApplied.code} applied (-${discountApplied.percent}%). ` : '') + (paymentOption === 'deposit'
          ? `50% Deposit: ${depositAmount} DKK (Remaining: ${price - depositAmount} DKK on pickup)`
          : `Full Payment: ${price} DKK`),
      }).select().single();
      if (err || !data) throw new Error('failed');

      if (discountApplied) {
        await supabase.from('discount_code_redemptions').insert({ code_id: discountApplied.codeId, member_email: member.email, order_id: data.id });
        const { data: codeRow } = await supabase.from('discount_codes').select('uses_count').eq('id', discountApplied.codeId).single();
        await supabase.from('discount_codes').update({ uses_count: (codeRow?.uses_count || 0) + 1 }).eq('id', discountApplied.codeId);
      }

      // Decrement the correct stock pool(s)
      const stockUpdate: any = v.isBuilt
        ? { built_stock: Math.max(0, (selected.built_stock ?? 1) - 1) }
        : { unbuilt_stock: Math.max(0, (selected.unbuilt_stock ?? 1) - 1) };
      await supabase.from('products').update(stockUpdate).eq('id', selected.id);
      setProducts(prev => prev.map(p => p.id === selected.id ? { ...p, ...stockUpdate } : p));

      if (v.needsCase) {
        const newCaseStock = Math.max(0, (globalCaseStock ?? 0) - 1);
        await supabase.from('shop_inventory').update({ case_stock: newCaseStock }).eq('id', 1);
        setGlobalCaseStock(newCaseStock);
      }

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
  const modalPricing = selected ? variantPricing(selected, selectedVariant) : { price: 0, original: null };
  const rawModalPrice = modalPricing.price;
  const modalPrice = discountApplied ? Math.round(rawModalPrice * (1 - discountApplied.percent / 100)) : rawModalPrice;

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>

        {/* Header */}
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(220,38,38,0.15)', padding: '48px 24px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>PREORDER SHOP</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(36px, 8vw, 72px)', color: '#F5F5F5', margin: '0 0 10px', lineHeight: 0.95 }}>MINI 4WD CARS & KITS</h1>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', margin: '0 0 10px', maxWidth: 560 }}>Preorder only — no online payment. Pay via MobilePay after reserving. Pickup in Nuuk, Greenland.</p>
            <div style={{ ...FB, fontSize: 12, color: '#6B7280' }}>📦 Display cases in stock: <strong style={{ color: globalCaseStock > 0 ? '#22C55E' : '#DC2626' }}>{globalCaseStock}</strong> (shared across all models)</div>
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
                {collectors.map(p => {
                  const best = cheapestAvailableVariant(p, globalCaseStock);
                  return (
                    <div key={p.id} id={`product-${p.id}`} style={{ background: 'linear-gradient(135deg, #0a0f1a, #071426)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 18, padding: 20, position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.3s', boxShadow: highlightId === p.id ? '0 0 0 3px #DC2626, 0 0 24px rgba(220,38,38,0.5)' : 'none' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #FACC15, transparent)' }} />
                      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'flex', gap: 6 }}>
                        <button onClick={() => toggleWishlist(p)} title="Save to wishlist"
                          style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 9px', fontSize: 12, color: wishlistIds.has(p.id) ? '#DC2626' : '#fff', cursor: 'pointer' }}>
                          {wishlistIds.has(p.id) ? '♥' : '♡'}
                        </button>
                        <button onClick={() => shareProduct(p)} title="Copy share link"
                          style={{ background: copiedId === p.id ? '#22C55E' : 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 10px', ...F, fontSize: 10, letterSpacing: 1, color: '#fff', cursor: 'pointer' }}>
                          {copiedId === p.id ? '✓ COPIED' : '🔗 SHARE'}
                        </button>
                      </div>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#FACC15', marginBottom: 4 }}>✦ COLLECTOR · LIMITED</div>
                      <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <ProductImage product={p} onClick={() => setLightbox(p)} />
                      </div>
                      <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 4, lineHeight: 1.1 }}>{p.name}</div>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', marginBottom: 12 }}>{p.chassis} CHASSIS</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ ...F, fontSize: 9, letterSpacing: 3, color: '#FACC15' }}>FROM</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            {best?.original && <span style={{ ...FB, fontSize: 13, color: '#6B7280', textDecoration: 'line-through' }}>{best.original.toLocaleString()}</span>}
                            <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#FACC15' }}>{(best ? best.price : variantPricing(p, 'unbuilt').price).toLocaleString()} kr</div>
                          </div>
                        </div>
                        {best ? (
                          <button onClick={() => openModal(p, best.key)} style={{ background: '#FACC15', color: '#050505', border: 'none', borderRadius: 8, padding: '9px 18px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>RESERVE</button>
                        ) : (
                          <button onClick={() => openPreorder(p, 'unbuilt')} style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '9px 18px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>PREORDER</button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏎️</div>
              <div style={{ ...FB, fontSize: 14 }}>No products in this category yet.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {filtered.map(p => {
                const sc = STOCK_COLORS[p.status] || '#6B7280';
                const isCollector = p.status === 'limited';
                return (
                  <div key={p.id} id={`product-${p.id}`}
                    style={{ background: isCollector ? 'linear-gradient(135deg, #0a0f1a, #071426)' : '#071426', border: `1px solid ${isCollector ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.3s', boxShadow: highlightId === p.id ? '0 0 0 3px #DC2626, 0 0 24px rgba(220,38,38,0.5)' : 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = isCollector ? 'rgba(250,204,21,0.5)' : 'rgba(220,38,38,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isCollector ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    {isCollector && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #FACC15, transparent)', zIndex: 1 }} />}
                    {p.status === 'preorder only' && <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 20, background: '#3B82F622', color: '#3B82F6', border: '1px solid #3B82F644' }}>PREORDER</div>}
                    {isCollector && <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 20, background: '#FACC1522', color: '#FACC15', border: '1px solid #FACC1544' }}>COLLECTOR</div>}
                    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleWishlist(p)} title="Save to wishlist"
                        style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 9px', fontSize: 12, color: wishlistIds.has(p.id) ? '#DC2626' : '#fff', cursor: 'pointer' }}>
                        {wishlistIds.has(p.id) ? '♥' : '♡'}
                      </button>
                      <button onClick={() => shareProduct(p)} title="Copy share link"
                        style={{ background: copiedId === p.id ? '#22C55E' : 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 10px', ...F, fontSize: 10, letterSpacing: 1, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {copiedId === p.id ? '✓ COPIED' : '🔗 SHARE'}
                      </button>
                    </div>

                    <div style={{ height: 180, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
                      <ProductImage product={p} onClick={() => parseImages(p.image_url).length > 0 && setLightbox(p)} />
                    </div>

                    <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{p.chassis}</span>
                        <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: sc + '18', color: sc }}>● {p.status?.toUpperCase()}</span>
                      </div>
                      <h3 style={{ ...F, fontWeight: 900, fontSize: 19, color: '#F5F5F5', margin: '0 0 6px', lineHeight: 1.1 }}>{p.name}</h3>
                      <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.6, margin: '0 0 14px' }}>{p.description}</p>

                      {/* 4 variant pools — Unbuilt / Unbuilt+Case / Built / Built+Case */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {VARIANTS.map(v => {
                          const available = isVariantAvailable(p, v.key, globalCaseStock);
                          const { price, original } = variantPricing(p, v.key);
                          return (
                            <div key={v.key} style={{ background: '#050505', border: `1px solid ${available ? 'rgba(255,255,255,0.08)' : 'rgba(220,38,38,0.25)'}`, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ ...F, fontSize: 9, letterSpacing: 1, color: '#B8C1CC' }}>{v.icon} {v.label.toUpperCase()}</div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
                                {original && <span style={{ ...FB, fontSize: 11, color: '#6B7280', textDecoration: 'line-through' }}>{original.toLocaleString()}</span>}
                                <div style={{ ...F, fontWeight: 900, fontSize: 15, color: available ? (original ? '#22C55E' : (isCollector ? '#FACC15' : '#F5F5F5')) : '#6B7280' }}>{price.toLocaleString()} kr</div>
                              </div>
                              {available ? (
                                <button onClick={() => openModal(p, v.key)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 0', ...F, fontWeight: 700, fontSize: 10, letterSpacing: 1, cursor: 'pointer' }}>RESERVE</button>
                              ) : (
                                <>
                                  <div style={{ ...F, fontSize: 9, letterSpacing: 1, color: '#DC2626', fontWeight: 700 }}>SOLD OUT</div>
                                  <button onClick={() => openPreorder(p, v.key)} style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '6px 0', ...F, fontWeight: 700, fontSize: 10, letterSpacing: 1, cursor: 'pointer' }}>PREORDER</button>
                                </>
                              )}
                            </div>
                          );
                        })}
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

      {/* LIGHTBOX */}
      {lightbox && <Lightbox product={lightbox} onClose={() => setLightbox(null)} />}

      {/* RESERVE MODAL */}
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
                    <div style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC', margin: '4px 0 12px' }}>
                      {VARIANTS.find(v => v.key === selectedVariant)?.shortLabel} · {selected.chassis}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      {modalPricing.original && <span style={{ ...FB, fontSize: 16, color: '#6B7280', textDecoration: 'line-through' }}>{modalPricing.original.toLocaleString()} DKK</span>}
                      <div style={{ ...F, fontWeight: 900, fontSize: 32, color: modalPricing.original ? '#22C55E' : '#FACC15' }}>{modalPrice.toLocaleString()} DKK</div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 12, padding: 16 }}>
                    <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#FACC15', marginBottom: 12 }}>💳 PAYMENT OPTION</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div onClick={() => setPaymentOption('deposit')} style={{ background: paymentOption === 'deposit' ? 'rgba(250,204,21,0.1)' : '#050505', border: `1.5px solid ${paymentOption === 'deposit' ? '#FACC15' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#F5F5F5' }}>50% DEPOSIT NOW</div>
                            <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 2 }}>Pay the rest on pickup · Recommended</div>
                          </div>
                          <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#FACC15' }}>{Math.ceil(modalPrice / 2)} DKK</div>
                        </div>
                      </div>
                      <div onClick={() => setPaymentOption('full')} style={{ background: paymentOption === 'full' ? 'rgba(34,197,94,0.08)' : '#050505', border: `1.5px solid ${paymentOption === 'full' ? '#22C55E' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#F5F5F5' }}>FULL PAYMENT NOW</div>
                            <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 2 }}>Pay in full upfront · No balance on pickup</div>
                          </div>
                          <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#22C55E' }}>{modalPrice} DKK</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {VARIANTS.find(v => v.key === selectedVariant)?.isBuilt && (
                    <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: 14, ...FB, fontSize: 13, color: '#FCA5A5', lineHeight: 1.6 }}>
                      ⚡ <strong style={{ color: '#fff' }}>Race-Ready Car:</strong> This is a fully assembled and tuned Mini 4WD — no building required. Open the box and race immediately.
                    </div>
                  )}

                  {/* Discount code */}
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
                    {discountApplied ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ ...FB, fontSize: 13, color: '#22C55E' }}>✓ Code <strong>{discountApplied.code}</strong> applied — {discountApplied.percent}% off</div>
                        <button onClick={() => { setDiscountApplied(null); setDiscountInput(''); }} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 12, cursor: 'pointer' }}>Remove</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={discountInput} onChange={e => setDiscountInput(e.target.value)} placeholder="Discount code (optional)"
                          style={{ flex: 1, background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#F5F5F5', ...FB, fontSize: 13, outline: 'none' }} />
                        <button onClick={applyDiscountCode} disabled={discountChecking || !discountInput.trim()}
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, color: '#F5F5F5', cursor: 'pointer', opacity: discountChecking ? 0.6 : 1 }}>
                          {discountChecking ? '...' : 'APPLY'}
                        </button>
                      </div>
                    )}
                    {discountError && <div style={{ ...FB, fontSize: 12, color: '#DC2626', marginTop: 8 }}>{discountError}</div>}
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
                      <li>Send <strong>{paymentOption === 'deposit' ? Math.ceil(modalPrice / 2) : modalPrice} DKK</strong> to <strong>+45 54 32 79 41</strong> (Jovannie Ducay)</li>
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
                  <a href="/profile?tab=orders" style={{ display: 'block', background: '#DC2626', color: '#fff', borderRadius: 12, padding: '15px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, textDecoration: 'none' }}>VIEW MY ORDERS →</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK PREORDER MODAL (sold-out variant) */}
      {preorderTarget && (
        <div onClick={() => setPreorderTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 440, padding: '28px 24px 36px' }}>
            {!preorderDone ? (
              <>
                <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#3B82F6', marginBottom: 6 }}>PREORDER REQUEST</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 4 }}>{preorderTarget.product.name}</div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 20 }}>{VARIANTS.find(v => v.key === preorderTarget.variantKey)?.label} — currently sold out</div>
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: 14, ...FB, fontSize: 13, color: '#93C5FD', marginBottom: 20 }}>
                  We'll notify you the moment this is back in stock. No payment needed now.
                </div>
                <button onClick={sendPreorder} disabled={preorderSending} style={{ width: '100%', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 12, padding: 15, ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer', opacity: preorderSending ? 0.5 : 1 }}>
                  {preorderSending ? 'SENDING...' : 'NOTIFY ME →'}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', marginBottom: 8 }}>REQUEST SENT!</div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 20 }}>We'll reach out by email when it's available.</div>
                <button onClick={() => setPreorderTarget(null)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5', cursor: 'pointer' }}>CLOSE</button>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}