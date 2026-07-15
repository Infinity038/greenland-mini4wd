// Presentational only — takes typed balances as props. Not wired to a live Shop
// Credit or Championship Points backend yet (neither exists in the schema today).
// Loyalty Points, Shop Credit and Championship Points must never be combined into
// a single number.
import type { ReactNode } from 'react';
import { formatPoints } from '@/lib/loyaltyPoints';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export interface RacerBalances {
  loyaltyPoints: number;
  shopCreditDkk: number;
  championshipPoints: {
    boxStock: number;
    bmax: number;
    currentRank: number | null;
  };
}

function Card({ label, color, children }: { label: string; color: string; children: ReactNode }) {
  return (
    <div style={{ background: '#071426', border: `1px solid ${color}33`, borderRadius: 14, padding: '18px 20px', flex: 1, minWidth: 200 }}>
      <div style={{ ...F, fontSize: 11, letterSpacing: 3, color, marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

export default function BalanceCards({ balances }: { balances: RacerBalances }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Card label="LOYALTY POINTS" color="#FACC15">
        <div style={{ ...F, fontWeight: 900, fontSize: 32, color: '#FACC15' }}>{formatPoints(balances.loyaltyPoints)}</div>
        <div style={{ ...FB, fontSize: 12, color: '#6B7280' }}>points</div>
      </Card>
      <Card label="SHOP CREDIT" color="#22C55E">
        <div style={{ ...F, fontWeight: 900, fontSize: 32, color: '#22C55E' }}>{balances.shopCreditDkk.toFixed(2)}</div>
        <div style={{ ...FB, fontSize: 12, color: '#6B7280' }}>DKK</div>
      </Card>
      <Card label="CHAMPIONSHIP POINTS" color="#3B82F6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>B-MAX: <strong style={{ color: '#F5F5F5' }}>{balances.championshipPoints.bmax} points</strong></div>
          <div style={{ ...FB, fontSize: 13, color: '#B8C1CC' }}>Box Stock: <strong style={{ color: '#F5F5F5' }}>{balances.championshipPoints.boxStock} points</strong></div>
          {balances.championshipPoints.currentRank != null && (
            <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginTop: 4 }}>Current rank: #{balances.championshipPoints.currentRank}</div>
          )}
        </div>
      </Card>
    </div>
  );
}
