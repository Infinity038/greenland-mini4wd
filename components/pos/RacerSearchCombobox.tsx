'use client';
// Searchable racer combobox — not a plain <select>. Authorized staff can
// search by Racer ID, display name, phone, or Club Car ID, but phone numbers
// are never shown on a result card.
import { useState } from 'react';
import { searchRacers, type PosRacerRecord } from '@/lib/posRacerDirectory';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function RacerSearchCombobox({ onSelect, onClose }: { onSelect: (racer: PosRacerRecord) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const results = searchRacers(query);

  return (
    <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC' }}>SEARCH RACERS</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B8C1CC', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by Racer ID, name, phone, or Club Car ID"
        style={{ width: '100%', boxSizing: 'border-box', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14, marginBottom: 10 }}
      />
      <div role="listbox" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {query.trim() === '' ? (
          <div style={{ ...FB, fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '16px 0' }}>Start typing to search.</div>
        ) : results.length === 0 ? (
          <div style={{ ...FB, fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '16px 0' }}>No matching racers.</div>
        ) : results.map(racer => (
          <button
            key={racer.racerId}
            role="option"
            aria-selected={false}
            onClick={() => onSelect(racer)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {racer.photoUrl ? <img src={racer.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ ...F, fontWeight: 900, fontSize: 13, color: '#fff' }}>{initials(racer.displayName)}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{racer.displayName}</div>
              <div style={{ ...FB, fontSize: 11, color: '#FACC15', fontFamily: 'monospace' }}>{racer.racerId}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ ...FB, fontSize: 10, color: '#B8C1CC' }}>{racer.accountStatus}</div>
              <div style={{ ...FB, fontSize: 10, color: '#6B7280' }}>{racer.physicalCardStatus}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
