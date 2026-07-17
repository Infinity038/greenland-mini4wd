// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { getMemberData, isRegistered, generatePaymentRef } from '@/lib/member';
import { supabase } from '@/lib/supabase';
import { readCachedProducts } from '@/lib/productCache';
import { resilientCatalogFetch } from '@/lib/resilientCatalogFetch';
import { parseImages } from '@/lib/images';
import { ProductImage as SharedProductImage } from '@/components/ProductImage';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { DEFAULT_SERVICE_ADDONS, BUILD_TO_ORDER_MESSAGE, type ServiceAddOnId } from '@/lib/pricing/serviceAddOns';
import { calculateBoxedKitOrderTotal } from '@/lib/pricing/boxedKit';
import { getPublicCatalogByCategory, getDisplayCaseCatalogItem, SHOP_GROUP_LABEL, type PublicCatalogItem, type ShopGroup } from '@/lib/pricing/catalogProducts';
import { DISPLAY_CASE_STANDALONE_PRICE_DKK, DISPLAY_CASE_BUNDLED_PRICE_DKK, DISPLAY_CASE_BUNDLE_SAVING_DKK } from '@/lib/pricing/displayCase';
import { restockInterestStore, type ContactPreference } from '@/lib/pricing/restockInterest';

// Adapts a curated-catalog item into the existing Supabase-order-shaped
// Product type so the (unchanged) Reserve/order-placement modal below can
// keep working unmodified for the rare item that is actually purchasable
// (publicState IN_STOCK/PREORDER) — currently none of the 117 curated
// records have real stock yet, so this path is dormant but future-proof.
function toShopProduct(item: PublicCatalogItem): Product {
  const r = item.raw;
  return {
    id: r.id,
    name: r.name,
    item_no: r.item_no,
    category: r.category,
    subcategory: r.subcategory,
    chassis: r.chassis,
    price_dkk: item.priceDkk ?? 0,
    original_price_dkk: r.original_price_dkk || undefined,
    stock_qty: r.stock_qty,
    unbuilt_stock: r.stock_qty,
    built_stock: 0,
    status: r.status,
    is_collectors_vault: r.is_collectors_vault,
    description: r.description,
    image_url: r.image_url,
  };
}

// `_version` forces callers to recompute after a restock-interest submission
// (see restockVersion state below) — the store is a plain mutable class, not
// React state, so reading it during render alone won't trigger a re-render.
function restockInterestCount(productId: string, version: number): number {
  void version;
  return restockInterestStore.countForProduct(productId);
}

const CATALOG_CACHE_KEY = 'shop_products';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

type ModalStep = 'confirm' | 'payment' | 'upload' | 'done';
type ShopTab = 'cars' | 'parts' | 'accessories' | 'merchandise';

interface Product {
  id: string;
  name: string;
  item_no?: string;
  category: string;
  subcategory?: string;
  chassis: string;
  price_dkk: number;
  original_price_dkk?: number;
  stock_qty: number;
  unbuilt_stock?: number;
  built_stock?: number;
  status: string;
  is_collectors_vault?: boolean;
  description: string;
  image_url: string;
}

// Boxed-kit-only sale structure (docs/ASSEMBLY-SERVICE-WORKFLOW.md): every
// car is a single saleable SKU, the Boxed Kit. Display Case, Standard
// Assembly and Ready-to-Race Assembly are add-on services selected in the
// order modal (see AddOnPicker below) — they are never separate stock
// variants and never create a second "built" SKU. `unbuilt_stock` remains
// the live schema's stock column for the boxed kit; `built_stock` is no
// longer read or written by this page.
function boxedKitAvailable(p: Product): boolean {
  if (p.status === 'sold out' || p.status === 'coming soon') return false;
  return (p.unbuilt_stock ?? 1) > 0;
}

function boxedKitPricing(p: Product): { price: number; original: number | null } {
  const price = p.price_dkk || 0;
  const original = p.original_price_dkk && p.original_price_dkk > price ? p.original_price_dkk : null;
  return { price, original };
}

const ADD_ON_ORDER: ServiceAddOnId[] = ['display_case', 'standard_assembly', 'ready_to_race_assembly'];

// Simple (non-car) availability + pricing — parts & merchandise use a flat price_dkk
// and a single stock_qty pool instead of the 4-variant unbuilt/built system.
function isSimpleAvailable(p: Product): boolean {
  return p.status !== 'sold out' && p.status !== 'coming soon' && (p.stock_qty ?? 0) > 0;
}
function simplePricing(p: Product): { price: number; original: number | null } {
  const price = p.price_dkk || 0;
  const original = p.original_price_dkk && p.original_price_dkk > price ? p.original_price_dkk : null;
  return { price, original };
}

const FILTER_TABS = [
  { key: 'all', label: 'All Products' },
  { key: 'in stock', label: 'In Stock' },
  { key: 'preorder only', label: 'Preorder' },
];

// Matches the exact chassis strings used in catalog/bmax-initial-catalog.json
// (was previously 'Super II' with a space — never matched the catalog's
// 'Super-II', silently hiding every Super-II car from the chassis filter).
const CHASSIS_FILTERS = ['AR', 'FM-A', 'VZ', 'MA', 'MS', 'Super-II', 'Super TZ-X'];
const PARTS_SUBCATEGORIES = ['Bearings', 'Brakes/Dampers', 'Chassis', 'Shafts/Gears', 'Motors', 'Plates', 'Rollers/Stabilizers', 'Screws/Nuts', 'Wheels/Tires', 'Accessories'];

