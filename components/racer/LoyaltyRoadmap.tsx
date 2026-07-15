'use client';
// Arctic Mini4WD-original milestone roadmap — original layout/artwork, not a copy
// of any third-party loyalty program. Presentational: takes a balance and calls
// onRedeem/onViewActivity, but does not itself call any backend (none exists yet).
import { REWARD_ROADMAP, getAvailableReward, getNextReward, pointsRemainingToNext } from '@/lib/loyaltyRoadmap';
import { formatPoints } from '@/lib/loyaltyPoints';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export default function LoyaltyRoadmap({ balance, onRedeem, onViewActivity }: {
  balance: number;
  onRedeem?: () => void;
  onViewActivity?: () => void;
}) {
  const available = getAvailableReward(balance);
  const next = getNextReward(balance);
  const remaining = pointsRemainingToNext(balance);

  return (
    <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 16, padding: '28px 24px' }}>
      <div style={{ ...F, fontSize: 11, letterSpacing: 4, color: '#DC2626', marginBottom: 6 }}>MY LOYALTY POINTS</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span style={{ ...F, fontWeight: 900, fontSize: 44, color: '#FACC15' }}>{formatPoints(balance)}</span>
        <span style={{ ...F, fontSize: 14, letterSpacing: 2, color: '#B8C1CC' }}>POINTS</span>
      </div>
      {available && <div style={{ ...FB, fontSize: 13, color: '#22C55E', marginBottom: 4 }}>{available.discountDkk} DKK reward available</div>}
      {next && <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginBottom: 20 }}>{formatPoints(remaining)} points until the next reward</div>}
      {!next && <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginBottom: 20 }}>Maximum reward reached.</div>}

      {/* Track */}
      <div style={{ position: 'relative', padding: '8px 4px 24px' }}>
        <div style={{ position: 'absolute', top: 24, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, rgba(220,38,38,0.6), rgba(255,255,255,0.1))', borderRadius: 2 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {REWARD_ROADMAP.map(tier => {
            const reached = balance >= tier.points;
            const isNext = next?.points === tier.points;
            return (
              <div key={tier.points} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{
                  width: isNext ? 20 : 14, height: isNext ? 20 : 14, borderRadius: '50%',
                  background: reached ? '#DC2626' : isNext ? '#FACC15' : 'rgba(255,255,255,0.15)',
                  border: isNext ? '2px solid #FACC15' : 'none',
                  boxShadow: isNext ? '0 0 12px rgba(250,204,21,0.6)' : 'none',
                }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...F, fontWeight: 900, fontSize: 13, color: reached ? '#F5F5F5' : isNext ? '#FACC15' : 'rgba(255,255,255,0.35)' }}>{tier.discountDkk} DKK</div>
                  <div style={{ ...FB, fontSize: 10, color: reached ? '#B8C1CC' : 'rgba(255,255,255,0.25)' }}>{tier.points} pts</div>
                  {reached && <div style={{ ...FB, fontSize: 9, color: '#22C55E', marginTop: 2 }}>{isNext ? '' : 'Available'}</div>}
                  {isNext && <div style={{ ...FB, fontSize: 9, color: '#FACC15', marginTop: 2 }}>{formatPoints(remaining)} pts left</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <button
          onClick={onRedeem}
          disabled={!available}
          style={{ background: available ? '#DC2626' : 'rgba(255,255,255,0.06)', color: available ? '#fff' : '#6B7280', border: 'none', borderRadius: 8, padding: '11px 22px', ...F, fontWeight: 900, fontSize: 14, letterSpacing: 2, cursor: available ? 'pointer' : 'not-allowed' }}>
          REDEEM REWARD
        </button>
        <button
          onClick={onViewActivity}
          style={{ background: 'transparent', color: '#B8C1CC', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '11px 22px', ...F, fontWeight: 700, fontSize: 14, letterSpacing: 2, cursor: 'pointer' }}>
          VIEW POINTS ACTIVITY
        </button>
      </div>
    </div>
  );
}
