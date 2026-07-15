// Presentational only — renders whatever activity entries it's given. Not wired
// to a real ledger yet (see docs — the loyalty ledger is a database-dependent
// follow-up). Callers must combine online + in-person + redemption + reversal
// entries into one chronological list before passing them in.
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export type PointsActivityStatus = 'Pending' | 'Confirmed' | 'Redeemed' | 'Refunded' | 'Reversed' | 'Cancelled';
export type PointsActivityChannel = 'Online' | 'In person';

export interface PointsActivityEntry {
  id: string;
  date: string;
  description: string;
  channel: PointsActivityChannel;
  amountDkk: number | null;
  pointsDelta: number;
  status: PointsActivityStatus;
  reference?: string;
}

const STATUS_COLORS: Record<PointsActivityStatus, string> = {
  Pending: '#FACC15',
  Confirmed: '#22C55E',
  Redeemed: '#3B82F6',
  Refunded: '#F97316',
  Reversed: '#DC2626',
  Cancelled: '#6B7280',
};

export default function PointsActivityList({ entries }: { entries: PointsActivityEntry[] }) {
  if (entries.length === 0) {
    return <div style={{ ...FB, fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '32px 0' }}>No points activity yet.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map(entry => (
        <div key={entry.id} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{entry.date} · {entry.channel}</div>
            <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5' }}>{entry.description}</div>
            {entry.reference && <div style={{ ...FB, fontSize: 11, color: '#4B5563' }}>Ref: {entry.reference}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            {entry.amountDkk != null && <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>{entry.amountDkk} DKK</div>}
            <div style={{ ...F, fontWeight: 900, fontSize: 15, color: entry.pointsDelta >= 0 ? '#22C55E' : '#DC2626' }}>
              {entry.pointsDelta >= 0 ? '+' : ''}{entry.pointsDelta.toFixed(2)} points
            </div>
            <span style={{ ...F, fontSize: 10, letterSpacing: 1, color: STATUS_COLORS[entry.status] }}>{entry.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
