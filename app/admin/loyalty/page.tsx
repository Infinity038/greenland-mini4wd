// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  REWARD_MILESTONES,
  highestUnlockedReward,
  nextRewardMilestone,
  normalizeRewardPoints,
} from '@/lib/rewards';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function displayName(member: any): string {
  return member?.name
    || `${member?.first_name || ''} ${member?.last_name || ''}`.trim()
    || member?.email
    || 'Racer';
}

export default function AdminLoyaltyPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ type: 'bonus', amount: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [{ data: memberRows }, { data: accountRows }, { data: transactionRows }] = await Promise.all([
      supabase
        .from('members')
        .select('id, name, first_name, last_name, email, member_status, membership_expires_at')
        .order('first_name'),
      supabase
        .from('loyalty_points')
        .select('*')
        .order('points_balance', { ascending: false }),
      supabase
        .from('points_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    setMembers(memberRows || []);
    setAccounts(accountRows || []);
    setTransactions(transactionRows || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredMembers = members.filter(member => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${displayName(member)} ${member.email || ''}`.toLowerCase().includes(query);
  });

  const selectedMember = members.find(member => member.id === selectedId) || null;
  const selectedAccount = accounts.find(account => account.member_id === selectedId) || null;
  const balance = normalizeRewardPoints(selectedAccount?.points_balance);
  const unlocked = highestUnlockedReward(balance);
  const next = nextRewardMilestone(balance);

  async function saveAdjustment() {
    if (!selectedMember) return;
    const amount = Math.floor(Number(form.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Enter a whole number of points greater than zero.');
      return;
    }

    if (form.type === 'redeem' && amount > balance) {
      setMessage(`Cannot redeem ${amount} points. Current balance is ${balance}.`);
      return;
    }

    setSaving(true);
    setMessage('');

    const currentEarned = normalizeRewardPoints(selectedAccount?.total_earned);
    const currentRedeemed = normalizeRewardPoints(selectedAccount?.total_redeemed);
    const isRedeem = form.type === 'redeem';
    const nextBalance = isRedeem ? balance - amount : balance + amount;
    const nextEarned = isRedeem ? currentEarned : currentEarned + amount;
    const nextRedeemed = isRedeem ? currentRedeemed + amount : currentRedeemed;
    const memberLabel = displayName(selectedMember);

    const { error: accountError } = await supabase.from('loyalty_points').upsert({
      member_id: selectedMember.id,
      member_name: memberLabel,
      points_balance: nextBalance,
      total_earned: nextEarned,
      total_redeemed: nextRedeemed,
      points_rate: 1,
      tier: 'fixed_rewards',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'member_id' });

    if (accountError) {
      setMessage(`Error: ${accountError.message}`);
      setSaving(false);
      return;
    }

    const description = form.description.trim()
      || (isRedeem ? `Fixed reward redemption: ${amount} points` : `Manual fixed reward adjustment: +${amount} points`);

    const { error: transactionError } = await supabase.from('points_transactions').insert({
      member_id: selectedMember.id,
      member_name: memberLabel,
      type: isRedeem ? 'redeem' : form.type,
      amount,
      rate_applied: 1,
      purchase_amount: null,
      description,
    });

    if (transactionError) {
      setMessage(`Balance updated, but activity log failed: ${transactionError.message}`);
    } else {
      setMessage(isRedeem ? `✅ Redeemed ${amount} points.` : `✅ Added ${amount} points.`);
    }

    setForm({ type: 'bonus', amount: '', description: '' });
    await loadData();
    setSaving(false);
  }

  return (
    <main style={{ minHeight: '100vh', background: '#050505', color: '#F5F5F5', padding: '28px 20px', ...FB }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <a href="/admin" style={{ color: '#6B7280', textDecoration: 'none', fontSize: 12 }}>← Admin</a>
          <div>
            <h1 style={{ ...F, fontSize: 28, fontWeight: 900, letterSpacing: 1.5, margin: 0 }}>⭐ REWARD POINTS</h1>
            <div style={{ color: '#B8C1CC', fontSize: 12, marginTop: 3 }}>One whole point per 100 DKK. No percentage tiers or coins.</div>
          </div>
        </div>

        <section style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div style={{ ...F, fontWeight: 900, color: '#FACC15', fontSize: 15, marginBottom: 8 }}>FIXED REWARD MILESTONES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8 }}>
            {REWARD_MILESTONES.map(milestone => (
              <div key={milestone.points} style={{ background: '#071426', borderRadius: 9, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ ...F, fontSize: 17, fontWeight: 900 }}>{milestone.points} POINTS</div>
                <div style={{ color: '#B8C1CC', fontSize: 11 }}>{milestone.discountDkk} DKK reward</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 300px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <section style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <div style={{ ...F, fontWeight: 900, fontSize: 16, marginBottom: 12 }}>RACERS</div>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search racer…"
              style={{ width: '100%', boxSizing: 'border-box', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '9px 11px', color: '#F5F5F5', marginBottom: 10 }}
            />

            <div style={{ maxHeight: 610, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {loading ? (
                <div style={{ color: '#6B7280', fontSize: 12, padding: 12 }}>Loading…</div>
              ) : filteredMembers.map(member => {
                const account = accounts.find(row => row.member_id === member.id);
                const memberBalance = normalizeRewardPoints(account?.points_balance);
                const active = selectedId === member.id;
                return (
                  <button
                    key={member.id}
                    onClick={() => { setSelectedId(member.id); setMessage(''); }}
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: 8, padding: '9px 10px', background: active ? 'rgba(220,38,38,0.14)' : 'rgba(255,255,255,0.025)', border: active ? '1px solid rgba(220,38,38,0.35)' : '1px solid transparent', color: '#F5F5F5' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{displayName(member)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: '#6B7280', fontSize: 11, marginTop: 3 }}>
                      <span>{member.member_status === 'official' ? 'Official' : 'Registered'}</span>
                      <span style={{ color: '#FACC15', fontWeight: 700 }}>{memberBalance} pts</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            {!selectedMember ? (
              <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 44, textAlign: 'center', color: '#6B7280' }}>Select a racer to view or adjust Reward Points.</div>
            ) : (
              <>
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div>
                      <div style={{ ...F, fontSize: 21, fontWeight: 900 }}>{displayName(selectedMember)}</div>
                      <div style={{ color: '#6B7280', fontSize: 11, marginTop: 2 }}>{selectedMember.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ ...F, color: '#FACC15', fontWeight: 900, fontSize: 34, lineHeight: 1 }}>{balance}</div>
                      <div style={{ color: '#6B7280', fontSize: 10 }}>AVAILABLE POINTS</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                    <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 8, padding: 10 }}>
                      <div style={{ color: '#6B7280', fontSize: 10 }}>TOTAL EARNED</div>
                      <div style={{ ...F, fontSize: 18, fontWeight: 900, marginTop: 2 }}>{normalizeRewardPoints(selectedAccount?.total_earned)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 8, padding: 10 }}>
                      <div style={{ color: '#6B7280', fontSize: 10 }}>TOTAL REDEEMED</div>
                      <div style={{ ...F, fontSize: 18, fontWeight: 900, marginTop: 2 }}>{normalizeRewardPoints(selectedAccount?.total_redeemed)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 8, padding: 10 }}>
                      <div style={{ color: '#6B7280', fontSize: 10 }}>AVAILABLE REWARD</div>
                      <div style={{ ...F, fontSize: 18, fontWeight: 900, marginTop: 2, color: unlocked ? '#22C55E' : '#B8C1CC' }}>{unlocked ? `${unlocked.discountDkk} DKK` : 'Not yet'}</div>
                    </div>
                  </div>

                  {next && <div style={{ color: '#B8C1CC', fontSize: 11, marginTop: 12 }}>{next.points - balance} more points to reach the {next.discountDkk} DKK reward.</div>}
                </div>

                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 14 }}>
                  <div style={{ ...F, fontSize: 16, fontWeight: 900, marginBottom: 13 }}>ADJUST POINTS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 10 }}>
                    <select value={form.type} onChange={event => setForm(previous => ({ ...previous, type: event.target.value }))} style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '9px 10px', color: '#F5F5F5' }}>
                      <option value="bonus">Add bonus points</option>
                      <option value="adjust">Add manual points</option>
                      <option value="redeem">Redeem points</option>
                    </select>
                    <input type="number" min="1" step="1" value={form.amount} onChange={event => setForm(previous => ({ ...previous, amount: event.target.value }))} placeholder="Whole points" style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '9px 10px', color: '#F5F5F5' }} />
                  </div>
                  <input value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} placeholder="Reason or reward used" style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '9px 10px', color: '#F5F5F5' }} />
                  <button onClick={saveAdjustment} disabled={saving} style={{ marginTop: 10, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 16px', cursor: 'pointer', opacity: saving ? 0.55 : 1, fontWeight: 800 }}>{saving ? 'SAVING…' : form.type === 'redeem' ? 'REDEEM POINTS' : 'ADD POINTS'}</button>
                  {message && <div style={{ color: message.startsWith('✅') ? '#22C55E' : '#FACC15', fontSize: 12, marginTop: 9 }}>{message}</div>}
                </div>

                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
                  <div style={{ ...F, fontSize: 16, fontWeight: 900, marginBottom: 13 }}>RECENT POINT ACTIVITY</div>
                  {transactions.filter(transaction => transaction.member_id === selectedMember.id).length === 0 ? (
                    <div style={{ color: '#6B7280', fontSize: 12 }}>No point activity recorded.</div>
                  ) : transactions.filter(transaction => transaction.member_id === selectedMember.id).slice(0, 12).map(transaction => {
                    const redeem = transaction.type === 'redeem';
                    return (
                      <div key={transaction.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12 }}>{transaction.description || transaction.type}</div>
                          <div style={{ color: '#6B7280', fontSize: 10, marginTop: 2 }}>{transaction.created_at ? new Date(transaction.created_at).toLocaleDateString('en-GB') : ''}</div>
                        </div>
                        <div style={{ ...F, color: redeem ? '#DC2626' : '#22C55E', fontWeight: 900 }}>{redeem ? '-' : '+'}{normalizeRewardPoints(transaction.amount)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
