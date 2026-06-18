// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isRegistered } from '@/lib/member';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CLASS_COLORS: Record<string, string> = {
  'Box Stock': '#22C55E', 'PRO-Stock': '#3B82F6', 'Basic': '#A855F7',
  'Advanced': '#F97316', 'BMAX': '#FACC15', 'Open': '#DC2626',
};

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  upcoming: { color: '#3B82F6', label: '🗓️ UPCOMING' },
  ongoing: { color: '#22C55E', label: '🔴 LIVE NOW' },
  completed: { color: '#6B7280', label: '✓ COMPLETED' },
  cancelled: { color: '#DC2626', label: '✕ CANCELLED' },
};

function autoStatus(t: any): string {
  if (t.status === 'cancelled') return 'cancelled';
  if (!t.date) return t.status;
  const now = new Date();
  const eventDate = new Date(t.date);
  const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
  if (diffHours < 0) return 'upcoming';
  if (diffHours < 8) return 'ongoing';
  return 'completed';
}

export default function EventsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');

  useEffect(() => {
    setRegistered(isRegistered());
    fetchAndSync();
  }, []);

  async function fetchAndSync() {
    const { data } = await supabase.from('tournaments').select('*').order('date', { ascending: true });
    const list = data || [];
    for (const t of list) {
      const computed = autoStatus(t);
      if (computed !== t.status && t.status !== 'cancelled') {
        await supabase.from('tournaments').update({ status: computed }).eq('id', t.id);
        t.status = computed;
      }
    }
    setTournaments(list);
    setLoading(false);
  }

  const filtered = filter === 'all' ? tournaments : tournaments.filter(t => autoStatus(t) === filter);
  const live = tournaments.filter(t => autoStatus(t) === 'ongoing').length;
  const upcoming = tournaments.filter(t => autoStatus(t) === 'upcoming').length;

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh', paddingTop: 60 }}>
        <section style={{ background: '#071426', borderBottom: '1px solid rgba(220,38,38,0.15)', padding: '48px 24px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>GREENLAND MINI 4WD CLUB</div>
            <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(36px, 8vw, 64px)', margin: '0 0 10px', lineHeight: 0.95 }}>RACE EVENTS</h1>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', margin: '0 0 24px' }}>All upcoming and past race events in Nuuk, Greenland.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {live > 0 && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#22C55E' }}>🔴 {live} LIVE NOW</div>}
              {upcoming > 0 && <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#3B82F6' }}>🗓️ {upcoming} UPCOMING</div>}
              <a href="/tickets" style={{ background: '#DC2626', color: '#fff', borderRadius: 8, padding: '8px 20px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 2, textDecoration: 'none' }}>🎟️ BUY TICKETS →</a>
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'upcoming', 'ongoing', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filter === f ? '#DC2626' : 'rgba(255,255,255,0.06)', color: filter === f ? '#fff' : '#B8C1CC' }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
          {loading ? (
            <div style={{ ...FB, color: '#B8C1CC', textAlign: 'center', padding: 60 }}>Loading events...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏁</div>
              <div style={{ ...FB, fontSize: 18, color: '#B8C1CC', marginBottom: 8 }}>No events yet</div>
              <div style={{ ...FB, fontSize: 14, color: '#6B7280' }}>Check back soon — we're planning our first race!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map(t => {
                const st = autoStatus(t);
                const style = STATUS_STYLES[st] || STATUS_STYLES.upcoming;
                const cats: string[] = t.race_categories || [];
                const isPast = st === 'completed' || st === 'cancelled';
                const isLive = st === 'ongoing';
                return (
                  <div key={t.id} style={{ background: isLive ? 'linear-gradient(135deg, #071426, #0a1f0a)' : '#071426', border: `1.5px solid ${isLive ? 'rgba(34,197,94,0.3)' : isPast ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 16, overflow: 'hidden', opacity: isPast ? 0.75 : 1 }}>
                    {isLive && <div style={{ height: 3, background: 'linear-gradient(90deg, #22C55E, #16A34A)' }} />}
                    <div style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                            <span style={{ ...F, fontSize: 10, letterSpacing: 2, padding: '3px 10px', borderRadius: 20, background: style.color + '22', color: style.color, border: `1px solid ${style.color}44` }}>{style.label}</span>
                            {cats.map((cat: string) => (
                              <span key={cat} style={{ ...F, fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 20, background: (CLASS_COLORS[cat] || '#6B7280') + '22', color: CLASS_COLORS[cat] || '#6B7280', border: `1px solid ${CLASS_COLORS[cat] || '#6B7280'}44` }}>{cat.toUpperCase()}</span>
                            ))}
                          </div>
                          <h2 style={{ ...F, fontWeight: 900, fontSize: 26, color: '#F5F5F5', margin: '0 0 6px' }}>{t.name}</h2>
                          <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {t.date && <span>📅 {new Date(t.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} · {new Date(t.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
                            {t.location && <span>📍 {t.location}</span>}
                          </div>
                          {t.description && <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', margin: '8px 0 0', lineHeight: 1.6 }}>{t.description}</p>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#B8C1CC' }}>ENTRY</div>
                          <div style={{ ...F, fontWeight: 900, fontSize: 28, color: '#FACC15' }}>{t.ticket_price_dkk || '—'} <span style={{ fontSize: 14 }}>DKK</span></div>
                          <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 2 }}>Max {t.max_participants} racers</div>
                        </div>
                      </div>
                      {!isPast && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                          {registered ? (
                            <a href="/tickets" style={{ background: '#DC2626', color: '#fff', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 900, fontSize: 14, letterSpacing: 2, textDecoration: 'none' }}>🎟️ BUY TICKET →</a>
                          ) : (
                            <a href="/register" style={{ background: '#DC2626', color: '#fff', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 900, fontSize: 14, letterSpacing: 2, textDecoration: 'none' }}>REGISTER TO ENTER →</a>
                          )}
                          <a href="/tournament" style={{ background: 'transparent', color: '#B8C1CC', borderRadius: 8, padding: '10px 16px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>RACE RULES</a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}