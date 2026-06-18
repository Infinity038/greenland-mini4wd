// @ts-nocheck
'use client';
import { useState, useEffect, useRef } from 'react';
import { getMemberData, isRegistered, generatePaymentRef } from '@/lib/member';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CLASSES = [
  { name: 'Box Stock',      color: '#22C55E', desc: 'Contents inside the box are fixed. What comes in the box is what you use — no modifications allowed.' },
  { name: 'Open Box Stock', color: '#3B82F6', desc: 'Same as Box Stock but with limited cosmetic replacements. Allowed: mag color, cowl color, chassis color only. Cannot change type — only color.' },
  { name: 'B-Max',          color: '#F97316', desc: 'Carbon allowed, gimmicks allowed. Slide damper systems permitted. For experienced builders.' },
  { name: 'Open Class',     color: '#DC2626', desc: 'No restrictions on modifications, motors, or parts. Full performance tuning allowed. Most competitive class.' },
];

const TICKET_TYPES = [
  { id: 'weekly_earlybird', label: 'Early Bird Weekly', price: 130, color: '#22C55E', badge: '🐦 EARLY BIRD', desc: 'Limited slots at discounted price. Weekly tournament entry.' },
  { id: 'weekly', label: 'Weekly Tournament', price: 150, color: '#FACC15', badge: '🏁 WEEKLY', desc: 'Standard weekly tournament entry. 2 qualification lives.' },
  { id: 'season', label: 'End Season', price: 500, color: '#DC2626', badge: '🏆 SEASON', desc: 'Bi-monthly championship event. Higher stakes, bigger prize pool.' },
];

type Step = 'select' | 'confirm' | 'payment' | 'upload' | 'done';

