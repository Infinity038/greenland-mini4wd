'use client';
// Preview-only Racer Identity panel: Digital Racer Profile, QR identity, and
// physical Racer Card lifecycle. Uses local component state and the pure
// lib/racerId.ts, lib/racerAccountStatus.ts, lib/qrIdentity.ts and
// lib/physicalCard.ts modules — nothing here is wired to a live table.
// Photo upload, QR verification, and card production are staff/schema-
// dependent follow-ups pending live schema review.
import { useState } from 'react';
import type { RacerAccountStatus } from '@/lib/racerAccountStatus';
import { issueQrIdentity } from '@/lib/qrIdentity';
import {
  requestFirstCard,
  submitReplacementRequest,
  confirmReplacementPayment,
  beginProduction,
  markReadyForPickup,
  markCollected,
  hasActivePhysicalCard,
  formatPhysicalCardId,
  REPLACEMENT_FEE_DKK,
  REPLACEMENT_CARD_NOTICE,
  type PhysicalCardRecord,
} from '@/lib/physicalCard';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const STATUS_COLORS: Record<RacerAccountStatus, string> = {
  'Pending Review': '#FACC15',
  Active: '#22C55E',
  Suspended: '#DC2626',
  Archived: '#6B7280',
};

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

interface ExampleRacer {
  displayName: string;
  racerId: string;
  accountStatus: RacerAccountStatus;
  photoUrl: string | null;
}

export default function RacerIdentityPanel({ racer }: { racer: ExampleRacer }) {
  const [qr] = useState(() => issueQrIdentity(racer.racerId));
  const [card, setCard] = useState<PhysicalCardRecord | null>(null);
  const [confirmingReplacement, setConfirmingReplacement] = useState(false);
  const [replacementReason, setReplacementReason] = useState('Lost card');

  const requestCard = () => setCard(requestFirstCard(racer.racerId, '0082'));

  const startReplacement = () => {
    if (!card) return;
    setCard(submitReplacementRequest(card, replacementReason));
    setConfirmingReplacement(false);
  };

  const payAndProduce = () => {
    if (!card) return;
    const paid = confirmReplacementPayment(card);
    // In the real flow the old card is a separate record; here the panel
    // only tracks the current card, so we simulate the deactivate-then-
    // replace transition on the same slot for preview purposes.
    const { newCard } = beginProduction(paid, paid);
    setCard(newCard);
  };

  const advance = () => {
    if (!card) return;
    if (card.status === 'In Production') setCard(markReadyForPickup(card));
    else if (card.status === 'Ready for Pickup') setCard(markCollected(card));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Digital Racer Profile identity block */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: racer.photoUrl ? 'transparent' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {racer.photoUrl
            ? <img src={racer.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ ...F, fontWeight: 900, fontSize: 26, color: '#fff' }}>{initials(racer.displayName)}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ ...F, fontWeight: 900, fontSize: 22, color: '#F5F5F5' }}>{racer.displayName}</div>
          <div style={{ ...F, fontWeight: 700, fontSize: 14, letterSpacing: 2, color: '#FACC15', marginTop: 2, fontFamily: 'monospace' }}>{racer.racerId}</div>
          <div style={{ marginTop: 8 }}>
            <span style={{ ...F, fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: STATUS_COLORS[racer.accountStatus] + '22', color: STATUS_COLORS[racer.accountStatus], border: `1px solid ${STATUS_COLORS[racer.accountStatus]}44` }}>
              {racer.accountStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* QR identity */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#B8C1CC', marginBottom: 14 }}>QR IDENTITY</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ width: 120, height: 120, background: '#F5F5F5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 40 }}>▦</span>
          </div>
          <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', lineHeight: 1.7 }}>
            This QR code identifies your Racer Profile only. It carries no email, phone number, or plain database ID, and can be revoked and reissued by staff if lost or compromised. It is never a redemption coupon — staff verify it, then apply any purchase or loyalty action separately.
            <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: '#6B7280' }}>token: {qr.token}</div>
          </div>
        </div>
      </div>

      {/* Physical Racer Card */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: '#B8C1CC', marginBottom: 14 }}>PHYSICAL RACER CARD</div>

        {!card ? (
          <div>
            <p style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 16, lineHeight: 1.7 }}>Your first physical Racer Card is free.</p>
            <button onClick={requestCard} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', ...F, fontWeight: 900, fontSize: 14, letterSpacing: 2, cursor: 'pointer' }}>
              REQUEST PHYSICAL RACER CARD
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#FACC15' }}>{formatPhysicalCardId(card.baseCardNumber, card.version)}</span>
              <span style={{ ...F, fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>{card.status.toUpperCase()}</span>
            </div>

            {card.status === 'Requested' && (
              <div style={{ ...FB, fontSize: 12, color: '#6B7280' }}>Staff will review your request. No action needed yet.</div>
            )}

            {hasActivePhysicalCard([card]) && !confirmingReplacement && card.status !== 'Awaiting Payment' && (
              <button onClick={() => setConfirmingReplacement(true)} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', borderRadius: 8, padding: '10px 18px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer', alignSelf: 'flex-start' }}>
                REQUEST REPLACEMENT CARD
              </button>
            )}

            {confirmingReplacement && (
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ ...FB, fontSize: 13, color: '#FCA5A5', lineHeight: 1.7 }}>{REPLACEMENT_CARD_NOTICE}</div>
                <label style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#B8C1CC' }}>REASON</label>
                <select value={replacementReason} onChange={e => setReplacementReason(e.target.value)}
                  style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', ...FB, fontSize: 13 }}>
                  <option>Lost card</option>
                  <option>Damaged card</option>
                  <option>Stolen card</option>
                </select>
                <button onClick={startReplacement} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer', alignSelf: 'flex-start' }}>
                  CONFIRM — PAY {REPLACEMENT_FEE_DKK} DKK
                </button>
              </div>
            )}

            {card.status === 'Awaiting Payment' && (
              <div style={{ ...FB, fontSize: 12, color: '#FACC15' }}>
                Awaiting {REPLACEMENT_FEE_DKK} DKK payment confirmation. Production begins only after payment is confirmed.
                <div style={{ marginTop: 8 }}>
                  <button onClick={payAndProduce} style={{ background: '#22C55E', color: '#050505', border: 'none', borderRadius: 8, padding: '10px 18px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>
                    MARK PAYMENT CONFIRMED (staff)
                  </button>
                </div>
              </div>
            )}

            {(card.status === 'In Production' || card.status === 'Ready for Pickup') && (
              <button onClick={advance} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', borderRadius: 8, padding: '10px 18px', ...F, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: 'pointer', alignSelf: 'flex-start' }}>
                {card.status === 'In Production' ? 'MARK READY FOR PICKUP (staff)' : 'MARK COLLECTED (staff)'}
              </button>
            )}

            {card.status === 'Collected' && (
              <div style={{ ...FB, fontSize: 13, color: '#22C55E' }}>✅ Card collected. Your Racer ID, points, and history are unchanged.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
