'use client';
// Staff-only grocery-style POS terminal — mock screen only. Wired to the pure
// lib/posSale.ts + lib/posCatalog.ts + lib/posRacerDirectory.ts reference
// modules. Nothing here writes to a live table: stock, points, receipts and
// the audit log shown after "Confirm Payment" are all in-memory simulation
// pending schema/auth/RLS review.
import { useRef, useState } from 'react';
import { scanBarcode, PRESET_POS_ITEMS, type PosPresetItem } from '@/lib/posCatalog';
import { lookupRacerByScan } from '@/lib/posRacerDirectory';
import {
  createNewSale,
  scanProduct,
  scanPresetItem,
  attachRacer,
  applyLoyaltyReward,
  applyShopCredit,
  calculateSaleTotals,
  confirmSale,
  cancelSale,
  type Sale,
  type ConfirmedSaleResult,
} from '@/lib/posSale';
import { getAvailableReward } from '@/lib/loyaltyRoadmap';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function POSTerminal() {
  const [sale, setSale] = useState<Sale>(() => createNewSale());
  const [barcodeInput, setBarcodeInput] = useState('');
  const [racerInput, setRacerInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [creditInput, setCreditInput] = useState('');
  const [confirmed, setConfirmed] = useState<ConfirmedSaleResult | null>(null);
  // Simulates a payment-idempotency store (a unique DB constraint in the real system).
  const processedKeysRef = useRef<Set<string>>(new Set());

  const totals = calculateSaleTotals(sale);
  const availableReward = sale.racer ? getAvailableReward(sale.racer.loyaltyPoints) : null;

  const handleScanBarcode = () => {
    setScanError('');
    const found = scanBarcode(barcodeInput);
    if (!found) { setScanError(`No product or preset item found for barcode "${barcodeInput}".`); return; }
    if (found.kind === 'product') {
      if (found.product.stockQuantity <= 0) { setScanError(`${found.product.name} is out of stock.`); return; }
      setSale(s => scanProduct(s, found.product));
    } else if (found.preset.unitPriceDkk == null) {
      setScanError(`${found.preset.name} needs a staff-entered price — use the preset buttons below.`);
    } else {
      setSale(s => scanPresetItem(s, found.preset));
    }
    setBarcodeInput('');
  };

  const handleScanPreset = (preset: PosPresetItem) => {
    if (preset.unitPriceDkk == null) {
      const entered = window.prompt(`Enter amount for ${preset.name} (DKK):`);
      const amount = Number(entered);
      if (!entered || !Number.isFinite(amount) || amount <= 0) return;
      setSale(s => scanPresetItem(s, preset, { staffEnteredPriceDkk: amount }));
      return;
    }
    setSale(s => scanPresetItem(s, preset));
  };

  const handleScanRacer = () => {
    setScanError('');
    const racer = lookupRacerByScan(racerInput);
    if (!racer) { setScanError(`No Racer Profile found for "${racerInput}".`); return; }
    setSale(s => attachRacer(s, racer));
    setRacerInput('');
  };

  const handleApplyReward = () => {
    try { setSale(s => applyLoyaltyReward(s)); setScanError(''); }
    catch (e) { setScanError((e as Error).message); }
  };

  const handleApplyCredit = () => {
    const amount = Number(creditInput);
    try { setSale(s => applyShopCredit(s, amount)); setScanError(''); setCreditInput(''); }
    catch (e) { setScanError((e as Error).message); }
  };

  const handleConfirmPayment = () => {
    try {
      const result = confirmSale(sale, sale.id, processedKeysRef.current);
      setSale(result.sale);
      setConfirmed(result);
      setScanError('');
    } catch (e) { setScanError((e as Error).message); }
  };

  const handleCancelSale = () => {
    setSale(s => cancelSale(s));
  };

  const handleNewSale = () => {
    setSale(createNewSale());
    setConfirmed(null);
    setBarcodeInput(''); setRacerInput(''); setCreditInput(''); setScanError('');
  };

  const saleOpen = sale.status === 'open';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ ...F, fontWeight: 900, fontSize: 20, color: '#F5F5F5' }}>
          SALE {sale.id} <span style={{ ...F, fontSize: 11, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: '#B8C1CC', marginLeft: 8 }}>{sale.status.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {saleOpen && sale.lineItems.length > 0 && (
            <button onClick={handleCancelSale} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>CANCEL SALE</button>
          )}
          <button onClick={handleNewSale} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>NEW SALE</button>
        </div>
      </div>

      {scanError && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: 12, ...FB, fontSize: 13, color: '#FCA5A5' }}>{scanError}</div>
      )}

      {/* Barcode scan input */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 10 }}>SCAN PRODUCT / SERVICE BARCODE</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleScanBarcode(); }}
            disabled={!saleOpen}
            placeholder="Scan or type a barcode"
            style={{ flex: 1, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14 }}
          />
          <button onClick={handleScanBarcode} disabled={!saleOpen} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5 }}>SCAN</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {PRESET_POS_ITEMS.map(p => (
            <button key={p.barcode} onClick={() => handleScanPreset(p)} disabled={!saleOpen}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', borderRadius: 6, padding: '6px 12px', ...FB, fontSize: 12, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5 }}>
              {p.name}{p.unitPriceDkk != null ? ` — ${p.unitPriceDkk} DKK` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Line items */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 10 }}>SALE ITEMS</div>
        {sale.lineItems.length === 0 ? (
          <div style={{ ...FB, fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '16px 0' }}>No items scanned yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sale.lineItems.map(li => (
              <div key={li.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                <div>
                  <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{li.name}</div>
                  <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>
                    {li.tamiyaItemNumber ? `Item #${li.tamiyaItemNumber} · ` : ''}Qty {li.quantity} · {li.isStockTracked ? 'Stock item' : 'Service/preset'}
                  </div>
                </div>
                <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#FACC15' }}>{li.unitPriceDkk * li.quantity} DKK</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Racer scan + profile autofill */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 10 }}>SCAN RACER QR / RACER ID (OPTIONAL)</div>
        {!sale.racer ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={racerInput}
              onChange={e => setRacerInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleScanRacer(); }}
              disabled={!saleOpen}
              placeholder="e.g. G4W-R-0047"
              style={{ flex: 1, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14 }}
            />
            <button onClick={handleScanRacer} disabled={!saleOpen} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5 }}>SCAN</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ ...F, fontWeight: 900, fontSize: 18, color: '#fff' }}>{initials(sale.racer.displayName)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#F5F5F5' }}>{sale.racer.displayName}</div>
              <div style={{ ...FB, fontSize: 12, color: '#FACC15', fontFamily: 'monospace' }}>{sale.racer.racerId}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>LOYALTY POINTS</div>
              <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#F5F5F5' }}>{sale.racer.loyaltyPoints.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>SHOP CREDIT</div>
              <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#22C55E' }}>{sale.racer.shopCreditDkk} DKK</div>
            </div>
          </div>
        )}

        {sale.racer && saleOpen && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <button onClick={handleApplyReward} disabled={!availableReward || !!sale.appliedReward}
              style={{ background: 'transparent', border: '1px solid rgba(250,204,21,0.3)', color: '#FACC15', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: availableReward && !sale.appliedReward ? 'pointer' : 'not-allowed', opacity: availableReward && !sale.appliedReward ? 1 : 0.4 }}>
              {sale.appliedReward ? `REWARD APPLIED (-${sale.appliedReward.discountDkk} DKK)` : availableReward ? `APPLY REWARD (-${availableReward.discountDkk} DKK)` : 'NO REWARD AVAILABLE'}
            </button>
            <input value={creditInput} onChange={e => setCreditInput(e.target.value)} placeholder="Shop Credit DKK"
              style={{ width: 140, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', ...FB, fontSize: 13 }} />
            <button onClick={handleApplyCredit} style={{ background: 'transparent', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>APPLY SHOP CREDIT</button>
          </div>
        )}
      </div>

      {/* Totals + confirm */}
      <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 12, padding: 20 }}>
        {[
          ['Subtotal', `${totals.subtotalDkk} DKK`],
          ['Reward discount', `-${totals.rewardDiscountDkk} DKK`],
          ['Shop Credit applied', `-${totals.shopCreditAppliedDkk} DKK`],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 6 }}>
            <span>{label}</span><span>{value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', ...F, fontWeight: 900, fontSize: 24, color: '#FACC15', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span>CASH DUE</span><span>{totals.cashDueDkk} DKK</span>
        </div>
        <div style={{ ...FB, fontSize: 12, color: '#22C55E', marginTop: 6 }}>
          {sale.racer ? `Racer will earn ${totals.pointsToEarn.toFixed(2)} Loyalty Points` : 'No Racer Profile scanned — no Loyalty Points will be earned'}
        </div>

        {saleOpen && (
          <button onClick={handleConfirmPayment} disabled={sale.lineItems.length === 0}
            style={{ marginTop: 16, width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: 16, ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: sale.lineItems.length ? 'pointer' : 'not-allowed', opacity: sale.lineItems.length ? 1 : 0.4 }}>
            CONFIRM PAYMENT →
          </button>
        )}
      </div>

      {confirmed && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: 20 }}>
          <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#22C55E', marginBottom: 10 }}>✅ PAYMENT CONFIRMED</div>
          <div style={{ ...FB, fontSize: 13, color: '#F5F5F5', lineHeight: 1.8 }}>
            Receipt: <span style={{ fontFamily: 'monospace', color: '#FACC15' }}>{confirmed.receiptReference}</span><br />
            Stock deducted: {confirmed.stockDeductions.length === 0 ? 'none' : confirmed.stockDeductions.map(s => `${s.barcode} ×${s.quantity}`).join(', ')}<br />
            Points awarded: {confirmed.pointsAwarded.toFixed(2)}<br />
            Audit log entry: <span style={{ fontFamily: 'monospace', color: '#6B7280' }}>{confirmed.auditLogEntry.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}