function ProductImage({ product, onClick }: { product: Product; onClick?: () => void }) {
  return (
    <SharedProductImage
      imageUrl={product.image_url}
      name={product.name}
      category={product.category}
      itemNo={product.item_no}
      chassis={product.chassis || product.subcategory}
      onClick={onClick}
    />
  );
}

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

// Shared card for PARTS & MERCHANDISE — flat price, single stock pool, no variant grid
function SimpleProductCard({ p, wishlistIds, toggleWishlist, shareProduct, copiedId, openModal, openPreorder, setLightbox, highlightId }: any) {
  const available = isSimpleAvailable(p);
  const { price, original } = simplePricing(p);
  return (
    <div id={`product-${p.id}`} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: highlightId === p.id ? '0 0 0 3px #DC2626, 0 0 24px rgba(220,38,38,0.5)' : 'none' }}>
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'flex', gap: 6 }}>
        <button onClick={() => toggleWishlist(p)} style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 9px', fontSize: 12, color: wishlistIds.has(p.id) ? '#DC2626' : '#fff', cursor: 'pointer' }}>{wishlistIds.has(p.id) ? '♥' : '♡'}</button>
        <button onClick={() => shareProduct(p)} style={{ background: copiedId === p.id ? '#22C55E' : 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 10px', ...F, fontSize: 10, letterSpacing: 1, color: '#fff', cursor: 'pointer' }}>{copiedId === p.id ? '✓ COPIED' : '🔗 SHARE'}</button>
      </div>
      <div style={{ height: 160, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <ProductImage product={p} onClick={() => parseImages(p.image_url).length > 0 && setLightbox(p)} />
      </div>
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {p.subcategory && <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{p.subcategory}</span>}
          {p.item_no && <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#FACC15' }}>#{p.item_no}</span>}
        </div>
        <h3 style={{ ...F, fontWeight: 900, fontSize: 16, color: '#F5F5F5', margin: '0 0 6px' }}>{p.name}</h3>
        <p style={{ ...FB, fontSize: 12, color: '#B8C1CC', lineHeight: 1.5, margin: '0 0 14px', flex: 1 }}>{p.description}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          {original && <span style={{ ...FB, fontSize: 13, color: '#6B7280', textDecoration: 'line-through' }}>{original.toLocaleString()}</span>}
          <div style={{ ...F, fontWeight: 900, fontSize: 20, color: original ? '#22C55E' : '#FACC15' }}>{price.toLocaleString()} kr</div>
        </div>
        {available ? (
          <button onClick={() => openModal(p)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>RESERVE</button>
        ) : (
          <>
            <div style={{ ...F, fontSize: 11, letterSpacing: 1, color: '#DC2626', fontWeight: 700, marginBottom: 6 }}>SOLD OUT</div>
            <button onClick={() => openPreorder(p)} style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '10px 0', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>PREORDER</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [member, setMember] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>(() => readCachedProducts<Product>(CATALOG_CACHE_KEY)?.data ?? []);
  const [loading, setLoading] = useState(() => readCachedProducts<Product>(CATALOG_CACHE_KEY) === null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [globalCaseStock, setGlobalCaseStock] = useState(0);

  const [shopTab, setShopTab] = useState<ShopTab>('cars');
  const [shopGroupFilter, setShopGroupFilter] = useState<ShopGroup | ''>('');
  const [chassisFilter, setChassisFilter] = useState('');
  const [partsFilter, setPartsFilter] = useState('');
  const [merchFilter, setMerchFilter] = useState('');
  const [carsSearch, setCarsSearch] = useState('');
  const [partsSearch, setPartsSearch] = useState('');
  const [merchSearch, setMerchSearch] = useState('');
  const didInitFromUrl = useRef(false);

  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<ServiceAddOnId[]>([]);
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

  const [preorderTarget, setPreorderTarget] = useState<{ product: Product } | null>(null);
  const [preorderSending, setPreorderSending] = useState(false);
  const [preorderDone, setPreorderDone] = useState(false);

  // REQUEST RESTOCK / NOTIFY ME / REGISTER INTEREST — Preview-safe, mock
  // in-memory store only (lib/pricing/restockInterest.ts). Never creates an
  // order, reserves stock, or writes to Supabase.
  const [restockTarget, setRestockTarget] = useState<PublicCatalogItem | null>(null);
  const [restockContact, setRestockContact] = useState<ContactPreference>('email');
  const [restockQuantity, setRestockQuantity] = useState(1);
  const [restockSending, setRestockSending] = useState(false);
  const [restockDone, setRestockDone] = useState(false);
  const [restockVersion, setRestockVersion] = useState(0); // bump to re-render interest counts

  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  const [discountInput, setDiscountInput] = useState('');
  const [discountApplied, setDiscountApplied] = useState<{ code: string; percent: number; codeId: string } | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [discountChecking, setDiscountChecking] = useState(false);

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const didDeepLink = useRef(false);

  useEffect(() => {
    setMember(getMemberData());
    fetchProducts();
    fetchInventory();
    fetchWishlist();
  }, []);

  // Read ?tab= and ?filter= from URL once on first load (homepage deep-links land here)
  useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const flt = params.get('filter');
    if (tab === 'parts' || tab === 'merchandise' || tab === 'cars') setShopTab(tab as ShopTab);
    if (flt) {
      if (tab === 'parts') setPartsFilter(flt);
      else if (tab === 'merchandise') setMerchFilter(flt);
      else setChassisFilter(flt);
    }
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
    if (!readCachedProducts<Product>(CATALOG_CACHE_KEY)) setLoading(true);
    const { data, error } = await resilientCatalogFetch<Product>(CATALOG_CACHE_KEY, () =>
      supabase.from('products').select('*').order('created_at', { ascending: true })
    );
    setProducts(data);
    setCatalogError(error);
    setLoading(false);
  }

  async function fetchInventory() {
    const { data } = await supabase.from('shop_inventory').select('*').eq('id', 1).single();
    if (data) setGlobalCaseStock(data.case_stock ?? 0);
  }

  const isCarProduct = (p: Product) => !p.category || p.category === 'cars';

  // The complete curated catalog (docs/CATALOG-COSTING-AND-FREIGHT.md) —
  // static/bundled, no Supabase dependency, no loading state needed. Every
  // one of the 117 records is publicly visible regardless of stock/price/tier.
  const catalogCars = getPublicCatalogByCategory('cars');
  const catalogParts = getPublicCatalogByCategory('parts');
  const displayCase = getDisplayCaseCatalogItem();

  // Unlike every other catalog-JSON item, the display case's real
  // availability comes from the LIVE shop_inventory.case_stock (the same
  // shared pool the car-order modal's Display Case add-on already reads),
  // not the static catalog's stock_qty — so this adapter is built here,
  // inside the component, where globalCaseStock is in scope.
  const toDisplayCaseProduct = (): Product => {
    const r = displayCase!.raw;
    return {
      id: r.id,
      name: r.name,
      item_no: '',
      category: r.category,
      subcategory: r.subcategory,
      chassis: '',
      price_dkk: DISPLAY_CASE_STANDALONE_PRICE_DKK,
      stock_qty: globalCaseStock,
      status: globalCaseStock > 0 ? 'in stock' : 'sold out',
      is_collectors_vault: false,
      description: r.description,
      image_url: r.image_url,
    };
  };

  const STATE_FILTER_MAP: Record<string, string | null> = { all: null, 'in stock': 'IN_STOCK', 'preorder only': 'PREORDER' };
  const CAR_SHOP_GROUPS: ShopGroup[] = ['beginner_basic', 'official_starter_pack', 'advanced_bmax', 'collector_limited', 'coming_soon_greenland'];
  const carsFiltered = catalogCars.filter(item => {
    const wantedState = STATE_FILTER_MAP[filter];
    const matchesStatus = !wantedState || item.publicState === wantedState;
    const matchesChassis = !chassisFilter || item.raw.chassis === chassisFilter;
    const matchesShopGroup = !shopGroupFilter || item.shopGroup === shopGroupFilter;
    const q = carsSearch.trim().toLowerCase();
    const matchesSearch = !q || item.raw.name.toLowerCase().includes(q) || item.raw.item_no.toLowerCase().includes(q);
    return matchesStatus && matchesChassis && matchesShopGroup && matchesSearch;
  });
  const collectors = catalogCars.filter(item => item.raw.is_collectors_vault);

  const partsFiltered = catalogParts.filter(item => {
    const matchesSub = !partsFilter || item.raw.subcategory === partsFilter;
    const q = partsSearch.trim().toLowerCase();
    const matchesSearch = !q || item.raw.name.toLowerCase().includes(q) || item.raw.item_no.toLowerCase().includes(q);
    return matchesSub && matchesSearch;
  });

  const merchProducts = products.filter(p => p.category === 'merchandise');
  const merchSubcats = Array.from(new Set(merchProducts.map(p => p.subcategory).filter(Boolean))) as string[];
  const merchFiltered = merchProducts.filter(p => {
    const matchesSub = !merchFilter || p.subcategory === merchFilter;
    const q = merchSearch.trim().toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.item_no || '').toLowerCase().includes(q);
    return matchesSub && matchesSearch;
  });

  const openModal = (p: Product) => {
    if (!isRegistered()) { window.location.href = '/register'; return; }
    if (isCarProduct(p)) {
      if (!boxedKitAvailable(p)) return;
    } else {
      if (!isSimpleAvailable(p)) return;
    }
    setSelected(p); setSelectedAddOns([]); setStep('confirm');
    setOrderId(''); setPayRef(''); setProofFile(null); setProofPreview(null); setError('');
    setPaymentOption('deposit');
    setDiscountInput(''); setDiscountApplied(null); setDiscountError('');
  };

  const openPreorder = (p: Product) => {
    if (!isRegistered()) { window.location.href = '/register'; return; }
    setPreorderTarget({ product: p });
    setPreorderDone(false);
  };

  const sendPreorder = async () => {
    if (!preorderTarget || !member) return;
    setPreorderSending(true);
    try {
      await supabase.from('preorders').insert({
        product_id: preorderTarget.product.id,
        product_name: preorderTarget.product.name,
        variant: 'boxed_kit',
        member_email: member.email,
        member_name: member.name || member.email,
        status: 'pending',
      });
      setPreorderDone(true);
    } catch { setPreorderDone(true); }
    setPreorderSending(false);
  };

  const openRestockInterest = (item: PublicCatalogItem) => {
    if (!isRegistered()) { window.location.href = '/register'; return; }
    setRestockTarget(item);
    setRestockContact('email');
    setRestockQuantity(1);
    setRestockDone(false);
  };

  const submitRestockInterest = () => {
    if (!restockTarget || !member) return;
    setRestockSending(true);
    restockInterestStore.submit({
      productId: restockTarget.raw.id,
      itemNo: restockTarget.raw.item_no,
      racerId: member.email ?? null,
      contactPreference: restockContact,
      requestedQuantity: restockQuantity,
    });
    setRestockVersion(v => v + 1);
    setRestockDone(true);
    setRestockSending(false);
  };

  // Display Case is independent; Standard Assembly and Ready-to-Race
  // Assembly are mutually exclusive (one build service per order, not both).
  const toggleAddOn = (addOn: ServiceAddOnId) => {
    setSelectedAddOns(prev => {
      if (prev.includes(addOn)) return prev.filter(a => a !== addOn);
      if (addOn === 'standard_assembly' || addOn === 'ready_to_race_assembly') {
        return [...prev.filter(a => a !== 'standard_assembly' && a !== 'ready_to_race_assembly'), addOn];
      }
      return [...prev, addOn];
    });
  };

  const placeOrder = async () => {
    if (!selected || !member) return;
    setUploading(true); setError('');
    const isCar = isCarProduct(selected);
    const addOnsForOrder = isCar && FEATURE_FLAGS.assemblyServicesEnabled ? selectedAddOns : [];
    const boxedKitTotal = isCar
      ? calculateBoxedKitOrderTotal(Math.round(boxedKitPricing(selected).price * 100), { productId: selected.id, addOns: addOnsForOrder })
      : null;
    const rawPrice = isCar ? (boxedKitTotal!.totalOre / 100) : simplePricing(selected).price;
    const price = discountApplied ? Math.round(rawPrice * (1 - discountApplied.percent / 100)) : rawPrice;
    try {
      const depositAmount = Math.ceil(price / 2);
      const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email;
      const addOnLabels = boxedKitTotal?.addOnLines.map(l => l.label) ?? [];
      const productLabel = isCar
        ? `${selected.name} (Boxed Kit${addOnLabels.length ? ` + ${addOnLabels.join(' + ')}` : ''})`
        : selected.name;
      const { data, error: err } = await supabase.from('orders').insert({
        member_email: member.email,
        member_name: memberName,
        product_name: productLabel,
        chassis: selected.chassis || null,
        type: isCar ? 'boxed' : selected.category,
        variant: isCar ? (addOnsForOrder.join(',') || 'none') : 'standard',
        quantity: 1,
        status: 'pending',
        payment_status: 'awaiting_payment',
        spend_amount_dkk: price,
        notes: (discountApplied ? `Code ${discountApplied.code} applied (-${discountApplied.percent}%). ` : '')
          + (boxedKitTotal?.requiresAssembly ? `${BUILD_TO_ORDER_MESSAGE} ` : '')
          + (paymentOption === 'deposit'
            ? `50% Deposit: ${depositAmount} DKK (Remaining: ${price - depositAmount} DKK on pickup)`
            : `Full Payment: ${price} DKK`),
      }).select().single();
      if (err || !data) throw new Error('failed');

      if (discountApplied) {
        await supabase.from('discount_code_redemptions').insert({ code_id: discountApplied.codeId, member_email: member.email, order_id: data.id });
        const { data: codeRow } = await supabase.from('discount_codes').select('uses_count').eq('id', discountApplied.codeId).single();
        await supabase.from('discount_codes').update({ uses_count: (codeRow?.uses_count || 0) + 1 }).eq('id', discountApplied.codeId);
      }

      if (isCar) {
        // Only the Boxed Kit stock count is ever reduced — assembly is a
        // service, never a second "built" SKU (docs/ASSEMBLY-SERVICE-WORKFLOW.md).
        const newKitStock = Math.max(0, (selected.unbuilt_stock ?? 1) - 1);
        await supabase.from('products').update({ unbuilt_stock: newKitStock }).eq('id', selected.id);
        setProducts(prev => prev.map(p => p.id === selected.id ? { ...p, unbuilt_stock: newKitStock } : p));

        // Display Case stock is tracked separately from kit stock.
        if (addOnsForOrder.includes('display_case')) {
          const newCaseStock = Math.max(0, (globalCaseStock ?? 0) - 1);
          await supabase.from('shop_inventory').update({ case_stock: newCaseStock }).eq('id', 1);
          setGlobalCaseStock(newCaseStock);
        }
      } else if (selected.id === 'display-case') {
        // Standalone case purchase — deducts from the SAME shared pool a
        // car-plus-case order deducts from (shop_inventory.case_stock), per
        // "shared inventory across all cars, never a per-car SKU."
        const newCaseStock = Math.max(0, (globalCaseStock ?? 0) - 1);
        await supabase.from('shop_inventory').update({ case_stock: newCaseStock }).eq('id', 1);
        setGlobalCaseStock(newCaseStock);
      } else {
        const newStock = Math.max(0, (selected.stock_qty ?? 1) - 1);
        await supabase.from('products').update({ stock_qty: newStock }).eq('id', selected.id);
        setProducts(prev => prev.map(p => p.id === selected.id ? { ...p, stock_qty: newStock } : p));
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
  const isSelectedCar = selected ? isCarProduct(selected) : true;
  const activeAddOns = isSelectedCar && FEATURE_FLAGS.assemblyServicesEnabled ? selectedAddOns : [];
  const modalBoxedKitTotal = selected && isSelectedCar
    ? calculateBoxedKitOrderTotal(Math.round(boxedKitPricing(selected).price * 100), { productId: selected.id, addOns: activeAddOns })
    : null;
  const modalPricing = selected
    ? (isSelectedCar ? { price: (modalBoxedKitTotal!.totalOre / 100), original: boxedKitPricing(selected).original } : simplePricing(selected))
    : { price: 0, original: null };
  const rawModalPrice = modalPricing.price;
  const modalPrice = discountApplied ? Math.round(rawModalPrice * (1 - discountApplied.percent / 100)) : rawModalPrice;

  const filterBtn = (active: boolean) => ({
    ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, padding: '8px 14px', borderRadius: 8,
    whiteSpace: 'nowrap' as const, flexShrink: 0, background: active ? '#DC2626' : '#071426',
    color: active ? '#fff' : '#B8C1CC', border: active ? 'none' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
  });
  const searchInputStyle = { width: '100%', maxWidth: 360, background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 13, outline: 'none' } as const;

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>

        <section style={{ background: '#071426', borderBottom: '1px solid rgba(220,38,38,0.15)', padding: '48px 24px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>CLUB SHOP</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(36px, 8vw, 72px)', color: '#F5F5F5', margin: '0 0 10px', lineHeight: 0.95 }}>CARS · PARTS · MERCH</h1>
            <p style={{ ...FB, fontSize: 15, color: '#B8C1CC', margin: '0 0 10px', maxWidth: 560 }}>Preorder only — no online payment. Pay via MobilePay after reserving. Pickup in Nuuk, Greenland.</p>
            <div style={{ ...FB, fontSize: 12, color: '#6B7280' }}>📦 Display cases in stock: <strong style={{ color: globalCaseStock > 0 ? '#22C55E' : '#DC2626' }}>{globalCaseStock}</strong> (shared across all car models)</div>
          </div>
        </section>

        {catalogError && (
          <div style={{ maxWidth: 1100, margin: '16px auto 0', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 10, padding: '12px 16px' }}>
              <span style={{ ...FB, fontSize: 13, color: '#FACC15', flex: 1, minWidth: 200 }}>⚠ {catalogError}</span>
              <button onClick={fetchProducts} style={{ ...F, fontSize: 12, letterSpacing: 1, fontWeight: 700, background: '#FACC15', color: '#050505', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>RETRY</button>
            </div>
          </div>
        )}

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 0' }}>
          <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {(['cars', 'parts', 'accessories', 'merchandise'] as ShopTab[]).map(t => (
              <button key={t} onClick={() => setShopTab(t)}
                style={{ ...F, fontSize: 16, fontWeight: 900, letterSpacing: 1, color: shopTab === t ? '#DC2626' : '#B8C1CC', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px 12px', borderBottom: shopTab === t ? '3px solid #DC2626' : '3px solid transparent' }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── CARS TAB ───────────────────────────────────────────── */}
        {shopTab === 'cars' && collectors.length > 0 && (
          <section style={{ background: 'linear-gradient(135deg, #050505 0%, #0a0f1a 50%, #050505 100%)', borderBottom: '1px solid rgba(250,204,21,0.1)', padding: '40px 24px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#FACC15' }}>🏆 COLLECTOR'S VAULT</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(250,204,21,0.3), transparent)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {collectors.map(item => {
                  const p = item.raw;
                  return (
                    <div key={p.id} id={`product-${p.id}`} style={{ background: 'linear-gradient(135deg, #0a0f1a, #071426)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 18, padding: 20, position: 'relative', overflow: 'hidden', boxShadow: highlightId === p.id ? '0 0 0 3px #DC2626, 0 0 24px rgba(220,38,38,0.5)' : 'none' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #FACC15, transparent)' }} />
                      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'flex', gap: 6 }}>
                        <button onClick={() => shareProduct(p)} style={{ background: copiedId === p.id ? '#22C55E' : 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 10px', ...F, fontSize: 10, letterSpacing: 1, color: '#fff', cursor: 'pointer' }}>{copiedId === p.id ? '✓ COPIED' : '🔗 SHARE'}</button>
                      </div>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#FACC15', marginBottom: 4 }}>✦ COLLECTOR · LIMITED</div>
                      <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <ProductImage product={p} onClick={() => setLightbox(p)} />
                      </div>
                      <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 4, lineHeight: 1.1 }}>{p.name}</div>
                      <div style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', marginBottom: 12 }}>{p.chassis} CHASSIS{p.item_no ? ` · #${p.item_no}` : ''}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ ...F, fontSize: 9, letterSpacing: 3, color: '#FACC15' }}>BOXED KIT</div>
                          {item.priceDkk != null ? (
                            <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#FACC15' }}>{item.priceDkk.toLocaleString()} kr</div>
                          ) : (
                            <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#B8C1CC', letterSpacing: 1 }}>PRICE PENDING</div>
                          )}
                        </div>
                        {item.ctaAction === 'reserve' ? (
                          <button onClick={() => openModal(toShopProduct(item))} style={{ background: '#FACC15', color: '#050505', border: 'none', borderRadius: 8, padding: '9px 18px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>RESERVE</button>
                        ) : item.ctaAction === 'preorder' ? (
                          <button onClick={() => openModal(toShopProduct(item))} style={{ background: '#FACC15', color: '#050505', border: 'none', borderRadius: 8, padding: '9px 18px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>PREORDER</button>
                        ) : (
                          <button onClick={() => openRestockInterest(item)} style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '9px 18px', ...F, fontWeight: 900, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>{item.ctaLabel}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {shopTab === 'cars' && (
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
            <input value={carsSearch} onChange={e => setCarsSearch(e.target.value)} placeholder="Search by name or item no..." style={{ ...searchInputStyle, marginBottom: 20 }} />

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
              <button onClick={() => setShopGroupFilter('')} style={filterBtn(!shopGroupFilter)}>ALL GROUPS</button>
              {CAR_SHOP_GROUPS.map(g => (
                <button key={g} onClick={() => setShopGroupFilter(g)} style={filterBtn(shopGroupFilter === g)}>{SHOP_GROUP_LABEL[g].toUpperCase()}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
              <button onClick={() => setChassisFilter('')} style={filterBtn(!chassisFilter)}>ALL CHASSIS</button>
              {CHASSIS_FILTERS.map(c => (
                <button key={c} onClick={() => setChassisFilter(c)} style={filterBtn(chassisFilter === c)}>{c}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 32 }}>
              {FILTER_TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)}
                  style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, padding: '10px 18px', border: filter === tab.key ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: 10, background: filter === tab.key ? '#DC2626' : '#071426', color: filter === tab.key ? '#fff' : '#B8C1CC', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {carsFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏎️</div>
                <div style={{ ...FB, fontSize: 14 }}>No cars match your search/filters.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {carsFiltered.map(item => {
                  const p = item.raw;
                  const isCollector = !!p.is_collectors_vault;
                  const tierBadge = { core: 'CORE STOCK', expansion: 'EXPANSION STOCK', special_order: 'SPECIAL ORDER' }[p.catalog_tier];
                  return (
                    <div key={p.id} id={`product-${p.id}`}
                      style={{ background: isCollector ? 'linear-gradient(135deg, #0a0f1a, #071426)' : '#071426', border: `1px solid ${isCollector ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.3s', boxShadow: highlightId === p.id ? '0 0 0 3px #DC2626, 0 0 24px rgba(220,38,38,0.5)' : 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = isCollector ? 'rgba(250,204,21,0.5)' : 'rgba(220,38,38,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = isCollector ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                      {isCollector && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #FACC15, transparent)', zIndex: 1 }} />}
                      {item.customerStatusLabel && <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 20, background: '#3B82F622', color: '#3B82F6', border: '1px solid #3B82F644' }}>{item.customerStatusLabel}</div>}
                      {isCollector && <div style={{ position: 'absolute', top: item.customerStatusLabel ? 40 : 12, left: 12, zIndex: 2, ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 20, background: '#FACC1522', color: '#FACC15', border: '1px solid #FACC1544' }}>COLLECTOR</div>}
                      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'flex', gap: 6 }}>
                        <button onClick={() => shareProduct(p)} style={{ background: copiedId === p.id ? '#22C55E' : 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 10px', ...F, fontSize: 10, letterSpacing: 1, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>{copiedId === p.id ? '✓ COPIED' : '🔗 SHARE'}</button>
                      </div>

                      <div style={{ height: 180, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
                        <ProductImage product={p} onClick={() => parseImages(p.image_url).length > 0 && setLightbox(p)} />
                      </div>

                      <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{p.chassis}</span>
                          {p.item_no && <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#FACC15' }}>#{p.item_no}</span>}
                          <span style={{ ...F, fontSize: 9, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: '#6B7280' }}>{tierBadge}</span>
                        </div>
                        <h3 style={{ ...F, fontWeight: 900, fontSize: 19, color: '#F5F5F5', margin: '0 0 6px', lineHeight: 1.1 }}>{p.name}</h3>
                        <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.6, margin: '0 0 14px' }}>{p.description}</p>

                        <div style={{ background: '#050505', border: `1px solid ${item.purchasable ? 'rgba(255,255,255,0.08)' : 'rgba(220,38,38,0.25)'}`, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ ...F, fontSize: 10, letterSpacing: 1, color: '#B8C1CC' }}>📦 BOXED KIT</div>
                            {item.priceDkk != null ? (
                              <div style={{ ...F, fontWeight: 900, fontSize: 20, color: item.purchasable ? (isCollector ? '#FACC15' : '#F5F5F5') : '#6B7280' }}>{item.priceDkk.toLocaleString()} kr</div>
                            ) : (
                              <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#B8C1CC', letterSpacing: 1 }}>PRICE PENDING</div>
                            )}
                          </div>
                          {FEATURE_FLAGS.assemblyServicesEnabled && item.purchasable && (
                            <div style={{ ...FB, fontSize: 10, color: '#6B7280' }}>+ Display Case, Standard or Ready-to-Race Assembly available at checkout</div>
                          )}
                          {item.customerStatusLabel && item.ctaAction !== 'none' && (
                            <div style={{ ...F, fontSize: 9, letterSpacing: 1, color: '#DC2626', fontWeight: 700 }}>{item.customerStatusLabel}</div>
                          )}
                          {item.ctaAction === 'reserve' ? (
                            <button onClick={() => openModal(toShopProduct(item))} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 0', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>RESERVE</button>
                          ) : item.ctaAction === 'preorder' ? (
                            <button onClick={() => openModal(toShopProduct(item))} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 0', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>PREORDER</button>
                          ) : item.allowsRestockInterest ? (
                            <>
                              <button onClick={() => openRestockInterest(item)} style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '9px 0', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>{item.ctaLabel}</button>
                              {restockInterestCount(p.id, restockVersion) > 0 && (
                                <div style={{ ...FB, fontSize: 10, color: '#6B7280', textAlign: 'center' }}>{restockInterestCount(p.id, restockVersion)} racer{restockInterestCount(p.id, restockVersion) === 1 ? '' : 's'} waiting</div>
                              )}
                            </>
                          ) : null}
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
        )}

        {/* ── PARTS TAB ──────────────────────────────────────────── */}
        {shopTab === 'parts' && (
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>PARTS & UPGRADES</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 28, color: '#F5F5F5', margin: '0 0 20px' }}>SHOP PARTS</h2>

            <input value={partsSearch} onChange={e => setPartsSearch(e.target.value)} placeholder="Search by name or item no..." style={{ ...searchInputStyle, marginBottom: 20 }} />

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 28 }}>
              <button onClick={() => setPartsFilter('')} style={filterBtn(!partsFilter)}>ALL PARTS</button>
              {PARTS_SUBCATEGORIES.map(c => (
                <button key={c} onClick={() => setPartsFilter(c)} style={filterBtn(partsFilter === c)}>{c}</button>
              ))}
            </div>

            {partsFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
                <div style={{ ...FB, fontSize: 14 }}>No parts match your search/filters yet.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                {partsFiltered.map(item => {
                  const p = item.raw;
                  const tierBadge = { core: 'CORE STOCK', expansion: 'EXPANSION STOCK', special_order: 'SPECIAL ORDER' }[p.catalog_tier];
                  return (
                    <div key={p.id} id={`product-${p.id}`}
                      style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: highlightId === p.id ? '0 0 0 3px #DC2626, 0 0 24px rgba(220,38,38,0.5)' : 'none' }}>
                      {item.customerStatusLabel && <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, ...F, fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 20, background: '#3B82F622', color: '#3B82F6', border: '1px solid #3B82F644' }}>{item.customerStatusLabel}</div>}
                      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                        <button onClick={() => shareProduct(p)} style={{ background: copiedId === p.id ? '#22C55E' : 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 9px', ...F, fontSize: 9, letterSpacing: 1, color: '#fff', cursor: 'pointer' }}>{copiedId === p.id ? '✓' : '🔗'}</button>
                      </div>

                      <div style={{ height: 140, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <ProductImage product={p} onClick={() => parseImages(p.image_url).length > 0 && setLightbox(p)} />
                      </div>

                      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                          {p.item_no && <span style={{ ...F, fontSize: 9, letterSpacing: 1.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#FACC15' }}>#{p.item_no}</span>}
                          <span style={{ ...F, fontSize: 8, letterSpacing: 1.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: '#6B7280' }}>{tierBadge}</span>
                        </div>
                        <h3 style={{ ...F, fontWeight: 900, fontSize: 15, color: '#F5F5F5', margin: '0 0 10px', lineHeight: 1.2 }}>{p.name}</h3>

                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {item.priceDkk != null ? (
                            <div style={{ ...F, fontWeight: 900, fontSize: 17, color: item.purchasable ? '#F5F5F5' : '#6B7280' }}>{item.priceDkk.toLocaleString()} kr</div>
                          ) : (
                            <div style={{ ...F, fontWeight: 900, fontSize: 13, color: '#B8C1CC', letterSpacing: 1 }}>PRICE PENDING</div>
                          )}
                          {item.ctaAction === 'reserve' ? (
                            <button onClick={() => openModal(toShopProduct(item))} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>RESERVE</button>
                          ) : item.ctaAction === 'preorder' ? (
                            <button onClick={() => openModal(toShopProduct(item))} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>PREORDER</button>
                          ) : item.allowsRestockInterest ? (
                            <button onClick={() => openRestockInterest(item)} style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '8px 0', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>{item.ctaLabel}</button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ACCESSORIES TAB ────────────────────────────────────── */}
        {shopTab === 'accessories' && (
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>ACCESSORIES</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 28, color: '#F5F5F5', margin: '0 0 20px' }}>DISPLAY CASE</h2>

            {displayCase ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, maxWidth: 360 }}>
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 180, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <ProductImage product={displayCase.raw} />
                  </div>
                  <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC', alignSelf: 'flex-start', marginBottom: 10 }}>SHARED — ONE POOL FOR EVERY CAR</div>
                    <h3 style={{ ...F, fontWeight: 900, fontSize: 19, color: '#F5F5F5', margin: '0 0 6px', lineHeight: 1.1 }}>{displayCase.raw.name}</h3>
                    <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.6, margin: '0 0 14px' }}>Buy standalone, or add it to any car order at checkout for {DISPLAY_CASE_BUNDLED_PRICE_DKK} kr instead — a {DISPLAY_CASE_BUNDLE_SAVING_DKK} kr saving.</p>
                    <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ ...F, fontSize: 10, letterSpacing: 1, color: '#B8C1CC' }}>STANDALONE</div>
                        <div style={{ ...F, fontWeight: 900, fontSize: 20, color: globalCaseStock > 0 ? '#F5F5F5' : '#6B7280' }}>{DISPLAY_CASE_STANDALONE_PRICE_DKK.toLocaleString()} kr</div>
                      </div>
                      {globalCaseStock > 0 ? (
                        <button onClick={() => openModal(toDisplayCaseProduct())} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 0', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>RESERVE</button>
                      ) : (
                        <>
                          <div style={{ ...F, fontSize: 9, letterSpacing: 1, color: '#DC2626', fontWeight: 700 }}>OUT OF STOCK</div>
                          <button onClick={() => openRestockInterest(displayCase)} style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '9px 0', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>REQUEST RESTOCK</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280' }}>
                <div style={{ ...FB, fontSize: 14 }}>No accessories available yet.</div>
              </div>
            )}
          </div>
        )}

        {/* ── MERCHANDISE TAB ────────────────────────────────────── */}
        {shopTab === 'merchandise' && (
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>CLUB MERCH</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 28, color: '#F5F5F5', margin: '0 0 20px' }}>APPAREL & MERCHANDISE</h2>

            <input value={merchSearch} onChange={e => setMerchSearch(e.target.value)} placeholder="Search by name or item no..." style={{ ...searchInputStyle, marginBottom: 20 }} />

            {merchSubcats.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 28 }}>
                <button onClick={() => setMerchFilter('')} style={filterBtn(!merchFilter)}>ALL MERCH</button>
                {merchSubcats.map(c => (
                  <button key={c} onClick={() => setMerchFilter(c)} style={filterBtn(merchFilter === c)}>{c}</button>
                ))}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280', ...FB, fontSize: 14 }}>Loading products...</div>
            ) : merchFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👕</div>
                <div style={{ ...FB, fontSize: 14 }}>No merchandise available yet.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                {merchFiltered.map(p => (
                  <SimpleProductCard key={p.id} p={p} wishlistIds={wishlistIds} toggleWishlist={toggleWishlist} shareProduct={shareProduct} copiedId={copiedId} openModal={openModal} openPreorder={openPreorder} setLightbox={setLightbox} highlightId={highlightId} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {lightbox && <Lightbox product={lightbox} onClose={() => setLightbox(null)} />}

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
                      {isSelectedCar ? `📦 Boxed Kit · ${selected.chassis}` : (selected.subcategory || selected.category)}
                      {selected.item_no ? ` · #${selected.item_no}` : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      {modalPricing.original && <span style={{ ...FB, fontSize: 16, color: '#6B7280', textDecoration: 'line-through' }}>{modalPricing.original.toLocaleString()} DKK</span>}
                      <div style={{ ...F, fontWeight: 900, fontSize: 32, color: modalPricing.original ? '#22C55E' : '#FACC15' }}>{modalPrice.toLocaleString()} DKK</div>
                    </div>
                  </div>

                  {isSelectedCar && (modalBoxedKitTotal?.addOnLines.length ?? 0) > 0 && (
                    <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 4 }}>ORDER BREAKDOWN</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', ...FB, fontSize: 13, color: '#F5F5F5' }}>
                        <span>Boxed Kit</span><span>{Math.round(boxedKitPricing(selected).price).toLocaleString()} DKK</span>
                      </div>
                      {modalBoxedKitTotal!.addOnLines.map(l => (
                        <div key={l.addOn} style={{ display: 'flex', justifyContent: 'space-between', ...FB, fontSize: 13, color: '#F5F5F5' }}>
                          <span>+ {l.label}{l.addOn === 'display_case' ? ` (${DISPLAY_CASE_BUNDLE_SAVING_DKK} DKK saving vs. standalone)` : ''}</span>
                          <span>{(l.priceOre / 100).toLocaleString()} DKK</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', ...F, fontWeight: 900, fontSize: 15, color: '#FACC15', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6, marginTop: 2 }}>
                        <span>TOTAL</span><span>{(modalBoxedKitTotal!.totalOre / 100).toLocaleString()} DKK</span>
                      </div>
                    </div>
                  )}

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
                  {isSelectedCar && FEATURE_FLAGS.assemblyServicesEnabled && (
                    <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 }}>
                      <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#B8C1CC', marginBottom: 12 }}>OPTIONAL ADD-ONS</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ADD_ON_ORDER.map(addOnId => {
                          const def = DEFAULT_SERVICE_ADDONS[addOnId];
                          const isSelected = selectedAddOns.includes(addOnId);
                          const disabled = addOnId === 'display_case' && globalCaseStock <= 0;
                          return (
                            <div key={addOnId} onClick={() => !disabled && toggleAddOn(addOnId)}
                              style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer', background: isSelected ? 'rgba(220,38,38,0.08)' : '#071426', border: `1.5px solid ${isSelected ? '#DC2626' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                              <div>
                                <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{isSelected ? '☑' : '☐'} {def.label}{disabled ? ' (out of stock)' : ''}</div>
                                <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 2 }}>{def.includes[0]}{def.includes.length > 1 ? ` + ${def.includes.length - 1} more` : ''}</div>
                              </div>
                              <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#FACC15', whiteSpace: 'nowrap' }}>+{def.defaultPriceDkk} DKK</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {modalBoxedKitTotal?.requiresAssembly && (
                    <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: 14, ...FB, fontSize: 13, color: '#93C5FD', lineHeight: 1.6 }}>
                      🛠️ <strong style={{ color: '#fff' }}>{BUILD_TO_ORDER_MESSAGE}</strong>
                    </div>
                  )}

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

      {preorderTarget && (
        <div onClick={() => setPreorderTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 440, padding: '28px 24px 36px' }}>
            {!preorderDone ? (
              <>
                <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#3B82F6', marginBottom: 6 }}>PREORDER REQUEST</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 4 }}>{preorderTarget.product.name}</div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 20 }}>currently sold out</div>
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

      {restockTarget && (
        <div onClick={() => setRestockTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 440, padding: '28px 24px 36px' }}>
            {!restockDone ? (
              <>
                <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#3B82F6', marginBottom: 6 }}>{restockTarget.ctaLabel}</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 4 }}>{restockTarget.raw.name}</div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 20 }}>{restockTarget.badgeLabel}</div>
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: 14, ...FB, fontSize: 13, color: '#93C5FD', marginBottom: 20 }}>
                  This registers your interest only — it does not place an order, reserve stock, or charge payment. We&apos;ll contact you when it&apos;s available.
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', marginBottom: 8 }}>CONTACT PREFERENCE</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['email', 'sms', 'in_app'] as ContactPreference[]).map(pref => (
                      <button key={pref} onClick={() => setRestockContact(pref)}
                        style={{ flex: 1, ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '9px 0', borderRadius: 8, border: restockContact === pref ? 'none' : '1px solid rgba(255,255,255,0.1)', background: restockContact === pref ? '#3B82F6' : 'transparent', color: restockContact === pref ? '#fff' : '#B8C1CC', cursor: 'pointer', textTransform: 'uppercase' }}>
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', marginBottom: 8 }}>QUANTITY</div>
                  <input type="number" min={1} value={restockQuantity} onChange={e => setRestockQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', ...FB, fontSize: 14, color: '#F5F5F5' }} />
                </div>
                <button onClick={submitRestockInterest} disabled={restockSending} style={{ width: '100%', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 12, padding: 15, ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer', opacity: restockSending ? 0.5 : 1 }}>
                  {restockSending ? 'SENDING...' : `${restockTarget.ctaLabel} →`}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', marginBottom: 8 }}>REQUEST RECEIVED!</div>
                <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 20 }}>We&apos;ll reach out when {restockTarget.raw.name} is available. No order was placed.</div>
                <button onClick={() => setRestockTarget(null)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5', cursor: 'pointer' }}>CLOSE</button>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}