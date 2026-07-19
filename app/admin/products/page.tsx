// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { parseImages } from '@/lib/images';
import CatalogImportPanel from '@/components/admin/CatalogImportPanel';
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;
const STATUS_COLORS: Record<string, string> = { 'in stock': '#22C55E', 'preorder only': '#3B82F6', 'sold out': '#DC2626', 'coming soon': '#6B7280' };
const STATUSES = ['in stock', 'preorder only', 'sold out', 'coming soon'];
const CHASSIS = ['AR', 'MA', 'MS', 'VS', 'FM-A', 'S2', 'ME', 'Super FM', 'FM', 'VZ', 'Super TZ-X', 'Super TZ', 'Super XX', 'Super X', 'Super-1', 'Zero', 'Type 5', 'Type 4', 'Type 3', 'Type 2', 'Type 1', 'Other'];
const CATEGORIES = [{ key: 'cars', label: 'CARS' }, { key: 'parts', label: 'PARTS' }, { key: 'merchandise', label: 'MERCHANDISE' }];
const PARTS_SUBCATEGORIES = ['Bearings', 'Brakes/Dampers', 'Chassis', 'Shafts/Gears', 'Motors', 'Plates', 'Rollers/Stabilizers', 'Screws/Nuts', 'Wheels/Tires', 'Accessories'];
const inp = (x?: any) => ({ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#F5F5F5', fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, ...x });
const PRICE_FIELDS = [
    { key: 'unbuilt', label: '🔧 UNBUILT', priceField: 'unbuilt_price_dkk', origField: 'unbuilt_original_price_dkk' },
    { key: 'unbuilt_case', label: '📦 UNBUILT + CASE', priceField: 'unbuilt_case_price_dkk', origField: 'unbuilt_case_original_price_dkk' },
    { key: 'built', label: '⚡ BUILT', priceField: 'built_price_dkk', origField: 'built_original_price_dkk' },
    { key: 'built_case', label: '⚡ BUILT + CASE', priceField: 'built_case_price_dkk', origField: 'built_case_original_price_dkk' },
];
function cheapestPrice(p: any): number {
    if (p.category && p.category !== 'cars')
        return p.price_dkk || 0;
    const vals = [p.unbuilt_price_dkk, p.unbuilt_case_price_dkk, p.built_price_dkk, p.built_case_price_dkk].filter((v: any) => typeof v === 'number' && v > 0);
    return vals.length ? Math.min(...vals) : (p.price_dkk || 0);
}
// Shared with app/shop/page.tsx and components/sections/ShopPreview.tsx —
// see lib/images.ts. Preserves this file's existing comma-joined-string
// call shape (`fixImageUrl(url)` in, comma-joined string out) so every
// existing call site below is unchanged.
function fixImageUrl(url: string): string {
    return parseImages(url).join(',');
}
function ProductThumb({ url, size = 56 }: {
    url: string;
    size?: number;
}) {
    const [failed, setFailed] = useState(false);
    const first = fixImageUrl(url || '').split(',')[0]?.trim();
    if (!first || failed)
        return (<div style={{ width: size, height: size, borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ ...F, fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>NO IMG</span>
    </div>);
    return <img src={first} alt="" onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: 'contain', borderRadius: 8, background: '#050505', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}/>;
}
export default function AdminProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [imgPreviewFailed, setImgPreviewFailed] = useState(false);
    const [tab, setTab] = useState<'products' | 'preorders'>('products');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [msg, setMsg] = useState('');
    const [caseStock, setCaseStock] = useState(10);
    const [caseSaving, setCaseSaving] = useState(false);
    const [preorders, setPreorders] = useState<any[]>([]);
    const EMPTY = {
        name: '', item_no: '', category: 'cars', subcategory: '', chassis: 'AR', type: 'boxed', status: 'in stock', description: '', image_url: '', available: true,
        is_collectors_vault: false,
        unbuilt_stock: 1, built_stock: 1,
        unbuilt_price_dkk: 0, unbuilt_original_price_dkk: 0,
        unbuilt_case_price_dkk: 0, unbuilt_case_original_price_dkk: 0,
        built_price_dkk: 0, built_original_price_dkk: 0,
        built_case_price_dkk: 0, built_case_original_price_dkk: 0,
        price_dkk: 0, original_price_dkk: 0, stock_qty: 0,
    };
    // @ts-nocheck
    useEffect(() => {
        fetchProducts();
        fetchInventory();
        fetchPreorders();
    }, []);
    const fetchProducts = async () => { const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false }); setProducts(data || []); };
    const fetchInventory = async () => {
        const { data } = await supabase.from('shop_inventory').select('*').eq('id', 1).single();
        if (data)
            setCaseStock(data.case_stock ?? 10);
    };
    const fetchPreorders = async () => { const { data } = await supabase.from('preorders').select('*').order('created_at', { ascending: false }); setPreorders(data || []); };
    const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 6000); };
    const save = async () => {
        if (!editing)
            return;
        if (!editing.name?.trim()) {
            setSaveError('Name is required.');
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            const payload = { ...editing, image_url: fixImageUrl(editing.image_url), price_dkk: cheapestPrice(editing) || editing.price_dkk || 0 };
            if (editing.id) {
                const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase.from('products').insert({ ...payload, created_at: new Date().toISOString() });
                if (error)
                    throw error;
            }
            await fetchProducts();
            setEditing(null);
        }
        catch (err: any) {
            setSaveError(err?.message || 'Failed to save product. Please check all fields and try again.');
        }
        setSaving(false);
    };
    const del = async (id: string) => {
        if (!confirm('Delete?'))
            return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            flash('❌ Delete failed: ' + error.message);
            return;
        }
        flash('✅ Product deleted');
        await fetchProducts();
    };
    const quickStatus = async (p: any, status: string) => {
        const { error } = await supabase.from('products').update({ status }).eq('id', p.id);
        if (error) {
            flash('❌ Status update failed: ' + error.message);
            return;
        }
        await fetchProducts();
    };
    const saveInventory = async () => {
        setCaseSaving(true);
        const { error } = await supabase.from('shop_inventory').update({ case_stock: caseStock }).eq('id', 1);
        if (error)
            flash('❌ Case inventory save failed: ' + error.message);
        setCaseSaving(false);
    };
    const markPreorderDone = async (id: string) => {
        const { error } = await supabase.from('preorders').update({ status: 'fulfilled' }).eq('id', id);
        if (error) {
            flash('❌ Update failed: ' + error.message);
            return;
        }
        await fetchPreorders();
    };
    const delPreorder = async (id: string) => {
        if (!confirm('Delete this preorder request?'))
            return;
        const { error } = await supabase.from('preorders').delete().eq('id', id);
        if (error) {
            flash('❌ Delete failed: ' + error.message);
            return;
        }
        flash('✅ Preorder deleted');
        await fetchPreorders();
    };
    const editPreviewUrl = fixImageUrl(editing?.image_url || '').split(',')[0]?.trim();
    const isCarEditing = !editing?.category || editing.category === 'cars';
    const filteredProducts = products.filter(p => {
        const catMatch = categoryFilter === 'all' || (p.category || 'cars') === categoryFilter;
        const q = search.trim().toLowerCase();
        const searchMatch = !q || p.name?.toLowerCase().includes(q) || p.item_no?.toLowerCase().includes(q);
        return catMatch && searchMatch;
    });
    return (<div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/admin" style={{ textDecoration: 'none' }}><div style={{ width: 28, height: 28, background: '#DC2626', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 12, color: '#fff' }}>4W</div></a>
          <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', letterSpacing: 1 }}>MANAGE PRODUCTS</div>
        </div>
        <a href="/admin" style={{ ...FB, fontSize: 12, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px' }}>← Dashboard</a>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>

        {msg && <div style={{ ...FB, fontSize: 13, color: msg.startsWith('❌') ? '#FCA5A5' : '#22C55E', marginBottom: 16, background: msg.startsWith('❌') ? 'rgba(220,38,38,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${msg.startsWith('❌') ? 'rgba(220,38,38,0.2)' : 'rgba(34,197,94,0.2)'}`, borderRadius: 8, padding: '10px 14px' }}>{msg}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setTab('products')} style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === 'products' ? '#DC2626' : 'rgba(255,255,255,0.06)', color: tab === 'products' ? '#fff' : '#B8C1CC' }}>PRODUCTS</button>
          <button onClick={() => setTab('preorders')} style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === 'preorders' ? '#3B82F6' : 'rgba(255,255,255,0.06)', color: tab === 'preorders' ? '#fff' : '#B8C1CC' }}>PREORDER REQUESTS {preorders.filter(p => p.status !== 'fulfilled').length > 0 && `(${preorders.filter(p => p.status !== 'fulfilled').length})`}</button>
        </div>

        {tab === 'products' && (<>
            <CatalogImportPanel existingProducts={products}/>

            <div style={{ background: '#071426', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#FACC15', marginBottom: 4 }}>📦 GLOBAL CASE INVENTORY</div>
              <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginBottom: 14 }}>Shared display-case STOCK used by EVERY model's "+ Case" listings. Case pricing is now set per-product below, not here.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end', maxWidth: 380 }}>
                <div>
                  <label style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CASES IN STOCK</label>
                  <input type="number" min={0} value={caseStock} onChange={e => setCaseStock(Number(e.target.value))} style={inp()}/>
                </div>
                <button onClick={saveInventory} disabled={caseSaving} style={{ background: '#FACC15', color: '#050505', border: 'none', borderRadius: 8, padding: '12px 20px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer', opacity: caseSaving ? 0.6 : 1, height: 42 }}>{caseSaving ? 'SAVING...' : 'SAVE'}</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <button onClick={() => { setEditing({ ...EMPTY }); setImgPreviewFailed(false); setSaveError(''); }} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 15, letterSpacing: 1, cursor: 'pointer' }}>+ ADD PRODUCT</button>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or item no..." style={{ ...inp(), maxWidth: 260 }}/>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <button onClick={() => setCategoryFilter('all')} style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: categoryFilter === 'all' ? '#DC2626' : 'rgba(255,255,255,0.06)', color: categoryFilter === 'all' ? '#fff' : '#B8C1CC' }}>ALL ({products.length})</button>
              {CATEGORIES.map(c => (<button key={c.key} onClick={() => setCategoryFilter(c.key)} style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: categoryFilter === c.key ? '#DC2626' : 'rgba(255,255,255,0.06)', color: categoryFilter === c.key ? '#fff' : '#B8C1CC' }}>
                  {c.label} ({products.filter(p => (p.category || 'cars') === c.key).length})
                </button>))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredProducts.map(p => {
                const sc = STATUS_COLORS[p.status] || '#6B7280';
                const cat = p.category || 'cars';
                return (<div key={p.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 14, flex: 1, alignItems: 'flex-start' }}>
                        <ProductThumb url={p.image_url} size={64}/>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(220,38,38,0.12)', color: '#FCA5A5' }}>{cat.toUpperCase()}</span>
                            {p.item_no && <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#FACC15' }}>#{p.item_no}</span>}
                            {p.is_collectors_vault && <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(250,204,21,0.15)', color: '#FACC15' }}>🏆 VAULT</span>}
                            {cat === 'cars' ? (<span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{p.chassis}</span>) : p.subcategory && (<span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{p.subcategory}</span>)}
                            <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: sc + '18', color: sc }}>● {(p.status || '').toUpperCase()}</span>
                          </div>
                          <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5', marginBottom: 2 }}>{p.name}</div>
                          <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 8, lineHeight: 1.4 }}>{p.description?.slice(0, 80)}{p.description?.length > 80 ? '...' : ''}</div>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <div><span style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC' }}>FROM </span><span style={{ ...F, fontWeight: 900, fontSize: 16, color: '#FACC15' }}>{cheapestPrice(p)} kr</span></div>
                            {cat === 'cars' ? (<>
                                <div><span style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC' }}>🔧 UNBUILT </span><span style={{ ...F, fontWeight: 700, fontSize: 16, color: (p.unbuilt_stock ?? 1) > 0 ? '#22C55E' : '#DC2626' }}>{p.unbuilt_stock ?? 1}</span></div>
                                <div><span style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC' }}>⚡ BUILT </span><span style={{ ...F, fontWeight: 700, fontSize: 16, color: (p.built_stock ?? 1) > 0 ? '#22C55E' : '#DC2626' }}>{p.built_stock ?? 1}</span></div>
                              </>) : (<div><span style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC' }}>STOCK </span><span style={{ ...F, fontWeight: 700, fontSize: 16, color: (p.stock_qty ?? 0) > 0 ? '#22C55E' : '#DC2626' }}>{p.stock_qty ?? 0}</span></div>)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <select value={p.status} onChange={e => quickStatus(p, e.target.value)} style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 10px', color: '#F5F5F5', ...F, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditing({ ...EMPTY, ...p, category: p.category || 'cars' }); setImgPreviewFailed(false); setSaveError(''); }} style={{ flex: 1, ...F, fontSize: 12, letterSpacing: 1, padding: '7px 12px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', cursor: 'pointer' }}>EDIT</button>
                          <button onClick={() => del(p.id)} style={{ flex: 1, ...F, fontSize: 12, letterSpacing: 1, padding: '7px 12px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', cursor: 'pointer' }}>DEL</button>
                        </div>
                      </div>
                    </div>
                  </div>);
            })}
              {filteredProducts.length === 0 && <div style={{ textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>No products found.</div>}
            </div>
          </>)}

        {tab === 'preorders' && (<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {preorders.length === 0 ? (<div style={{ textAlign: 'center', padding: 60, ...FB, color: '#B8C1CC' }}>No preorder requests yet.</div>) : preorders.map(p => (<div key={p.id} style={{ background: '#071426', border: `1px solid ${p.status === 'fulfilled' ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.25)'}`, borderRadius: 12, padding: '14px 18px', opacity: p.status === 'fulfilled' ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 4, background: '#3B82F622', color: '#3B82F6' }}>{(p.variant || '').toUpperCase().replace('_', ' + ')}</span>
                      {p.status === 'fulfilled' && <span style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#22C55E' }}>✓ FULFILLED</span>}
                    </div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 17, color: '#F5F5F5' }}>{p.product_name}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 2 }}>👤 {p.member_name} · {p.member_email}</div>
                    <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 2 }}>{p.created_at ? new Date(p.created_at).toLocaleString('en-GB') : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.status !== 'fulfilled' && <button onClick={() => markPreorderDone(p.id)} style={{ ...F, fontSize: 12, letterSpacing: 1, padding: '7px 12px', borderRadius: 6, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', cursor: 'pointer' }}>MARK DONE</button>}
                    <button onClick={() => delPreorder(p.id)} style={{ ...F, fontSize: 12, letterSpacing: 1, padding: '7px 12px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', cursor: 'pointer' }}>DEL</button>
                  </div>
                </div>
              </div>))}
          </div>)}
      </div>

      {editing && (<div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, width: '100%', maxWidth: 560, marginBottom: 24 }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5' }}>{editing.id ? 'EDIT PRODUCT' : 'ADD PRODUCT'}</div>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>NAME *</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inp()}/></div>

              <div><label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>ITEM NO.</label><input value={editing.item_no || ''} onChange={e => setEditing({ ...editing, item_no: e.target.value })} placeholder="e.g. 18628, AR-2024" style={inp()}/></div>

              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CATEGORY</label>
                <select value={editing.category || 'cars'} onChange={e => setEditing({ ...editing, category: e.target.value, subcategory: e.target.value === 'cars' ? '' : editing.subcategory })} style={inp()}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>

              {isCarEditing ? (<>
                  <div><label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CHASSIS</label><select value={editing.chassis} onChange={e => setEditing({ ...editing, chassis: e.target.value })} style={inp()}>{CHASSIS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>

                  <div onClick={() => setEditing({ ...editing, is_collectors_vault: !editing.is_collectors_vault })} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#050505', border: `1px solid ${editing.is_collectors_vault ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editing.is_collectors_vault} onChange={e => setEditing({ ...editing, is_collectors_vault: e.target.checked })} onClick={e => e.stopPropagation()} style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}/>
                    <div>
                      <div style={{ ...F, fontSize: 13, color: '#FACC15', letterSpacing: 1 }}>🏆 FEATURE IN COLLECTOR'S VAULT</div>
                      <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 2 }}>Shows this car in the spotlighted Vault section at the top of the shop's CARS tab.</div>
                    </div>
                  </div>

                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#FACC15', marginBottom: 10 }}>STOCK POOLS</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>🔧 UNBUILT STOCK</label><input type="number" min={0} value={editing.unbuilt_stock ?? 1} onChange={e => setEditing({ ...editing, unbuilt_stock: Number(e.target.value) })} style={inp()}/></div>
                      <div><label style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>⚡ BUILT STOCK</label><input type="number" min={0} value={editing.built_stock ?? 1} onChange={e => setEditing({ ...editing, built_stock: Number(e.target.value) })} style={inp()}/></div>
                    </div>
                    <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 8 }}>Cases are shared globally — edit "Global Case Inventory" above, not here.</div>
                  </div>

                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#FACC15', marginBottom: 4 }}>PRICING PER VARIANT</div>
                    <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginBottom: 12 }}>Leave "Original price" at 0 for no discount. If set higher than Price, the shop shows it slashed through.</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {PRICE_FIELDS.map(f => (<div key={f.key} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 10, alignItems: 'center' }}>
                          <div style={{ ...F, fontSize: 11, letterSpacing: 1, color: '#F5F5F5', minWidth: 120 }}>{f.label}</div>
                          <div>
                            <label style={{ ...F, fontSize: 9, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 4 }}>PRICE (DKK)</label>
                            <input type="number" min={0} step="0.01" value={editing[f.priceField] ?? 0} onChange={e => setEditing({ ...editing, [f.priceField]: Number(e.target.value) })} style={inp()}/>
                          </div>
                          <div>
                            <label style={{ ...F, fontSize: 9, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 4 }}>ORIGINAL (OPTIONAL)</label>
                            <input type="number" min={0} step="0.01" value={editing[f.origField] ?? 0} onChange={e => setEditing({ ...editing, [f.origField]: Number(e.target.value) })} style={inp()}/>
                          </div>
                        </div>))}
                    </div>
                  </div>
                </>) : (<>
                  <div>
                    <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>SUBCATEGORY</label>
                    {editing.category === 'parts' ? (<select value={editing.subcategory || ''} onChange={e => setEditing({ ...editing, subcategory: e.target.value })} style={inp()}>
                        <option value="">— Select —</option>
                        {PARTS_SUBCATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>) : (<input value={editing.subcategory || ''} onChange={e => setEditing({ ...editing, subcategory: e.target.value })} placeholder="e.g. Jersey, Hoodie, Sticker" style={inp()}/>)}
                  </div>

                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#FACC15', marginBottom: 10 }}>STOCK & PRICE</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div><label style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>STOCK QTY</label><input type="number" min={0} value={editing.stock_qty ?? 0} onChange={e => setEditing({ ...editing, stock_qty: Number(e.target.value) })} style={inp()}/></div>
                      <div><label style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>PRICE (DKK)</label><input type="number" min={0} step="0.01" value={editing.price_dkk ?? 0} onChange={e => setEditing({ ...editing, price_dkk: Number(e.target.value) })} style={inp()}/></div>
                      <div><label style={{ ...F, fontSize: 10, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>ORIGINAL (OPT.)</label><input type="number" min={0} step="0.01" value={editing.original_price_dkk ?? 0} onChange={e => setEditing({ ...editing, original_price_dkk: Number(e.target.value) })} style={inp()}/></div>
                    </div>
                  </div>
                </>)}

              <div><label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>STATUS</label><select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} style={inp()}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>DESCRIPTION</label><textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} style={inp({ resize: 'vertical' })}/></div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>IMAGE URL(S)</label>
                <input value={editing.image_url} onChange={e => { setEditing({ ...editing, image_url: e.target.value }); setImgPreviewFailed(false); }} placeholder="https://... (separate multiple with commas)" style={inp()}/>
                <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 4 }}>Tip: paste multiple URLs separated by commas for slideshow</div>
                {editPreviewUrl && !imgPreviewFailed && (<div style={{ marginTop: 12, background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
                    <img src={editPreviewUrl} alt="preview" onError={() => setImgPreviewFailed(true)} style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }}/>
                  </div>)}
                {editPreviewUrl && imgPreviewFailed && (<div style={{ marginTop: 12, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: 10, ...FB, fontSize: 12, color: '#FCA5A5' }}>
                    ⚠ Image URL failed to load. Check the URL is a direct image link (not a page URL).
                  </div>)}
              </div>
              {saveError && <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '12px 14px', ...FB, fontSize: 13, color: '#FCA5A5' }}>⚠ {saveError}</div>}
              <button onClick={save} disabled={saving} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', ...F, fontWeight: 900, fontSize: 17, letterSpacing: 2, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'SAVING...' : 'SAVE PRODUCT'}</button>
            </div>
          </div>
        </div>)}
    </div>);
}