export default function TicketsPage() {
  const [member, setMember] = useState<any>(null);
  const [ticketType, setTicketType] = useState<string>('weekly');
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<Step>('select');
  const [ticketId, setTicketId] = useState('');
  const [payRef, setPayRef] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [earlyBirdLeft, setEarlyBirdLeft] = useState<number | null>(null);
  const [entrants, setEntrants] = useState<any[]>([]);
  const [fighter, setFighter] = useState<any | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [seasonProgress, setSeasonProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'buy' | 'entrants' | 'rules' | 'pass'>('buy');
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = TICKET_TYPES.find(t => t.id === ticketType)!;
  const total = selected.price * quantity;

  useEffect(() => {
    setMember(getMemberData());
    fetchEarlyBirdSlots();
    fetchEntrants();
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p === 'rules' || p === 'entrants' || p === 'pass') setActiveTab(p as any);
    }
  }, []);

  useEffect(() => {
    if (member?.email) fetchLoyalty(member.email);
  }, [member]);

  async function fetchEarlyBirdSlots() {
    const { data } = await supabase.from('race_tickets').select('id').eq('ticket_type', 'weekly_earlybird').eq('payment_status', 'payment_confirmed');
    const { data: cfg } = await supabase.from('admin_config').select('value').eq('key', 'earlybird_slots').single();
    const maxSlots = cfg ? parseInt(cfg.value) : 10;
    setEarlyBirdLeft(Math.max(0, maxSlots - (data?.length || 0)));
  }

  async function fetchEntrants() {
    const { data } = await supabase.from('race_tickets').select('*').eq('payment_status', 'payment_confirmed').order('created_at', { ascending: true });
    setEntrants(data || []);
  }

  async function fetchLoyalty(email: string) {
    const { data } = await supabase.from('members').select('weekly_loyalty_progress, season_loyalty_progress').eq('email', email).single();
    if (data) {
      setWeeklyProgress(data.weekly_loyalty_progress || 0);
      setSeasonProgress(data.season_loyalty_progress || 0);
    }
  }

  async function placeOrder() {
    if (!member) { window.location.href = '/register'; return; }
    setUploading(true); setError('');
    const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email;
    try {
      const { data, error: err } = await supabase.from('race_tickets').insert({
        member_email: member.email,
        member_name: memberName,
        ticket_type: ticketType,
        quantity,
        unit_price: selected.price,
        total_price: total,
        payment_status: 'awaiting_payment',
      }).select().single();
      if (err || !data) throw new Error(err?.message || 'failed');
      const ref = generatePaymentRef(data.id);
      await supabase.from('race_tickets').update({ payment_reference: ref }).eq('id', data.id);
      setTicketId(data.id); setPayRef(ref); setStep('payment');
    } catch (e: any) { setError(e.message || 'Something went wrong. Please try again.'); }
    setUploading(false);
  }

  async function uploadProof() {
    if (!proofFile || !ticketId) return;
    setUploading(true); setError('');
    const r = new FileReader();
    r.onloadend = async () => {
      try {
        await supabase.from('race_tickets').update({ payment_proof_url: r.result as string, payment_status: 'proof_uploaded' }).eq('id', ticketId);
        setStep('done');
      } catch { setError('Upload failed. Try again.'); }
      setUploading(false);
    };
    r.readAsDataURL(proofFile);
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setProofFile(file);
    const r = new FileReader(); r.onloadend = () => setProofPreview(r.result as string); r.readAsDataURL(file);
  };

  const resetFlow = () => { setStep('select'); setTicketId(''); setPayRef(''); setProofFile(null); setProofPreview(null); setError(''); };

  const weeklyEntrants = entrants.filter(e => e.ticket_type === 'weekly' || e.ticket_type === 'weekly_earlybird');
  const seasonEntrants = entrants.filter(e => e.ticket_type === 'season');

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh', paddingTop: 60 }}>

        {/* Header */}
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(220,38,38,0.2)', padding: '40px 24px 0' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 6 }}>THE ARCTIC HUSTLE</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(36px, 8vw, 64px)', margin: '0 0 8px', lineHeight: 0.95 }}>RACE TICKETS</h1>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', margin: '0 0 24px' }}>Buy your entry, register your car, race for glory.</p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
              {[
                { id: 'buy', label: '🎟️ BUY TICKETS' },
                { id: 'entrants', label: '🏎️ ENTRANTS' },
                { id: 'pass', label: '🏆 RACE PASS' },
                { id: 'rules', label: '📋 RULES' },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                  style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, padding: '12px 16px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: '8px 8px 0 0', background: activeTab === t.id ? '#050505' : 'transparent', color: activeTab === t.id ? '#DC2626' : '#B8C1CC', borderTop: activeTab === t.id ? '2px solid #DC2626' : '2px solid transparent' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

          {/* BUY TICKETS TAB */}
          {activeTab === 'buy' && (
            <div>
              {step === 'select' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#B8C1CC', marginBottom: 4 }}>SELECT TICKET TYPE</div>

                  {TICKET_TYPES.map(t => {
                    const isEB = t.id === 'weekly_earlybird';
                    const noSlots = isEB && earlyBirdLeft === 0;
                    const isSelected = ticketType === t.id;
                    return (
                      <div key={t.id} onClick={() => !noSlots && setTicketType(t.id)}
                        style={{ background: isSelected ? '#0a1628' : '#071426', border: `1.5px solid ${isSelected ? t.color : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: 20, cursor: noSlots ? 'not-allowed' : 'pointer', opacity: noSlots ? 0.5 : 1, transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '2px 8px', borderRadius: 20, background: t.color + '22', color: t.color, border: `1px solid ${t.color}44` }}>{t.badge}</span>
                              {isEB && earlyBirdLeft !== null && earlyBirdLeft > 0 && (
                                <span style={{ ...FB, fontSize: 11, color: '#22C55E' }}>{earlyBirdLeft} slots left</span>
                              )}
                              {noSlots && <span style={{ ...FB, fontSize: 11, color: '#DC2626' }}>SOLD OUT</span>}
                            </div>
                            <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5', marginBottom: 4 }}>{t.label}</div>
                            <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{t.desc}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ ...F, fontWeight: 900, fontSize: 32, color: t.color }}>{t.price} <span style={{ fontSize: 16 }}>DKK</span></div>
                            <div style={{ ...FB, fontSize: 11, color: '#B8C1CC' }}>per ticket</div>
                          </div>
                        </div>
                        {isSelected && <div style={{ marginTop: 10, height: 2, background: t.color, borderRadius: 1 }} />}
                      </div>
                    );
                  })}

                  {/* Quantity */}
                  <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                    <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#B8C1CC', marginBottom: 14 }}>QUANTITY</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        style={{ width: 40, height: 40, borderRadius: '50%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ ...F, fontWeight: 900, fontSize: 32, color: '#F5F5F5', minWidth: 40, textAlign: 'center' }}>{quantity}</span>
                      <button onClick={() => setQuantity(q => q + 1)}
                        style={{ width: 40, height: 40, borderRadius: '50%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: '#B8C1CC' }}>TOTAL</div>
                        <div style={{ ...F, fontWeight: 900, fontSize: 28, color: '#FACC15' }}>{total} DKK</div>
                      </div>
                    </div>
                  </div>

                  {/* Rules reminder */}
                  <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: 16, ...FB, fontSize: 13, color: '#FCA5A5', lineHeight: 1.7 }}>
                    <strong style={{ color: '#fff', ...F, fontSize: 15, letterSpacing: 1 }}>⚠️ RACE RULES REMINDER</strong><br />
                    1 ticket = 1 car entry · 2 qualification lives per ticket · Same car cannot enter same category twice · 1 car can enter multiple categories · Free tickets don't count toward loyalty
                  </div>

                  <button onClick={() => {
                    if (!isRegistered()) { window.location.href = '/register'; return; }
                    setStep('confirm');
                  }} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
                    RESERVE {quantity} TICKET{quantity > 1 ? 'S' : ''} — {total} DKK →
                  </button>

                  {!isRegistered() && (
                    <div style={{ textAlign: 'center', ...FB, fontSize: 13, color: '#B8C1CC' }}>
                      <a href="/register" style={{ color: '#DC2626' }}>Register as a member</a> to buy tickets
                    </div>
                  )}
                </div>
              )}

              {step === 'confirm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 4 }}>{selected.label}</div>
                    <div style={{ ...F, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 14 }}>{quantity} ticket{quantity > 1 ? 's' : ''} × {selected.price} DKK</div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 36, color: '#FACC15' }}>{total} DKK</div>
                  </div>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>👤 <span style={{ color: '#F5F5F5' }}>{member?.name || member?.email}</span></div>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>📧 <span style={{ color: '#F5F5F5' }}>{member?.email}</span></div>
                    <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>📍 Pickup/Race: Nuuk, Greenland</div>
                  </div>
                  {error && <div style={{ ...FB, fontSize: 12, color: '#DC2626' }}>{error}</div>}
                  <button onClick={placeOrder} disabled={uploading}
                    style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
                    {uploading ? 'PROCESSING...' : 'CONFIRM ORDER →'}
                  </button>
                  <button onClick={resetFlow} style={{ background: 'none', border: 'none', ...FB, fontSize: 13, color: '#6B7280', cursor: 'pointer' }}>← Back</button>
                </div>
              )}

              {step === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 14, padding: 20 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#FACC15', marginBottom: 12 }}>💳 MOBILEPAY INSTRUCTIONS</div>
                    <ol style={{ ...FB, fontSize: 14, color: '#F5F5F5', lineHeight: 2.2, margin: 0, paddingLeft: 20 }}>
                      <li>Open MobilePay on your phone</li>
                      <li>Send <strong>{total} DKK</strong> to <strong>+45 54 32 79 41</strong> (Jovannie Ducay)</li>
                      <li>Reference: <strong style={{ color: '#FACC15', fontFamily: 'monospace' }}>{payRef}</strong></li>
                      <li>Screenshot the confirmation</li>
                      <li>Upload it on the next step</li>
                    </ol>
                  </div>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 4, color: '#B8C1CC', marginBottom: 4 }}>PAYMENT REFERENCE</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#FACC15', letterSpacing: 4 }}>{payRef}</div>
                  </div>
                  <button onClick={() => setStep('upload')} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
                    I'VE PAID — UPLOAD PROOF →
                  </button>
                  <button onClick={resetFlow} style={{ background: 'none', border: 'none', ...FB, fontSize: 13, color: '#6B7280', cursor: 'pointer' }}>I'll pay later (order saved)</button>
                </div>
              )}

              {step === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', margin: 0 }}>Upload your MobilePay screenshot. Admin will verify and confirm your ticket.</p>
                  <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer' }}>
                    {proofPreview
                      ? <img src={proofPreview} alt="proof" style={{ maxHeight: 160, borderRadius: 8, margin: '0 auto', display: 'block' }} />
                      : <><div style={{ fontSize: 36, marginBottom: 8 }}>📷</div><div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5' }}>Tap to select screenshot</div></>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                  {error && <div style={{ ...FB, fontSize: 12, color: '#DC2626' }}>{error}</div>}
                  <button onClick={uploadProof} disabled={!proofFile || uploading}
                    style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', ...F, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer', opacity: !proofFile || uploading ? 0.4 : 1 }}>
                    {uploading ? 'UPLOADING...' : 'SUBMIT PROOF →'}
                  </button>
                </div>
              )}

              {step === 'done' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>🏁</div>
                  <h3 style={{ ...F, fontWeight: 900, fontSize: 28, color: '#F5F5F5', margin: '0 0 10px' }}>PROOF SUBMITTED!</h3>
                  <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 20, lineHeight: 1.6 }}>Admin will verify your payment. Once confirmed your ticket will be active and you'll appear in the entrant list.</p>
                  <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 4, color: '#B8C1CC', marginBottom: 4 }}>REFERENCE</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: '#FACC15' }}>{payRef}</div>
                  </div>
                  <button onClick={() => { setActiveTab('entrants'); resetFlow(); }} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>
                    VIEW ENTRANTS →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ENTRANTS TAB */}
          {activeTab === 'entrants' && (
            <div>
              {/* Weekly */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#FACC15' }}>🏁 WEEKLY TOURNAMENT ENTRANTS</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(250,204,21,0.2)' }} />
                  <span style={{ ...F, fontSize: 11, color: '#B8C1CC' }}>{weeklyEntrants.length} entered</span>
                </div>
                {weeklyEntrants.length === 0 ? (
                  <div style={{ ...FB, fontSize: 14, color: '#6B7280', textAlign: 'center', padding: '40px 0' }}>No entrants yet. Be the first!</div>
                ) : weeklyEntrants.map((e, i) => (
                  <div key={e.id} onClick={() => setFighter(e)}
                    style={{ background: '#071426', border: `1px solid ${i < 3 ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s' }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 22, color: i === 0 ? '#FACC15' : i === 1 ? '#aaa' : i === 2 ? '#CD7F32' : '#6B7280', minWidth: 32, textAlign: 'center' }}>
                      {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5' }}>{e.member_name}</div>
                      <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                        {e.ticket_type === 'weekly_earlybird' ? '🐦 Early Bird' : '🏁 Weekly'} · {e.quantity} ticket{e.quantity > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ ...F, fontSize: 11, color: '#DC2626', letterSpacing: 1 }}>VIEW →</div>
                  </div>
                ))}
              </div>

              {/* Season */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626' }}>🏆 END SEASON ENTRANTS</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(220,38,38,0.2)' }} />
                  <span style={{ ...F, fontSize: 11, color: '#B8C1CC' }}>{seasonEntrants.length} entered</span>
                </div>
                {seasonEntrants.length === 0 ? (
                  <div style={{ ...FB, fontSize: 14, color: '#6B7280', textAlign: 'center', padding: '40px 0' }}>Season event coming soon.</div>
                ) : seasonEntrants.map((e, i) => (
                  <div key={e.id} onClick={() => setFighter(e)}
                    style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#DC2626', minWidth: 32, textAlign: 'center' }}>#{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5' }}>{e.member_name}</div>
                      <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>🏆 Season · {e.quantity} ticket{e.quantity > 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ ...F, fontSize: 11, color: '#DC2626', letterSpacing: 1 }}>VIEW →</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RACE PASS TAB */}
          {activeTab === 'pass' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {!member ? (
                <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                  <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 8 }}>MEMBERS ONLY</div>
                  <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 20 }}>Log in to view your Race Pass progress.</div>
                  <a href="/register" style={{ background: '#DC2626', color: '#fff', borderRadius: 10, padding: '12px 28px', ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, textDecoration: 'none' }}>REGISTER FREE →</a>
                </div>
              ) : (
                <>
                  <div style={{ background: '#071426', border: '1px solid rgba(250,204,21,0.15)', borderRadius: 14, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5' }}>WEEKLY RACE PASS</div>
                      <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#FACC15' }}>{weeklyProgress}/10 STAMPED</div>
                    </div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 16 }}>Buy 10 weekly tickets · Get 1 FREE weekly ticket</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 5, marginBottom: 14 }}>
                      {Array.from({ length: 10 }).map((_, i) => {
                        const stamped = i < weeklyProgress;
                        return (
                          <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', border: stamped ? '2px solid #FACC15' : '1.5px solid rgba(250,204,21,0.25)', background: stamped ? '#FACC15' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: stamped ? '#111' : 'rgba(255,255,255,0.2)' }}>
                            {stamped ? '✓' : i + 1}
                          </div>
                        );
                      })}
                      <div style={{ aspectRatio: '1', borderRadius: '50%', border: weeklyProgress >= 10 ? '2px solid #DC2626' : '1.5px solid rgba(220,38,38,0.4)', background: weeklyProgress >= 10 ? '#DC2626' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: weeklyProgress >= 10 ? '#fff' : 'rgba(220,38,38,0.5)' }}>FREE</div>
                    </div>
                    <p style={{ ...FB, fontSize: 13, color: weeklyProgress >= 10 ? '#22C55E' : '#B8C1CC', margin: 0 }}>
                      {weeklyProgress >= 10 ? '🎉 You earned a free weekly ticket! Contact admin to claim.' : `${10 - weeklyProgress} more weekly tickets to earn 1 FREE`}
                    </p>
                  </div>

                  <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 14, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#F5F5F5' }}>SEASON RACE PASS</div>
                      <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#DC2626' }}>{seasonProgress}/10 STAMPED</div>
                    </div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 16 }}>Buy 10 season tickets · Get 1 FREE season ticket</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 5, marginBottom: 14 }}>
                      {Array.from({ length: 10 }).map((_, i) => {
                        const stamped = i < seasonProgress;
                        return (
                          <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', border: stamped ? '2px solid #DC2626' : '1.5px solid rgba(220,38,38,0.25)', background: stamped ? '#DC2626' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: stamped ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                            {stamped ? '✓' : i + 1}
                          </div>
                        );
                      })}
                      <div style={{ aspectRatio: '1', borderRadius: '50%', border: seasonProgress >= 10 ? '2px solid #FACC15' : '1.5px solid rgba(250,204,21,0.4)', background: seasonProgress >= 10 ? '#FACC15' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: seasonProgress >= 10 ? '#111' : 'rgba(250,204,21,0.5)' }}>FREE</div>
                    </div>
                    <p style={{ ...FB, fontSize: 13, color: seasonProgress >= 10 ? '#22C55E' : '#B8C1CC', margin: 0 }}>
                      {seasonProgress >= 10 ? '🎉 You earned a free season ticket! Contact admin to claim.' : `${10 - seasonProgress} more season tickets to earn 1 FREE`}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* RULES TAB */}
          {activeTab === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Club Rules */}
              <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 14, padding: 24 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#DC2626', marginBottom: 16, letterSpacing: 1 }}>🏁 GREENLAND MINI 4WD CLUB — RACE RULES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['🐦', 'Early Bird Tickets', 'Same rules as weekly tickets — 1 car entry, 2 qualification lives. The only difference is the discounted price (130 DKK vs 150 DKK). Limited slots per event.'],
                    ['🎟️', 'Ticket System', '1 ticket = 1 car entry · 2 qualification lives per ticket · If a car loses both lives, it is eliminated and the ticket is consumed.'],
                    ['🚗', 'Car Entry', 'The same car cannot enter the same race category twice on the same race day. However, 1 car can enter multiple categories (e.g. Box Stock and B-Max in the same day).'],
                    ['🎁', 'Loyalty Rewards', 'Every 10 paid tickets = 1 FREE ticket. Weekly and Season passes are tracked separately. Free tickets do NOT count toward the loyalty 10.'],
                    ['🔧', 'Car Registration', 'All cars must be registered in your Garage before entering. Cars bought outside the shop are allowed as long as you are a registered member.'],
                    ['⚡', 'Modifications', 'Cars must comply with their entered class rules. A stock car can enter a B-Max race but a modified car cannot enter a Box Stock race.'],
                    ['📏', 'Measurement', 'Max width 105mm · Max height 70mm · Max length 165mm · Min ground clearance 1mm · Min weight 90g · Tires 22-35mm diameter.'],
                    ['⛽', 'Motors & Batteries', 'Only approved unmodified Tamiya motors. Only alkaline or NiMH batteries. Lithium batteries are prohibited in all classes.'],
                    ['🚫', 'Disqualification', 'Oil/grease leaks, illegal parts, false starts (2nd offense), non-approved motors or batteries result in race or event disqualification.'],
                  ].map(([icon, title, desc]) => (
                    <div key={title as string} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{icon}</span>
                      <div>
                        <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5', marginBottom: 2 }}>{title as string}</div>
                        <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.6 }}>{desc as string}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Classes */}
              <div style={{ ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, color: '#B8C1CC', marginBottom: 8 }}>RACING CLASSES</div>
              {CLASSES.map(c => (
                <div key={c.name} style={{ background: '#071426', border: `1px solid ${c.color}22`, borderLeft: `3px solid ${c.color}`, borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ ...F, fontWeight: 900, fontSize: 17, color: c.color, marginBottom: 4 }}>{c.name}</div>
                  <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{c.desc}</div>
                </div>
              ))}

              <div style={{ ...FB, fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
                Full class rules based on <a href="https://mini4wdracing.com/mini-4wd-racing-classes-explained/" target="_blank" rel="noreferrer" style={{ color: '#DC2626' }}>mini4wdracing.com</a> · Adapted for Greenland Mini 4WD Club
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FIGHTER CARD MODAL */}
      {fighter && (
        <div onClick={() => setFighter(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
            {/* Header strip */}
            <div style={{ background: 'linear-gradient(135deg, #DC2626, #7f1d1d)', padding: '24px 24px 20px', position: 'relative' }}>
              <button onClick={() => setFighter(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F, fontWeight: 900, fontSize: 28, color: '#fff', marginBottom: 12 }}>
                {fighter.member_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ ...F, fontWeight: 900, fontSize: 24, color: '#fff' }}>{fighter.member_name}</div>
              <div style={{ ...F, fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                {fighter.ticket_type === 'weekly_earlybird' ? '🐦 EARLY BIRD ENTRANT' : fighter.ticket_type === 'season' ? '🏆 SEASON ENTRANT' : '🏁 WEEKLY ENTRANT'}
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Tickets', value: fighter.quantity, color: '#FACC15' },
                  { label: 'Entry Date', value: new Date(fighter.created_at).toLocaleDateString('en-GB'), color: '#F5F5F5' },
                  { label: 'Ref', value: fighter.payment_reference?.slice(-6) || '—', color: '#22C55E' },
                  { label: 'Type', value: fighter.ticket_type?.replace('_', ' ').toUpperCase(), color: '#DC2626' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#050505', borderRadius: 10, padding: 14 }}>
                    <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 18, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: 14, ...FB, fontSize: 13, color: '#FCA5A5', lineHeight: 1.6, textAlign: 'center' }}>
                🚗 Car registration coming soon — racers will declare their car before race day
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}