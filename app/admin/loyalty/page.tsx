// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const TIERS = [
    { key: 'non_member', label: 'No Membership', rate: 0, color: '#4B5563' },
    { key: 'member', label: 'Member', rate: 2, color: '#3B82F6' },
    { key: 'season_3rd', label: '🥉 Season 3rd', rate: 3, color: '#CD7C2F' },
    { key: 'season_2nd', label: '🥈 Season 2nd', rate: 4, color: '#9CA3AF' },
    { key: 'season_1st', label: '🏆 Season Champion', rate: 5, color: '#DC2626' },
    { key: 'hall_of_fame', label: '🏛️ Hall of Fame', rate: 8, color: '#FACC15' },
];
export default function AdminLoyalty() {
    const [loyaltyData, setLoyaltyData] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [adjustForm, setAdjustForm] = useState({ type: 'earn', amount: '', description: '' });
    const [tierForm, setTierForm] = useState({ tier: 'member', is_active_member: true });
    const [msg, setMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [discountCodes, setDiscountCodes] = useState<any[]>([]);
    const [codeForm, setCodeForm] = useState({ code: '', percent_off: '', min_tier: '', max_uses: '', valid_until: '', description: '' });
    const [codeSaving, setCodeSaving] = useState(false);
    const [codeMsg, setCodeMsg] = useState('');
    // @ts-nocheck
    useEffect(() => {
        loadData();
    }, []);
    async function loadData() {
        const { data: mData, error: mError } = await supabase
            .from('members')
            .select('id, first_name, last_name, loyalty_tier, points_rate, is_active_member')
            .order('first_name');
        console.log('Members loaded:', mData, 'Error:', mError);
        setMembers(mData || []);
        const { data: lData } = await supabase.from('loyalty_points').select('*').order('points_balance', { ascending: false });
        setLoyaltyData(lData || []);
        const { data: tData } = await supabase.from('points_transactions').select('*').order('created_at', { ascending: false }).limit(30);
        setTransactions(tData || []);
        const { data: dcData } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
        setDiscountCodes(dcData || []);
    }
    async function handleCreateCode() {
        if (!codeForm.code.trim() || !codeForm.percent_off || !codeForm.valid_until) {
            setCodeMsg('Code, % off, and expiry date are required.');
            return;
        }
        setCodeSaving(true);
        const { error } = await supabase.from('discount_codes').insert({
            code: codeForm.code.trim().toUpperCase(),
            percent_off: Number(codeForm.percent_off),
            min_tier: codeForm.min_tier || null,
            max_uses: codeForm.max_uses ? Number(codeForm.max_uses) : null,
            valid_until: codeForm.valid_until,
            description: codeForm.description,
        });
        if (error)
            setCodeMsg('Error: ' + error.message);
        else {
            setCodeMsg('✅ Code created!');
            setCodeForm({ code: '', percent_off: '', min_tier: '', max_uses: '', valid_until: '', description: '' });
            loadData();
        }
        setCodeSaving(false);
        setTimeout(() => setCodeMsg(''), 3000);
    }
    async function deleteCode(id: string) {
        if (!confirm('Delete this code?'))
            return;
        await supabase.from('discount_codes').delete().eq('id', id);
        loadData();
    }
    function selectMember(memberId: string) {
        const lp = loyaltyData.find((x: any) => x.member_id === memberId);
        const m = members.find((x: any) => x.id === memberId);
        setSelected({ ...m, loyalty: lp });
        setTierForm({ tier: m?.loyalty_tier || 'member', is_active_member: m?.is_active_member || false });
    }
    async function handleAdjust() {
        if (!selected || !adjustForm.amount)
            return;
        setSaving(true);
        const inputAmount = parseFloat(adjustForm.amount);
        const rate = TIERS.find(t => t.key === selected.loyalty_tier)?.rate || 0;
        // earn = calculate % of DKK. bonus/redeem/adjust = direct coin value.
        const amount = adjustForm.type === 'earn' ? Math.round(inputAmount * rate / 100 * 100) / 100 : inputAmount;
        const current = loyaltyData.find((x: any) => x.member_id === selected.id);
        const newBalance = (current?.points_balance || 0) + (adjustForm.type === 'redeem' ? -amount : amount);
        const newEarned = (current?.total_earned || 0) + (adjustForm.type === 'earn' || adjustForm.type === 'bonus' ? amount : 0);
        const newRedeemed = (current?.total_redeemed || 0) + (adjustForm.type === 'redeem' ? amount : 0);
        await supabase.from('loyalty_points').upsert({
            member_id: selected.id,
            member_name: `${selected.first_name} ${selected.last_name}`,
            points_balance: Math.max(0, newBalance),
            total_earned: newEarned,
            total_redeemed: newRedeemed,
            tier: selected.loyalty_tier || 'member',
            points_rate: rate,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'member_id' });
        await supabase.from('points_transactions').insert({
            member_id: selected.id,
            member_name: `${selected.first_name} ${selected.last_name}`,
            type: adjustForm.type,
            amount,
            rate_applied: rate,
            description: adjustForm.description || `Manual ${adjustForm.type} by admin`,
        });
        setMsg(adjustForm.type === 'earn' ? `✅ Added ${amount} coins (${rate}% of ${inputAmount} DKK)` : `✅ ${adjustForm.type === 'redeem' ? 'Redeemed' : 'Added'} ${amount} coins`);
        setAdjustForm({ type: 'earn', amount: '', description: '' });
        loadData();
        setSaving(false);
        setTimeout(() => setMsg(''), 3000);
    }
    async function handleTierUpdate() {
        if (!selected)
            return;
        setSaving(true);
        const tierData = TIERS.find(t => t.key === tierForm.tier);
        await supabase.from('members').update({
            loyalty_tier: tierForm.tier,
            points_rate: tierData?.rate || 0,
            is_active_member: tierForm.is_active_member,
        }).eq('id', selected.id);
        await supabase.from('loyalty_points').upsert({
            member_id: selected.id,
            member_name: `${selected.first_name} ${selected.last_name}`,
            tier: tierForm.tier,
            points_rate: tierData?.rate || 0,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'member_id' });
        setMsg('✅ Tier updated!');
        loadData();
        setSaving(false);
        setTimeout(() => setMsg(''), 3000);
    }
    const filtered = members.filter((m: any) => `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()));
    const s: Record<string, any> = {
        page: { background: '#050505', minHeight: '100vh', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", padding: '32px 24px' },
        layout: { maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' },
        card: { background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
        title: { fontSize: '18px', fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px', marginBottom: '16px', color: '#DC2626' },
        input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px 12px', color: '#F5F5F5', fontSize: '13px' },
        select: { width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px 12px', color: '#F5F5F5', fontSize: '13px' },
        label: { display: 'block', fontSize: '10px', letterSpacing: '2px', color: '#6B7280', textTransform: 'uppercase' as const, marginBottom: '5px', marginTop: '12px' },
        btn: { padding: '8px 18px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '12px' },
        memberBtn: (active: boolean) => ({
            width: '100%', textAlign: 'left' as const, padding: '10px 12px', marginBottom: '4px',
            background: active ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.03)',
            border: active ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
            borderRadius: '6px', cursor: 'pointer', color: '#F5F5F5', fontSize: '13px',
        }),
        tierBadge: (tier: string) => {
            const t = TIERS.find(x => x.key === tier);
            return { background: `${t?.color}22`, color: t?.color, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 };
        },
        msg: { fontSize: '13px', color: '#FACC15', marginTop: '8px' },
        statRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' },
        txRow: { padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '12px' },
    };
    return (<div style={s.page}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <a href="/admin" style={{ color: '#6B7280', fontSize: '13px', textDecoration: 'none' }}>← Admin</a>
          <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2px' }}>⭐ LOYALTY COINS</div>
        </div>

        <div style={s.layout}>
          {/* MEMBER LIST */}
          <div>
            <div style={s.card}>
              <div style={s.title}>MEMBERS</div>
              <input style={s.input} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}/>
              <div style={{ marginTop: '12px', maxHeight: '500px', overflowY: 'auto' as const }}>
                {filtered.map((m: any) => {
            const lp = loyaltyData.find((x: any) => x.member_id === m.id);
            return (<button key={m.id} style={s.memberBtn(selected?.id === m.id)} onClick={() => selectMember(m.id)}>
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{m.first_name} {m.last_name}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={s.tierBadge(m.loyalty_tier || 'non_member')}>{TIERS.find(t => t.key === (m.loyalty_tier || 'non_member'))?.rate || 0}%</span>
                        <span style={{ fontSize: '11px', color: '#6B7280' }}>{lp ? `${lp.points_balance} coins` : '0 coins'}</span>
                      </div>
                    </button>);
        })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div>
            {!selected ? (<div style={{ ...s.card, textAlign: 'center' as const, padding: '60px 20px', color: '#4B5563' }}>
                Select a member to manage their coins
              </div>) : (<>
                {/* MEMBER STATS */}
                <div style={s.card}>
                  <div style={s.title}>{selected.first_name} {selected.last_name}</div>
                  <div style={s.statRow}>
                    <span style={{ color: '#6B7280' }}>Coins Balance</span>
                    <span style={{ color: '#FACC15', fontWeight: 700, fontSize: '18px' }}>{selected.loyalty?.points_balance || 0} coins</span>
                  </div>
                  <div style={s.statRow}>
                    <span style={{ color: '#6B7280' }}>Total Earned</span>
                    <span>{selected.loyalty?.total_earned || 0} coins</span>
                  </div>
                  <div style={s.statRow}>
                    <span style={{ color: '#6B7280' }}>Total Redeemed</span>
                    <span>{selected.loyalty?.total_redeemed || 0} coins</span>
                  </div>
                  <div style={s.statRow}>
                    <span style={{ color: '#6B7280' }}>Current Tier</span>
                    <span style={s.tierBadge(selected.loyalty_tier || 'non_member')}>
                      {TIERS.find(t => t.key === (selected.loyalty_tier || 'non_member'))?.label}
                    </span>
                  </div>
                  <div style={s.statRow}>
                    <span style={{ color: '#6B7280' }}>Coins Rate</span>
                    <span style={{ color: '#DC2626', fontWeight: 700 }}>{selected.points_rate || 0}%</span>
                  </div>
                </div>

                {/* ADJUST TIER */}
                <div style={s.card}>
                  <div style={s.title}>SET TIER</div>
                  <label style={s.label}>Tier</label>
                  <select style={s.select} value={tierForm.tier} onChange={e => setTierForm(f => ({ ...f, tier: e.target.value }))}>
                    {TIERS.map(t => <option key={t.key} value={t.key}>{t.label} ({t.rate}%)</option>)}
                  </select>
                  <label style={s.label}>Membership Status</label>
                  <select style={s.select} value={tierForm.is_active_member ? 'true' : 'false'} onChange={e => setTierForm(f => ({ ...f, is_active_member: e.target.value === 'true' }))}>
                    <option value="true">Active Member</option>
                    <option value="false">Inactive / Non-Member</option>
                  </select>
                  <button style={s.btn} onClick={handleTierUpdate} disabled={saving}>UPDATE TIER</button>
                </div>

                {/* ADJUST COINS */}
                <div style={s.card}>
                  <div style={s.title}>ADJUST COINS</div>
                  <label style={s.label}>Type</label>
                  <select style={s.select} value={adjustForm.type} onChange={e => setAdjustForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="earn">Add Coins (earn)</option>
                    <option value="bonus">Add Bonus Coins</option>
                    <option value="redeem">Redeem Coins</option>
                    <option value="adjust">Manual Adjust</option>
                  </select>
                  <label style={s.label}>Amount (DKK value)</label>
                  <input style={s.input} type="number" step="0.01" placeholder="0.00" value={adjustForm.amount} onChange={e => setAdjustForm(f => ({ ...f, amount: e.target.value }))}/>
                  <label style={s.label}>Description</label>
                  <input style={s.input} placeholder="e.g. Race entry purchase 50 DKK" value={adjustForm.description} onChange={e => setAdjustForm(f => ({ ...f, description: e.target.value }))}/>
                  <button style={s.btn} onClick={handleAdjust} disabled={saving}>{saving ? 'Saving...' : 'APPLY'}</button>
                  {msg && <div style={s.msg}>{msg}</div>}
                </div>

                {/* TRANSACTION HISTORY */}
                <div style={s.card}>
                  <div style={s.title}>RECENT TRANSACTIONS</div>
                  {transactions.filter((t: any) => t.member_id === selected.id).slice(0, 10).map((t: any) => (<div key={t.id} style={s.txRow}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: t.type === 'redeem' ? '#DC2626' : '#FACC15', fontWeight: 700 }}>
                          {t.type === 'redeem' ? '-' : '+'}{t.amount} coins
                        </span>
                        <span style={{ color: '#6B7280' }}>{new Date(t.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div style={{ color: '#6B7280', marginTop: '2px' }}>{t.description}</div>
                    </div>))}
                  {transactions.filter((t: any) => t.member_id === selected.id).length === 0 && (<div style={{ color: '#4B5563', fontSize: '13px' }}>No transactions yet.</div>)}
                </div>
              </>)}
          </div>
        </div>

        {/* DISCOUNT CODES */}
        <div style={s.card}>
          <div style={s.title}>🎟️ DISCOUNT CODES</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={s.label}>Code</label>
              <input style={s.input} placeholder="RACE10" value={codeForm.code} onChange={e => setCodeForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}/>
            </div>
            <div>
              <label style={s.label}>% Off</label>
              <input style={s.input} type="number" placeholder="10" value={codeForm.percent_off} onChange={e => setCodeForm(f => ({ ...f, percent_off: e.target.value }))}/>
            </div>
            <div>
              <label style={s.label}>Min Tier (optional)</label>
              <select style={s.select} value={codeForm.min_tier} onChange={e => setCodeForm(f => ({ ...f, min_tier: e.target.value }))}>
                <option value="">Anyone</option>
                {TIERS.filter(t => t.key !== 'non_member').map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Max Uses (optional)</label>
              <input style={s.input} type="number" placeholder="Unlimited" value={codeForm.max_uses} onChange={e => setCodeForm(f => ({ ...f, max_uses: e.target.value }))}/>
            </div>
            <div>
              <label style={s.label}>Expires</label>
              <input style={s.input} type="datetime-local" value={codeForm.valid_until} onChange={e => setCodeForm(f => ({ ...f, valid_until: e.target.value }))}/>
            </div>
            <div>
              <label style={s.label}>Description</label>
              <input style={s.input} placeholder="e.g. Season 2 launch promo" value={codeForm.description} onChange={e => setCodeForm(f => ({ ...f, description: e.target.value }))}/>
            </div>
          </div>
          <button style={s.btn} onClick={handleCreateCode} disabled={codeSaving}>{codeSaving ? 'Saving...' : 'CREATE CODE'}</button>
          {codeMsg && <div style={s.msg}>{codeMsg}</div>}

          <div style={{ marginTop: '20px' }}>
            {discountCodes.length === 0 ? (<div style={{ color: '#4B5563', fontSize: '13px' }}>No discount codes yet.</div>) : discountCodes.map((c: any) => {
            const expired = new Date(c.valid_until).getTime() < Date.now();
            const usedUp = c.max_uses != null && c.uses_count >= c.max_uses;
            return (<div key={c.id} style={{ ...s.txRow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: (expired || usedUp) ? '#6B7280' : '#22C55E' }}>{c.code}</span>
                    <span style={{ color: '#B8C1CC', marginLeft: 10 }}>{c.percent_off}% off</span>
                    {c.min_tier && <span style={{ color: '#6B7280', marginLeft: 10 }}>· {TIERS.find(t => t.key === c.min_tier)?.label || c.min_tier}+</span>}
                    <span style={{ color: '#6B7280', marginLeft: 10 }}>· {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''} used</span>
                    <span style={{ color: expired ? '#DC2626' : '#6B7280', marginLeft: 10 }}>· {expired ? 'Expired' : `Until ${new Date(c.valid_until).toLocaleDateString('en-GB')}`}</span>
                  </div>
                  <button style={s.btn} onClick={() => deleteCode(c.id)}>Delete</button>
                </div>);
        })}
          </div>
        </div>
      </div>
    </div>);
}
