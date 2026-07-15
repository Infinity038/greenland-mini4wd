// Presentational only — visual design reference for the free physical Racer Card.
// The QR box is a styled placeholder, NOT a real QR code: the actual code must
// encode an opaque, revocable token (never an email/phone/sequential ID), which
// requires the database-dependent token backend described in the business-rules
// brief. Nothing here stores money, prepaid tickets, or transferable lives.
const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export interface RacerCardData {
  displayName: string;
  racerId: string;
  issueDate?: string;
}

function QrPlaceholder() {
  return (
    <div style={{ width: 88, height: 88, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ ...FB, fontSize: 9, color: '#050505', textAlign: 'center', lineHeight: 1.3, padding: 6 }}>QR<br />placeholder</div>
    </div>
  );
}

export function RacerCardFront({ card }: { card: RacerCardData }) {
  return (
    <div style={{ width: 340, maxWidth: '100%', aspectRatio: '1.6 / 1', background: 'linear-gradient(135deg, #050505, #071426)', border: '1px solid rgba(220,38,38,0.35)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#F5F5F5' }}>
      <div>
        <div style={{ ...F, fontWeight: 900, fontSize: 12, letterSpacing: 3, color: '#DC2626' }}>ARCTIC MINI4WD</div>
        <div style={{ ...F, fontWeight: 900, fontSize: 10, letterSpacing: 4, color: '#6B7280' }}>RACER CARD</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5' }}>{card.displayName}</div>
          <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>Racer ID: {card.racerId}</div>
          {card.issueDate && <div style={{ ...FB, fontSize: 10, color: '#6B7280', marginTop: 2 }}>Issued {card.issueDate}</div>}
        </div>
        <QrPlaceholder />
      </div>
    </div>
  );
}

interface StampRow {
  eventDate: string;
  eventCode: string;
  category: string;
  car: string;
  life1Stamped: boolean;
  life2Stamped: boolean;
  staffInitials?: string;
}

export function RacerCardBack({ stamps }: { stamps: StampRow[] }) {
  return (
    <div style={{ width: 340, maxWidth: '100%', background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, color: '#F5F5F5' }}>
      <div style={{ ...F, fontSize: 10, letterSpacing: 3, color: '#B8C1CC', marginBottom: 10 }}>EVENT STAMPS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stamps.length === 0 && <div style={{ ...FB, fontSize: 12, color: '#4B5563' }}>No events stamped yet.</div>}
        {stamps.map((s, i) => (
          <div key={i} style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px', ...FB, fontSize: 11, color: '#B8C1CC', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span>{s.eventDate} · {s.eventCode} · {s.category} · {s.car}</span>
            <span>
              <span style={{ color: s.life1Stamped ? '#3B82F6' : '#374151' }}>●L1</span>{' '}
              <span style={{ color: s.life2Stamped ? '#DC2626' : '#374151' }}>●L2</span>{' '}
              {s.staffInitials && <span style={{ color: '#6B7280' }}>{s.staffInitials}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
