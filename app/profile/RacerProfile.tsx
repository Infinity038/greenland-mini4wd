// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  getMemberData,
  getMemberDataFromSupabase,
  getMemberOrdersFromSupabase,
  getTicketWallet,
  logout,
} from '@/lib/member';
import type { Member, TicketWallet } from '@/lib/member';
import { daysRemaining, isMemberActive } from '@/lib/loyalty';
import {
  REWARD_MILESTONES,
  highestUnlockedReward,
  normalizeRewardPoints,
  rewardPointsFromEligibleSpend,
  rewardProgress,
} from '@/lib/rewards';
import { supabase } from '@/lib/supabase';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const ZERO_WALLET: TicketWallet = {
  paid_total: 0,
  paid_used: 0,
  paid_available: 0,
  bonus_available: 0,
  loyalty_progress: 0,
  loyalty_needed: 10,
};

const RACE_ACHIEVEMENTS: Record<string, { label: string; color: string }> = {
  season_3rd: { label: '🥉 SEASON 3RD', color: '#CD7C2F' },
  season_2nd: { label: '🥈 SEASON 2ND', color: '#D1D5DB' },
  season_1st: { label: '🏆 SEASON CHAMPION', color: '#FACC15' },
  hall_of_fame: { label: '🏛️ HALL OF FAME', color: '#DC2626' },
};

const TICKET_LABELS: Record<string, string> = {
  weekly_earlybird: '🐦 Early Bird',
  weekly: '🏁 Weekly',
  season: '🏆 Season',
  bonus: '🎁 Bonus',
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  payment_confirmed: '✅ Confirmed',
  completed: '✅ Confirmed',
  proof_uploaded: '🔄 Proof Uploaded',
  awaiting_payment: '⏳ Awaiting Payment',
  cancelled: '❌ Cancelled',
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  payment_confirmed: '#22C55E',
  completed: '#22C55E',
  proof_uploaded: '#3B82F6',
  awaiting_payment: '#FACC15',
  cancelled: '#DC2626',
};

type Tab = 'overview' | 'racing' | 'garage' | 'orders' | 'wishlist';

function memberName(member: any): string {
  return member?.name
    || `${member?.first_name || ''} ${member?.last_name || ''}`.trim()
    || member?.email
    || 'Racer';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
      <div style={{ ...F, fontWeight: 900, fontSize: 20, letterSpacing: 1, marginBottom: 7 }}>{title}</div>
      <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>{body}</div>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </Card>
  );
}

