'use client';
// Searchable Club Car combobox — not a plain <select>. Staff can search by
// Club Car ID, racer/owner name, model, or chassis.
import { useState } from 'react';
import { searchCars, type PosCarRecord } from '@/lib/posCarDirectory';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export default function CarSearchCombobox({ onSelect, onClose }: { onSelect: (car: PosCarRecord) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const results = searchCars(query);

  return (
    <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC' }}>SEARCH CARS</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B8C1CC', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by Club Car ID, racer, model, or chassis"
        style={{ width: '100%', boxSizing: 'border-box', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14, marginBottom: 10 }}
      />
      <div role="listbox" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {query.trim() === '' ? (
          <div style={{ ...FB, fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '16px 0' }}>Start typing to search.</div>
        ) : results.length === 0 ? (
          <div style={{ ...FB, fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '16px 0' }}>No matching cars.</div>
        ) : results.map(car => (
          <button
            key={car.clubCarId}
            role="option"
            aria-selected={false}
            onClick={() => onSelect(car)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 6, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {car.photoUrl ? <img src={car.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>🏎️</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{car.model}</div>
              <div style={{ ...FB, fontSize: 11, color: '#FACC15', fontFamily: 'monospace' }}>{car.clubCarId}</div>
              <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{car.ownerName} · {car.chassis} · {car.category}</div>
            </div>
            <div style={{ ...FB, fontSize: 10, color: '#B8C1CC', flexShrink: 0 }}>{car.registrationStatus}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
