'use client';
// Free attendance RSVP — replaces the old online race-ticket purchase flow.
// Race entry is paid in person only; this panel never creates a ticket, a life,
// ticket inventory, or loyalty points, and never accepts payment. See
// lib/eventRsvp.ts and lib/raceEntryPricing.ts.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRsvp, saveRsvp, getRsvpForRacer } from '@/lib/eventRsvp';
import { RACE_ENTRY_PRICES, IN_PERSON_ONLY_NOTICE, type EventTier } from '@/lib/raceEntryPricing';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CATEGORIES = ['Box Stock', 'Open Box Stock', 'B-MAX', 'Open Class'];

interface Member {
  email: string;
  name?: string;
}

interface CarOption {
  id: string;
  name: string;
}

function PriceCard({ tier }: { tier: EventTier }) {
  const price = RACE_ENTRY_PRICES[tier];
  return (
    <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 12, padding: 18, flex: 1, minWidth: 200 }}>
      <div style={{ ...F, fontSize: 13, fontWeight: 900, letterSpacing: 1, color: '#F5F5F5', marginBottom: 8 }}>{price.label.toUpperCase()}</div>
      <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 4 }}>First entry (paid at venue)</div>
      <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#FACC15', marginBottom: 8 }}>{price.firstEntryDkk} DKK</div>
      <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 4 }}>Optional Second Life</div>
      <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#22C55E' }}>{price.secondLifeDkk} DKK</div>
    </div>
  );
}

export default function EventRsvpPanel({ member, eventId }: { member: Member | null; eventId: string }) {
  const [cars, setCars] = useState<CarOption[]>([]);
  const [carId, setCarId] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Cheap synchronous localStorage read — derived at render time instead of
  // mirrored into state, so there's no effect needed just to seed it.
  const rsvped = hasSubmitted || (!!member?.email && !!getRsvpForRacer(eventId, member.email));

  useEffect(() => {
    if (!member?.email) return;
    supabase.from('cars').select('id, name').eq('member_email', member.email).eq('status', 'approved')
      .then(({ data }: { data: CarOption[] | null }) => setCars(data || []));
  }, [member?.email]);

  const submitRsvp = () => {
    if (!member?.email) return;
    const car = cars.find(c => c.id === carId);
    saveRsvp(createRsvp({ eventId, racerEmail: member.email, category, carId: car?.id ?? null, carName: car?.name ?? null }));
    setHasSubmitted(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 12, padding: 16, ...FB, fontSize: 14, color: '#F5F5F5', lineHeight: 1.7 }}>
        {IN_PERSON_ONLY_NOTICE}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <PriceCard tier="weekly" />
        <PriceCard tier="big_event" />
      </div>

      <div style={{ ...FB, fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>
        A Second Life must be paid before check-in closes and is valid only for the same registered car and event.
      </div>

      {!member ? (
        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 16 }}>Log in to RSVP and let the club know you plan to race.</div>
          <a href="/register" style={{ background: '#DC2626', color: '#fff', borderRadius: 10, padding: '12px 28px', ...F, fontWeight: 900, fontSize: 15, letterSpacing: 2, textDecoration: 'none' }}>REGISTER FREE →</a>
        </div>
      ) : rsvped ? (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ ...F, fontWeight: 900, fontSize: 18, color: '#22C55E', marginBottom: 6 }}>RSVP RECEIVED</div>
          <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>Pay for your race entry in person at check-in. This RSVP is not a paid entry.</div>
        </div>
      ) : (
        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: '#B8C1CC' }}>RSVP (FREE — NOT A PAID ENTRY)</div>
          <div>
            <label style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CAR YOU PLAN TO BRING</label>
            <select value={carId} onChange={e => setCarId(e.target.value)} style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14 }}>
              <option value="">— Select a registered car (optional) —</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC', display: 'block', marginBottom: 6 }}>CATEGORY</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={submitRsvp} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: 14, ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>
            RSVP →
          </button>
        </div>
      )}
    </div>
  );
}
