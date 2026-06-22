import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

interface Member {
  email: string;
  name: string;
  avatar_url?: string;
  total_points: number;
  lifetime_spending: number;
  membership_expires_at?: string;
  referral_code?: string;
  loyalty_tier?: string;
}

export function MemberProfileModal({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [cars, setCars] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    const m = member;
    setLoading(true);
    async function load() {
      const { data: c } = await supabase.from('cars').select('*').eq('member_email', m.email);
      const { data: o } = await supabase.from('orders').select('*').eq('member_email', m.email).order('created_at', { ascending: false });
      setCars(c || []);
      setOrders(o || []);
      setLoading(false);
    }
    load();
  }, [member?.email]);

  if (!member) return null;

  const memberActive = member.membership_expires_at && new Date(member.membership_expires_at) > new Date();
  const lifetimeSpend = member.lifetime_spending || 0;
  const points = member.total_points || 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={onClose}>
      <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, maxHeight: '90vh', width: '100%', maxWidth: 600, overflow: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'start', flex: 1 }}>
            {member.avatar_url && (<img src={member.avatar_url} alt={member.name} style={{ width: 60, height: 60, borderRadius: 50, objectFit: 'cover' }} />)}
            <div>
              <h2 style={{ ...F, fontSize: 20, fontWeight: 900, color: '#F5F5F5', margin: 0 }}>{member.name}</h2>
              <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 4 }}>{member.email}</div>
              <div style={{ ...F, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: memberActive ? '#22C55E' : '#6B7280', marginTop: 6, textTransform: 'uppercase' }}>
                {memberActive ? '✓ ACTIVE MEMBER' : '○ INACTIVE'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ ...F, fontSize: 20, fontWeight: 900, background: 'none', border: 'none', color: '#B8C1CC', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
            <div style={{ ...FB, fontSize: 11, color: '#B8C1CC', marginBottom: 4 }}>LOYALTY POINTS</div>
            <div style={{ ...F, fontSize: 18, fontWeight: 900, color: '#FACC15' }}>{points}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
            <div style={{ ...FB, fontSize: 11, color: '#B8C1CC', marginBottom: 4 }}>LIFETIME SPEND</div>
            <div style={{ ...F, fontSize: 18, fontWeight: 900, color: '#FACC15' }}>{lifetimeSpend.toFixed(0)} kr</div>
          </div>
          {member.loyalty_tier && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
              <div style={{ ...FB, fontSize: 11, color: '#B8C1CC', marginBottom: 4 }}>TIER</div>
              <div style={{ ...F, fontSize: 14, fontWeight: 900, color: '#DC2626', textTransform: 'uppercase' }}>{member.loyalty_tier}</div>
            </div>
          )}
          {member.referral_code && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
              <div style={{ ...FB, fontSize: 11, color: '#B8C1CC', marginBottom: 4 }}>REFERRAL CODE</div>
              <div style={{ ...F, fontSize: 14, fontWeight: 900, color: '#3B82F6' }}>{member.referral_code}</div>
            </div>
          )}
        </div>

        {!loading && cars.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ ...F, fontSize: 14, fontWeight: 700, color: '#FACC15', marginBottom: 12, textTransform: 'uppercase' }}>REGISTERED CARS ({cars.length})</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {cars.map(car => (
                <div key={car.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                  <div style={{ ...F, fontSize: 13, fontWeight: 700, color: '#F5F5F5' }}>{car.name}</div>
                  <div style={{ ...FB, fontSize: 11, color: '#B8C1CC', marginTop: 4 }}>{car.chassis} • {car.category} • Status: {car.status === 'approved' ? '✓' : '⏳'} {car.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div>
            <h3 style={{ ...F, fontSize: 14, fontWeight: 700, color: '#FACC15', marginBottom: 12, textTransform: 'uppercase' }}>ORDER HISTORY ({orders.length})</h3>
            <div style={{ display: 'grid', gap: 8, maxHeight: 300, overflow: 'auto' }}>
              {orders.map(order => (
                <div key={order.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                    <div style={{ ...F, fontSize: 13, fontWeight: 700, color: '#F5F5F5' }}>{order.product_name}</div>
                    <div style={{ ...F, fontSize: 12, fontWeight: 900, color: '#FACC15' }}>{order.spend_amount_dkk ? order.spend_amount_dkk.toFixed(0) : '?'} kr</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ ...FB, fontSize: 11, color: '#B8C1CC' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                    <span style={{ ...F, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: order.payment_status === 'payment_confirmed' || order.payment_status === 'completed' ? 'rgba(34,197,94,0.2)' : order.payment_status === 'proof_uploaded' || order.payment_status === 'awaiting_payment' ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.2)',
                      color: order.payment_status === 'payment_confirmed' || order.payment_status === 'completed' ? '#22C55E' : order.payment_status === 'proof_uploaded' || order.payment_status === 'awaiting_payment' ? '#3B82F6' : '#B8C1CC' }}>
                      {(order.payment_status || '').toUpperCase().replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', textAlign: 'center', padding: '20px' }}>Loading...</div>}
      </div>
    </div>
  );
}