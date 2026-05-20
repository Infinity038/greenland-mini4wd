'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CHASSIS_TYPES = ['AR', 'MA', 'VS', 'MS', 'FM-A', 'S2', 'Other'];
const PRODUCT_TYPES = ['boxed', 'built', 'preorder'];
const STATUSES = ['in stock', 'preorder only', 'sold out', 'coming soon'];

interface Product {
  id?: string;
  name: string;
  chassis: string;
  category: string;
  type: string;
  price_dkk: number;
  stock_qty: number;
  status: string;
  description: string;
  image_url: string;
  available: boolean;
}

const DEMO: Product[] = [
  { id: '1', name: 'Tamiya AR Chassis Kit', chassis: 'AR', category: 'kit', type: 'boxed', price_dkk: 280, stock_qty: 5, status: 'in stock', description: 'Build-your-own AR chassis.', image_url: '', available: true },
  { id: '2', name: 'Tamiya MA Chassis Kit', chassis: 'MA', category: 'kit', type: 'boxed', price_dkk: 290, stock_qty: 3, status: 'in stock', description: 'Mid-range all-rounder.', image_url: '', available: true },
  { id: '3', name: 'AR Race-Ready (Built)', chassis: 'AR', category: 'built', type: 'built', price_dkk: 450, stock_qty: 1, status: 'in stock', description: 'Assembled, tuned, and tested.', image_url: '', available: true },
  { id: '4', name: 'Tamiya MS Chassis Kit', chassis: 'MS', category: 'kit', type: 'preorder', price_dkk: 310, stock_qty: 0, status: 'preorder only', description: 'Mid-ship layout.', image_url: '', available: true },
];

const EMPTY: Product = { name: '', chassis: 'AR', category: 'kit', type: 'boxed', price_dkk: 0, stock_qty: 0, status: 'in stock', description: '', image_url: '', available: true };

const inp = (extra?: object) => ({ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, ...extra });

const STATUS_COLORS: Record<string, string> = { 'in stock': '#22C55E', 'preorder only': '#FACC15', 'sold out': '#DC2626', 'coming soon': '#3B82F6' };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(DEMO);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error && data) { setProducts(data); setUseSupabase(true); }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    if (useSupabase) {
      if (editing.id) await supabase.from('products').update(editing).eq('id', editing.id);
      else await supabase.from('products').insert({ ...editing, created_at: new Date().toISOString() });
      await fetchProducts();
    } else {
      if (editing.id) setProducts(prev => prev.map(p => p.id === editing.id ? editing : p));
      else setProducts(prev => [{ ...editing, id: Date.now().toString() }, ...prev]);
    }
    setEditing(null); setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    if (useSupabase) { await supabase.from('products').delete().eq('id', id); await fetchProducts(); }
    else setProducts(prev => prev.filter(p => p.id !== id));
  };

  const quickUpdate = async (product: Product, field: string, value: any) => {
    const updated = { ...product, [field]: value };
    if (useSupabase) { await supabase.from('products').update({ [field]: value }).eq('id', product.id!); await fetchProducts(); }
    else setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5' }}>
      <div style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626' }}>ADMIN</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#F5F5F5' }}>MANAGE SHOP PRODUCTS</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setEditing({ ...EMPTY })} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 700, fontSize: 15, letterSpacing: 1, cursor: 'pointer' }}>+ ADD PRODUCT</button>
          <a href="/admin" style={{ ...FB, fontSize: 13, color: '#B8C1CC', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 16px' }}>← Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        {!useSupabase && (
          <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 10, padding: '12px 16px', ...FB, fontSize: 13, color: '#FACC15', marginBottom: 24 }}>
            ⚠️ Using demo data. Create Supabase table: <code>products</code>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {products.map(p => {
            const sc = STATUS_COLORS[p.status] || '#6B7280';
            return (
              <div key={p.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ ...F, fontSize: 12, letterSpacing: 2, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#B8C1CC' }}>{p.chassis}</span>
                      <span style={{ ...F, fontSize: 12, letterSpacing: 2, padding: '3px 8px', borderRadius: 4, background: sc + '18', color: sc }}>● {p.status.toUpperCase()}</span>
                      <span style={{ ...F, fontSize: 12, letterSpacing: 2, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: '#B8C1CC' }}>{p.type}</span>
                    </div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 8 }}>{p.description}</div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC' }}>PRICE </span>
                        <span style={{ ...F, fontWeight: 900, fontSize: 18, color: '#FACC15' }}>{p.price_dkk} kr</span>
                      </div>
                      <div>
                        <span style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC' }}>STOCK </span>
                        <span style={{ ...F, fontWeight: 700, fontSize: 16, color: p.stock_qty > 0 ? '#22C55E' : '#DC2626' }}>{p.stock_qty}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    {/* Quick status update */}
                    <select
                      value={p.status}
                      onChange={e => quickUpdate(p, 'status', e.target.value)}
                      style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 10px', color: '#F5F5F5', ...F, fontSize: 12, letterSpacing: 1, cursor: 'pointer', outline: 'none' }}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditing(p)} style={{ flex: 1, ...F, fontSize: 12, letterSpacing: 1, padding: '7px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', cursor: 'pointer' }}>EDIT</button>
                      <button onClick={() => deleteProduct(p.id!)} style={{ flex: 1, ...F, fontSize: 12, letterSpacing: 1, padding: '7px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', cursor: 'pointer' }}>DELETE</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 560, marginBottom: 24 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', margin: 0 }}>{editing.id ? 'EDIT PRODUCT' : 'ADD PRODUCT'}</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#B8C1CC', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>PRODUCT NAME</label>
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inp()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CHASSIS</label>
                  <select value={editing.chassis} onChange={e => setEditing({ ...editing, chassis: e.target.value })} style={inp()}>
                    {CHASSIS_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>TYPE</label>
                  <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} style={inp()}>
                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>PRICE (DKK)</label>
                  <input type="number" value={editing.price_dkk} onChange={e => setEditing({ ...editing, price_dkk: Number(e.target.value) })} style={inp()} />
                </div>
                <div>
                  <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>STOCK QTY</label>
                  <input type="number" value={editing.stock_qty} onChange={e => setEditing({ ...editing, stock_qty: Number(e.target.value) })} style={inp()} />
                </div>
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>STATUS</label>
                <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} style={inp()}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>DESCRIPTION</label>
                <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} style={inp({ resize: 'vertical' })} />
              </div>
              <div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>IMAGE URL</label>
                <input value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." style={inp()} />
              </div>
              <button onClick={save} disabled={saving} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'SAVING...' : 'SAVE PRODUCT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}