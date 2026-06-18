'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const TYPE_COLORS: Record<string,{text:string;bg:string}> = {
  Race:         { text:'#DC2626', bg:'rgba(220,38,38,0.12)' },
  Workshop:     { text:'#60A5FA', bg:'rgba(96,165,250,0.12)' },
  'Open Track': { text:'#34D399', bg:'rgba(52,211,153,0.12)' },
  ongoing:      { text:'#22C55E', bg:'rgba(34,197,94,0.12)' },
  upcoming:     { text:'#3B82F6', bg:'rgba(59,130,246,0.12)' },
};

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('tournaments')
      .select('*')
      .in('status', ['upcoming', 'ongoing'])
      .order('date', { ascending: true })
      .limit(3)
      .then(({ data }) => setEvents(data || []));
  }, []);

  return (
    <section id="events" style={{ background: '#071426', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 48 }}>
          <div>
            <p style={{ ...F, fontSize: 12, fontWeight: 600, color: '#DC2626', letterSpacing: '0.3em', marginBottom: 8 }}>UPCOMING</p>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(38px,6vw,58px)', color: '#F5F5F5', lineHeight: 1, margin: 0 }}>
              EVENTS &amp;<br />RACES
            </h2>
          </div>
          <a href="/events" style={{ ...F, fontWeight: 700, fontSize: 14, color: '#DC2626', letterSpacing: '0.2em', textDecoration: 'none' }}>VIEW ALL →</a>
        </div>

        {events.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏁</div>
            <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5', marginBottom: 8 }}>NEXT RACE BEING SCHEDULED</div>
            <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 20 }}>Follow us on social media to get notified first.</div>
            <a href="/tournament" style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: '0.2em', color: '#DC2626', textDecoration: 'none', border: '1px solid rgba(220,38,38,0.3)', padding: '10px 20px', borderRadius: 6 }}>VIEW TOURNAMENTS →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map(ev => {
              const isLive = ev.status === 'ongoing';
              const date = ev.date ? new Date(ev.date) : null;
              const tc = isLive ? TYPE_COLORS.ongoing : TYPE_COLORS.upcoming;
              return (
                <div key={ev.id} style={{ background: isLive ? 'linear-gradient(135deg,#071426,#0a1f0a)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isLive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  {date && (
                    <div style={{ textAlign: 'center', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '12px 14px', flexShrink: 0 }}>
                      <div style={{ ...F, fontWeight: 900, fontSize: 26, color: '#DC2626', lineHeight: 1 }}>{date.getDate()}</div>
                      <div style={{ ...F, fontSize: 10, color: '#9CA3AF', letterSpacing: '0.2em', marginTop: 2 }}>{date.toLocaleString('en', { month: 'short' }).toUpperCase()}</div>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ ...F, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: tc.text, background: tc.bg, borderRadius: 20, padding: '3px 10px' }}>
                        {isLive ? '🔴 LIVE NOW' : '🗓️ UPCOMING'}
                      </span>
                    </div>
                    <div style={{ ...F, fontWeight: 700, fontSize: 22, color: '#F5F5F5', lineHeight: 1.2, marginBottom: 4 }}>{ev.name}</div>
                    {ev.location && <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>📍 {ev.location}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {ev.ticket_price_dkk && <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#FACC15', marginBottom: 6 }}>{ev.ticket_price_dkk} DKK</div>}
                    <a href="/tickets" style={{ display: 'inline-block', background: '#DC2626', color: '#fff', padding: '10px 20px', borderRadius: 6, ...F, fontWeight: 700, fontSize: 13, letterSpacing: '0.2em', textDecoration: 'none' }}>
                      BUY TICKET
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}