export default function RacerProfile() {
  const [member, setMember] = useState<Member | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<TicketWallet>(ZERO_WALLET);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [cars, setCars] = useState<any[]>([]);
  const [raceEntries, setRaceEntries] = useState<any[]>([]);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'overview';
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (requested === 'racing' || requested === 'garage' || requested === 'orders' || requested === 'wishlist') return requested;
    if (requested === 'tickets') return 'racing';
    return 'overview';
  });

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', avatar_url: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [addingCar, setAddingCar] = useState(false);
  const [carSaving, setCarSaving] = useState(false);
  const [carForm, setCarForm] = useState({
    name: '',
    chassis: 'AR',
    series: '',
    color: '',
    image_url: '',
    bought_from: 'outside',
    notes: '',
  });
  const carFileRef = useRef<HTMLInputElement>(null);

  async function loadProfile() {
    const local = getMemberData();
    if (!local?.email) {
      setLoading(false);
      return;
    }

    setLoadError('');
    try {
      const resolvedMember = await getMemberDataFromSupabase(local.email) || local;
      const [memberOrders, ticketWallet, carsResult, ticketResult, entryResult, wishlistResult] = await Promise.all([
        getMemberOrdersFromSupabase(local.email),
        getTicketWallet(local.email),
        supabase.from('cars').select('*').eq('member_email', local.email).order('created_at', { ascending: false }),
        supabase.from('race_tickets').select('*').eq('member_email', local.email).order('created_at', { ascending: false }),
        supabase.from('race_entries').select('*').eq('member_email', local.email).order('created_at', { ascending: false }),
        supabase.from('wishlist').select('*').eq('member_email', local.email).order('created_at', { ascending: false }),
      ]);

      setMember(resolvedMember);
      setEditForm({ name: memberName(resolvedMember), avatar_url: resolvedMember?.avatar_url || '' });
      setOrders(memberOrders || []);
      setWallet(ticketWallet || ZERO_WALLET);
      setCars(carsResult.data || []);
      setTicketHistory(ticketResult.data || []);
      setRaceEntries(entryResult.data || []);

      if (resolvedMember?.id) {
        const [{ data: rewardData }, { data: requestData }] = await Promise.all([
          supabase
            .from('loyalty_points')
            .select('points_balance, points_rate')
            .eq('member_id', resolvedMember.id)
            .maybeSingle(),
          supabase
            .from('profile_edit_requests')
            .select('*')
            .eq('member_id', resolvedMember.id)
            .eq('status', 'pending')
            .maybeSingle(),
        ]);

        // During the migration preview, legacy percentage rows do not have the
        // fixed rate marker yet. Derive their temporary display from the stored
        // eligible-spend total instead of exposing the obsolete fractional value.
        const hasFixedRewardRow = Number(rewardData?.points_rate) === 1;
        const balance = hasFixedRewardRow
          ? normalizeRewardPoints(rewardData?.points_balance)
          : rewardPointsFromEligibleSpend((resolvedMember as any)?.lifetime_spending);
        setRewardPoints(balance);
        setPendingRequest(requestData || null);
      } else {
        setRewardPoints(0);
        setPendingRequest(null);
      }

      const wishlistRows = wishlistResult.data || [];
      if (wishlistRows.length) {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .in('id', wishlistRows.map((row: any) => row.product_id));
        setWishlist(wishlistRows.map((row: any) => ({
          ...row,
          product: (products || []).find((product: any) => product.id === row.product_id),
        })));
      } else {
        setWishlist([]);
      }
    } catch (error) {
      setMember(local);
      setLoadError('Some profile information could not be refreshed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAvatarFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setEditForm(previous => ({ ...previous, avatar_url: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function submitProfileEdit() {
    if (!member?.id) return;
    const currentName = memberName(member);
    const nameChanged = editForm.name.trim() && editForm.name.trim() !== currentName;
    const avatarChanged = editForm.avatar_url && editForm.avatar_url !== ((member as any)?.avatar_url || '');
    if (!nameChanged && !avatarChanged) {
      setEditMsg('No changes to submit.');
      return;
    }

    setEditSaving(true);
    const { data, error } = await supabase.from('profile_edit_requests').insert({
      member_id: member.id,
      member_email: member.email,
      current_name: currentName,
      requested_name: nameChanged ? editForm.name.trim() : null,
      current_avatar_url: (member as any)?.avatar_url || null,
      requested_avatar_url: avatarChanged ? editForm.avatar_url : null,
      status: 'pending',
    }).select().single();

    if (error) {
      setEditMsg(`Error: ${error.message}`);
    } else {
      setPendingRequest(data);
      setEditMsg('✅ Submitted for approval.');
      setTimeout(() => {
        setShowEditProfile(false);
        setEditMsg('');
      }, 1600);
    }
    setEditSaving(false);
  }

  function handleCarFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCarForm(previous => ({ ...previous, image_url: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function registerCar() {
    if (!carForm.name.trim() || !member?.email) return;
    setCarSaving(true);
    await supabase.from('cars').insert({
      ...carForm,
      name: carForm.name.trim(),
      member_email: member.email,
      member_name: memberName(member),
      status: 'pending',
    });
    const { data } = await supabase
      .from('cars')
      .select('*')
      .eq('member_email', member.email)
      .order('created_at', { ascending: false });
    setCars(data || []);
    setCarForm({ name: '', chassis: 'AR', series: '', color: '', image_url: '', bought_from: 'outside', notes: '' });
    setAddingCar(false);
    setCarSaving(false);
  }

  async function removeCar(id: string) {
    if (!window.confirm('Remove this car from your garage?')) return;
    await supabase.from('cars').delete().eq('id', id);
    setCars(previous => previous.filter(car => car.id !== id));
  }

  async function removeWishlistItem(id: string) {
    await supabase.from('wishlist').delete().eq('id', id);
    setWishlist(previous => previous.filter(item => item.id !== id));
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...FB, color: '#B8C1CC' }}>Loading racer profile…</div>
      </div>
    );
  }

  if (!member) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '80vh', background: '#050505', padding: '120px 24px 60px' }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <EmptyState
              icon="🏁"
              title="RACER PROFILE NOT FOUND"
              body="Register or sign in to view your membership, tickets, cars and race activity."
              action={<a href="/register" style={{ display: 'inline-block', background: '#DC2626', color: '#fff', borderRadius: 9, padding: '11px 20px', textDecoration: 'none', ...F, fontWeight: 900, letterSpacing: 1 }}>REGISTER / SIGN IN</a>}
            />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const active = isMemberActive(member as any);
  const daysLeft = daysRemaining(member as any);
  const achievement = RACE_ACHIEVEMENTS[(member as any)?.loyalty_tier];
  const availableTickets = wallet.paid_available + wallet.bonus_available;
  const progress = rewardProgress(rewardPoints);
  const unlockedReward = highestUnlockedReward(rewardPoints);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'racing', label: 'Racing' },
    { key: 'garage', label: 'Garage' },
    { key: 'orders', label: 'Orders' },
    { key: 'wishlist', label: 'Wishlist' },
  ];

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh', paddingTop: 60 }}>
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '30px 20px 0' }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...F, fontWeight: 900, fontSize: 30 }}>
                  {(member as any)?.avatar_url
                    ? <img src={(member as any).avatar_url} alt={memberName(member)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : memberName(member)[0]?.toUpperCase() || 'R'}
                </div>
                <button onClick={() => setShowEditProfile(true)} aria-label="Edit profile" style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%', border: '2px solid #050505', background: '#1F2937', cursor: 'pointer' }}>✏️</button>
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <h1 style={{ ...F, fontSize: 30, fontWeight: 900, margin: '0 0 5px' }}>{memberName(member)}</h1>
                <div style={{ ...FB, color: '#B8C1CC', fontSize: 13, marginBottom: 11 }}>{member.email}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  <span style={{ ...F, fontSize: 10, letterSpacing: 1.5, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: member.member_status === 'official' ? 'rgba(250,204,21,0.14)' : 'rgba(59,130,246,0.14)', color: member.member_status === 'official' ? '#FACC15' : '#93C5FD', border: `1px solid ${member.member_status === 'official' ? 'rgba(250,204,21,0.32)' : 'rgba(59,130,246,0.32)'}` }}>
                    {member.member_status === 'official' ? '✓ OFFICIAL RACER' : 'REGISTERED RACER'}
                  </span>
                  <span style={{ ...F, fontSize: 10, letterSpacing: 1.5, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: active ? 'rgba(34,197,94,0.14)' : 'rgba(220,38,38,0.14)', color: active ? '#22C55E' : '#F87171', border: `1px solid ${active ? 'rgba(34,197,94,0.32)' : 'rgba(220,38,38,0.32)'}` }}>
                    {active ? `🟢 MEMBERSHIP ACTIVE · ${daysLeft} DAYS` : '🔴 MEMBERSHIP INACTIVE'}
                  </span>
                  {achievement && (
                    <span style={{ ...F, fontSize: 10, letterSpacing: 1.5, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: `${achievement.color}18`, color: achievement.color, border: `1px solid ${achievement.color}55` }}>
                      {achievement.label}
                    </span>
                  )}
                </div>
                {pendingRequest && <div style={{ ...FB, marginTop: 10, color: '#FACC15', fontSize: 12 }}>⏳ Profile change awaiting admin approval</div>}
              </div>

              <button onClick={logout} style={{ ...FB, fontSize: 12, color: '#B8C1CC', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Logout</button>
            </div>

            <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
              {tabs.map(item => (
                <button key={item.key} onClick={() => setTab(item.key)} style={{ ...F, fontWeight: 800, fontSize: 13, letterSpacing: 1.5, whiteSpace: 'nowrap', padding: '12px 18px', cursor: 'pointer', border: 'none', borderTop: tab === item.key ? '2px solid #DC2626' : '2px solid transparent', borderRadius: '8px 8px 0 0', background: tab === item.key ? '#050505' : 'transparent', color: tab === item.key ? '#DC2626' : '#B8C1CC' }}>
                  {item.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px 56px' }}>
          {loadError && <div style={{ ...FB, color: '#FACC15', background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.22)', borderRadius: 10, padding: '11px 14px', marginBottom: 16 }}>{loadError}</div>}

          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12 }}>
                {[
                  { icon: '⭐', label: 'Reward Points', value: rewardPoints, color: '#FACC15' },
                  { icon: '🎟️', label: 'Race Tickets', value: availableTickets, color: '#22C55E' },
                  { icon: '🏎️', label: 'Registered Cars', value: cars.length, color: '#3B82F6' },
                  { icon: '🏁', label: 'Race Entries', value: raceEntries.length, color: '#DC2626' },
                ].map(stat => (
                  <Card key={stat.label}>
                    <div style={{ fontSize: 21, marginBottom: 7 }}>{stat.icon}</div>
                    <div style={{ ...F, fontSize: 34, lineHeight: 1, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 5 }}>{stat.label}</div>
                  </Card>
                ))}
              </div>

              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                  <div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 20, letterSpacing: 1 }}>REWARD POINTS</div>
                    <div style={{ ...FB, color: '#B8C1CC', fontSize: 13, marginTop: 3 }}>1 point for every 100 DKK of confirmed eligible purchases.</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...F, color: '#FACC15', fontWeight: 900, fontSize: 30, lineHeight: 1 }}>{rewardPoints}</div>
                    <div style={{ ...FB, color: '#6B7280', fontSize: 11 }}>CURRENT BALANCE</div>
                  </div>
                </div>

                {progress.next ? (
                  <>
                    <div style={{ height: 10, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: `${progress.percentage}%`, height: '100%', background: 'linear-gradient(90deg, #F59E0B, #FACC15)', borderRadius: 10 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 7, ...FB, fontSize: 12, color: '#B8C1CC' }}>
                      <span>{progress.pointsNeeded} more point{progress.pointsNeeded === 1 ? '' : 's'}</span>
                      <span>{progress.next.points} points = {progress.next.discountDkk} DKK reward</span>
                    </div>
                  </>
                ) : (
                  <div style={{ ...FB, color: '#22C55E', fontSize: 13 }}>Maximum listed reward milestone reached.</div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 18 }}>
                  {REWARD_MILESTONES.map(milestone => {
                    const reached = rewardPoints >= milestone.points;
                    return (
                      <div key={milestone.points} style={{ background: reached ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.025)', border: `1px solid ${reached ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 9, padding: '10px 11px' }}>
                        <div style={{ ...F, fontSize: 16, fontWeight: 900, color: reached ? '#22C55E' : '#F5F5F5' }}>{milestone.points} POINTS</div>
                        <div style={{ ...FB, fontSize: 11, color: '#B8C1CC', marginTop: 2 }}>{milestone.discountDkk} DKK reward</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ ...FB, color: '#6B7280', fontSize: 11, lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16, paddingTop: 12 }}>
                  Your spending total is not displayed on your profile. Staff can redeem an available fixed reward when you make an eligible purchase.
                  {unlockedReward && <span style={{ color: '#FACC15' }}> You currently qualify for up to {unlockedReward.discountDkk} DKK.</span>}
                </div>
              </Card>

              <Card>
                <div style={{ ...F, fontSize: 16, fontWeight: 900, letterSpacing: 1.5, marginBottom: 15 }}>RACER DETAILS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 16 }}>
                  {[
                    ['Membership', active ? `Active · ${daysLeft} days left` : 'Inactive'],
                    ['Member Since', formatDate(member.created_at)],
                    ['City', member.city || '—'],
                    ['Nationality', member.nationality || '—'],
                    ['Experience', member.experience || '—'],
                    ['Favorite Chassis', member.favorite_chassis || 'Not set'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginBottom: 3 }}>{label}</div>
                      <div style={{ ...FB, fontSize: 14, fontWeight: 650, color: '#F5F5F5', textTransform: 'capitalize' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {raceEntries.length > 0 && (
                <Card>
                  <div style={{ ...F, fontSize: 16, fontWeight: 900, letterSpacing: 1.5, marginBottom: 13 }}>RECENT RACE ACTIVITY</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {raceEntries.slice(0, 3).map(entry => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 9, padding: '10px 12px' }}>
                        <span style={{ fontSize: 21 }}>🏎️</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...F, fontSize: 15, fontWeight: 800 }}>{entry.car_name || 'Race entry'}</div>
                          <div style={{ ...FB, fontSize: 11, color: '#B8C1CC' }}>{String(entry.race_category || 'race').replaceAll('_', ' ').toUpperCase()} · {formatDate(entry.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === 'racing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Paid Available', value: wallet.paid_available, color: '#22C55E' },
                  { label: 'Bonus Available', value: wallet.bonus_available, color: '#FACC15' },
                  { label: 'Race Entries', value: raceEntries.length, color: '#3B82F6' },
                ].map(stat => (
                  <Card key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{ ...F, fontSize: 38, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{stat.label}</div>
                  </Card>
                ))}
              </div>

              <Card>
                <div style={{ ...F, fontSize: 18, fontWeight: 900, marginBottom: 14 }}>MY RACE ENTRIES</div>
                {raceEntries.length === 0 ? (
                  <div style={{ ...FB, color: '#6B7280', fontSize: 13 }}>No race entries yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {raceEntries.map(entry => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', background: 'rgba(255,255,255,0.025)', borderRadius: 9 }}>
                        <span style={{ fontSize: 21 }}>🏁</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...F, fontWeight: 800, fontSize: 15 }}>{entry.car_name || 'Race entry'}</div>
                          <div style={{ ...FB, fontSize: 11, color: '#B8C1CC' }}>{String(entry.race_category || 'race').replaceAll('_', ' ').toUpperCase()} · {formatDate(entry.created_at)}</div>
                        </div>
                        <span style={{ ...F, fontSize: 10, color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20, padding: '3px 8px' }}>ENTERED</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <div style={{ ...F, fontSize: 18, fontWeight: 900, marginBottom: 14 }}>TICKET HISTORY</div>
                {ticketHistory.length === 0 ? (
                  <div style={{ ...FB, color: '#6B7280', fontSize: 13 }}>No race tickets purchased yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ticketHistory.map(ticket => {
                      const color = TICKET_STATUS_COLORS[ticket.payment_status] || '#6B7280';
                      return (
                        <div key={ticket.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 13px', background: 'rgba(255,255,255,0.025)', borderRadius: 9 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ ...F, fontWeight: 800, fontSize: 15 }}>{TICKET_LABELS[ticket.ticket_type] || ticket.ticket_type || 'Race Ticket'} × {ticket.quantity || 1}</div>
                            <div style={{ ...FB, fontSize: 11, color: '#B8C1CC', marginTop: 2 }}>{formatDate(ticket.created_at)}{ticket.total_price ? ` · ${ticket.total_price} DKK` : ''}</div>
                          </div>
                          <span style={{ ...F, fontSize: 10, color, background: `${color}16`, border: `1px solid ${color}44`, borderRadius: 20, padding: '3px 8px' }}>{TICKET_STATUS_LABELS[ticket.payment_status] || ticket.payment_status}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <a href="/how-to-join" style={{ textAlign: 'center', background: '#DC2626', color: '#fff', borderRadius: 10, padding: '14px 20px', textDecoration: 'none', ...F, fontWeight: 900, fontSize: 16, letterSpacing: 1.5 }}>VIEW RACE INFORMATION →</a>
            </div>
          )}

          {tab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.length === 0 ? (
                <EmptyState icon="📦" title="NO ORDERS YET" body={<>Browse the <a href="/shop" style={{ color: '#DC2626' }}>shop</a> to see available kits and parts.</>} />
              ) : orders.map(order => {
                const status = order.payment_status || order.status;
                const color = ORDER_STATUS_COLORS[status] || '#6B7280';
                return (
                  <Card key={order.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ ...F, fontSize: 19, fontWeight: 900 }}>{order.product_name || 'Order'}</div>
                        <div style={{ ...FB, color: '#B8C1CC', fontSize: 12, marginTop: 3 }}>{formatDate(order.created_at)}{order.quantity ? ` · Qty ${order.quantity}` : ''}</div>
                        {order.notes && <div style={{ ...FB, color: '#FACC15', fontSize: 11, marginTop: 5 }}>{order.notes}</div>}
                      </div>
                      <span style={{ ...F, fontSize: 10, letterSpacing: 1, color, background: `${color}16`, border: `1px solid ${color}44`, borderRadius: 20, padding: '4px 9px', height: 'fit-content' }}>{ORDER_STATUS_LABELS[status] || status}</span>
                    </div>
                    {status === 'awaiting_payment' && (
                      <div style={{ ...FB, marginTop: 12, color: '#FACC15', background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 8, padding: 11, fontSize: 12 }}>
                        Payment reference: <strong>{order.payment_reference || 'Contact staff'}</strong>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {tab === 'garage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ ...F, fontSize: 22, fontWeight: 900 }}>MY GARAGE</div>
                  <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>Cars require staff approval before race entry.</div>
                </div>
                <button onClick={() => setAddingCar(true)} style={{ background: '#DC2626', border: 'none', borderRadius: 8, padding: '9px 15px', color: '#fff', cursor: 'pointer', ...F, fontWeight: 900, letterSpacing: 1 }}>+ ADD CAR</button>
              </div>

              {addingCar && (
                <Card style={{ borderColor: 'rgba(220,38,38,0.28)' }}>
                  <div style={{ ...F, fontSize: 18, fontWeight: 900, marginBottom: 15 }}>REGISTER A CAR</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                    {[
                      ['CAR NAME / NICKNAME', 'name', 'e.g. Shadow Shark'],
                      ['SERIES / MODEL', 'series', 'e.g. Geo Glider'],
                      ['COLOR / BODY', 'color', 'e.g. Blue / Stock body'],
                    ].map(([label, key, placeholder]) => (
                      <label key={key} style={{ ...F, fontSize: 10, letterSpacing: 1.5, color: '#B8C1CC' }}>
                        {label}
                        <input value={carForm[key]} onChange={event => setCarForm(previous => ({ ...previous, [key]: event.target.value }))} placeholder={placeholder} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, background: '#050505', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8, padding: '10px 12px', color: '#F5F5F5', ...FB, fontSize: 13 }} />
                      </label>
                    ))}

                    <label style={{ ...F, fontSize: 10, letterSpacing: 1.5, color: '#B8C1CC' }}>
                      CHASSIS
                      <select value={carForm.chassis} onChange={event => setCarForm(previous => ({ ...previous, chassis: event.target.value }))} style={{ display: 'block', width: '100%', marginTop: 5, background: '#050505', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8, padding: '10px 12px', color: '#F5F5F5', ...FB, fontSize: 13 }}>
                        {['AR', 'MA', 'VS', 'MS', 'FM-A', 'S2', 'VZ', 'Other'].map(chassis => <option key={chassis}>{chassis}</option>)}
                      </select>
                    </label>

                    <label style={{ ...F, fontSize: 10, letterSpacing: 1.5, color: '#B8C1CC' }}>
                      BOUGHT FROM
                      <select value={carForm.bought_from} onChange={event => setCarForm(previous => ({ ...previous, bought_from: event.target.value }))} style={{ display: 'block', width: '100%', marginTop: 5, background: '#050505', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8, padding: '10px 12px', color: '#F5F5F5', ...FB, fontSize: 13 }}>
                        <option value="club_shop">Club Shop</option>
                        <option value="outside">Outside / Personal</option>
                      </select>
                    </label>

                    <label style={{ ...F, fontSize: 10, letterSpacing: 1.5, color: '#B8C1CC' }}>
                      NOTES
                      <input value={carForm.notes} onChange={event => setCarForm(previous => ({ ...previous, notes: event.target.value }))} placeholder="Optional tuning notes" style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, background: '#050505', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8, padding: '10px 12px', color: '#F5F5F5', ...FB, fontSize: 13 }} />
                    </label>
                  </div>

                  <div onClick={() => carFileRef.current?.click()} style={{ marginTop: 14, border: '1px dashed rgba(255,255,255,0.18)', borderRadius: 9, padding: 14, cursor: 'pointer', textAlign: 'center', ...FB, color: '#B8C1CC', fontSize: 12 }}>
                    {carForm.image_url ? <img src={carForm.image_url} alt="Car preview" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8 }} /> : '📷 Add an optional car photo'}
                  </div>
                  <input ref={carFileRef} type="file" accept="image/*" onChange={handleCarFile} style={{ display: 'none' }} />

                  <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
                    <button onClick={registerCar} disabled={carSaving || !carForm.name.trim()} style={{ flex: 1, background: '#DC2626', border: 'none', borderRadius: 8, color: '#fff', padding: 11, cursor: 'pointer', opacity: carSaving || !carForm.name.trim() ? 0.5 : 1, ...F, fontWeight: 900, letterSpacing: 1 }}>{carSaving ? 'SAVING…' : 'REGISTER CAR'}</button>
                    <button onClick={() => setAddingCar(false)} style={{ background: 'none', color: '#B8C1CC', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0 15px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </Card>
              )}

              {cars.length === 0 && !addingCar ? (
                <EmptyState icon="🏎️" title="NO CARS REGISTERED" body="Register your first Mini 4WD car to prepare for race entry." />
              ) : cars.map(car => {
                const statusColor = car.status === 'approved' ? '#22C55E' : car.status === 'rejected' ? '#DC2626' : '#FACC15';
                return (
                  <Card key={car.id}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 68, height: 68, flexShrink: 0, borderRadius: 9, overflow: 'hidden', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {car.image_url ? <img src={car.image_url} alt={car.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 27 }}>🏎️</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ ...F, fontSize: 18, fontWeight: 900 }}>{car.name}</span>
                          <span style={{ ...F, fontSize: 9, color: statusColor, background: `${statusColor}16`, border: `1px solid ${statusColor}44`, borderRadius: 20, padding: '3px 7px' }}>{String(car.status || 'pending').toUpperCase()}</span>
                        </div>
                        <div style={{ ...FB, color: '#B8C1CC', fontSize: 12, marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {car.chassis && <span>Chassis: <strong>{car.chassis}</strong></span>}
                          {car.series && <span>Model: <strong>{car.series}</strong></span>}
                          <span>{car.bought_from === 'club_shop' ? 'Club Shop' : 'Personal car'}</span>
                        </div>
                        {car.notes && <div style={{ ...FB, color: '#6B7280', fontSize: 11, marginTop: 5 }}>{car.notes}</div>}
                      </div>
                      <button onClick={() => removeCar(car.id)} style={{ background: 'rgba(220,38,38,0.08)', color: '#F87171', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 7, padding: '6px 9px', cursor: 'pointer', ...FB, fontSize: 11 }}>Remove</button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === 'wishlist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {wishlist.length === 0 ? (
                <EmptyState icon="♡" title="NOTHING SAVED" body={<>Browse the <a href="/shop" style={{ color: '#DC2626' }}>shop</a> and save products for later.</>} />
              ) : wishlist.map(item => {
                const product = item.product;
                if (!product) return null;
                const hasPrice = !product.price_on_request && Number(product.price_dkk) > 0;
                return (
                  <Card key={item.id} style={{ padding: 15 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                      <div style={{ width: 58, height: 58, flexShrink: 0, borderRadius: 8, background: '#050505', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {product.image_url ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span>🏎️</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...F, fontWeight: 850, fontSize: 16 }}>{product.name}</div>
                        <div style={{ ...FB, fontSize: 11, color: hasPrice ? '#FACC15' : '#B8C1CC', marginTop: 3 }}>{hasPrice ? `${product.price_dkk} DKK` : 'Price on request'}</div>
                      </div>
                      <a href={`/shop?product=${product.id}`} style={{ background: '#DC2626', color: '#fff', textDecoration: 'none', borderRadius: 7, padding: '7px 10px', ...F, fontSize: 11, fontWeight: 900 }}>VIEW</a>
                      <button onClick={() => removeWishlistItem(item.id)} aria-label="Remove from wishlist" style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 17 }}>✕</button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {showEditProfile && (
          <>
            <div onClick={() => setShowEditProfile(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 80 }} />
            <div style={{ position: 'fixed', zIndex: 81, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 'min(390px, calc(100% - 32px))', background: '#0D1420', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 14, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 18 }}>EDIT PROFILE</div>
                <button onClick={() => setShowEditProfile(false)} style={{ background: 'none', color: '#6B7280', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>

              {pendingRequest ? (
                <div style={{ ...FB, color: '#B8C1CC', fontSize: 13, lineHeight: 1.6 }}>You already have a profile change awaiting staff approval.</div>
              ) : (
                <>
                  <div onClick={() => avatarFileRef.current?.click()} style={{ margin: '0 auto 14px', width: 82, height: 82, borderRadius: '50%', background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', ...F, fontSize: 30, fontWeight: 900 }}>
                    {editForm.avatar_url ? <img src={editForm.avatar_url} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : editForm.name[0]?.toUpperCase() || 'R'}
                  </div>
                  <input ref={avatarFileRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: 'none' }} />
                  <label style={{ ...F, fontSize: 10, letterSpacing: 1.5, color: '#B8C1CC' }}>
                    DISPLAY NAME
                    <input value={editForm.name} onChange={event => setEditForm(previous => ({ ...previous, name: event.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, background: '#050505', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8, padding: '10px 12px', color: '#F5F5F5', ...FB, fontSize: 13 }} />
                  </label>
                  <button onClick={submitProfileEdit} disabled={editSaving} style={{ width: '100%', marginTop: 15, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: 11, cursor: 'pointer', opacity: editSaving ? 0.55 : 1, ...F, fontWeight: 900 }}>{editSaving ? 'SUBMITTING…' : 'SUBMIT FOR APPROVAL'}</button>
                  {editMsg && <div style={{ ...FB, color: '#FACC15', fontSize: 12, textAlign: 'center', marginTop: 9 }}>{editMsg}</div>}
                </>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
