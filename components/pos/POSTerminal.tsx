'use client';
// Staff-only grocery-style POS terminal — mock screen only. QR is the
// primary scan format for every club-controlled record (Racer, Product,
// Service, Car, Event, Redemption) — see lib/scanner/qrPayload.ts. One
// shared camera scanner routes any scanned/typed g4w:<type>:<token> payload
// to the correct lookup. Manual search and typed-code fallback are kept for
// every record type. Nothing here writes to a live table: stock, points,
// receipts, the audit log, redemption state and any barcode-link proposal
// are all in-memory simulation pending schema/auth/RLS review.
import { useRef, useState } from 'react';
import {
  scanBarcode,
  isRaceServiceBarcode,
  lookupProductByQrToken,
  lookupServiceByCode,
  PRESET_POS_ITEMS,
  type PosProduct,
  type PosPresetItem,
} from '@/lib/posCatalog';
import { lookupRacerByScan, lookupRacerByQrToken, type PosRacerRecord, type RacerScanOutcome } from '@/lib/posRacerDirectory';
import { lookupCarByQrToken, carsForRacer, type PosCarRecord } from '@/lib/posCarDirectory';
import { lookupEventByQrToken, searchEvents, type PosEventRecord } from '@/lib/posEventDirectory';
import { parseQrPayload, formatQrPayload } from '@/lib/scanner/qrPayload';
import { createDuplicateScanGuard } from '@/lib/scanner/duplicateScanGuard';
import { proposeBarcodeMapping } from '@/lib/posBarcodeMapping';
import {
  issueRedemptionToken,
  resolveRedemptionScan,
  markRedemptionTokenUsed,
  type RedemptionToken,
} from '@/lib/posRedemption';
import CameraScannerModal from './CameraScannerModal';
import ProductSearchCombobox from './ProductSearchCombobox';
import RacerSearchCombobox from './RacerSearchCombobox';
import CarSearchCombobox from './CarSearchCombobox';
import {
  createNewSale,
  scanProduct,
  scanPresetItem,
  attachRacer,
  removeRacer,
  attachEvent,
  removeEvent,
  applyLoyaltyReward,
  applyShopCredit,
  calculateSaleTotals,
  confirmSale,
  cancelSale,
  hasUnmetRaceServiceRequirements,
  type Sale,
  type SaleLineItem,
  type RacerSnapshot,
  type EventSnapshot,
  type ConfirmedSaleResult,
} from '@/lib/posSale';
import { getAvailableReward } from '@/lib/loyaltyRoadmap';
import { canRedeemRewards } from '@/lib/racerAccountStatus';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const PRODUCT_EMPTY_MESSAGE = 'Enter a barcode or use the camera scanner.';
const RACER_EMPTY_MESSAGE = 'Enter a Racer ID, scan a QR code, or search by name.';
const REVOKED_CARD_MESSAGE = 'This physical card is no longer active. Use the racer’s digital QR code or replacement card.';

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function toRacerSnapshot(r: PosRacerRecord): RacerSnapshot {
  return { racerId: r.racerId, displayName: r.displayName, photoUrl: r.photoUrl, accountStatus: r.accountStatus, loyaltyPoints: r.loyaltyPoints, shopCreditDkk: r.shopCreditDkk };
}

function toEventSnapshot(e: PosEventRecord): EventSnapshot {
  return { eventId: e.eventId, name: e.name, date: e.date, type: e.type, pricingModel: e.pricingModel };
}

function racerOutcomeMessage(outcome: RacerScanOutcome, code: string): string {
  switch (outcome.kind) {
    case 'invalid_qr': return `No Racer Profile found for "${code}".`;
    case 'revoked_card': return REVOKED_CARD_MESSAGE;
    case 'pending_account': return `${outcome.racer.displayName}'s Racer Profile is Pending Review — rewards cannot be redeemed until it is approved.`;
    case 'suspended_account': return `${outcome.racer.displayName}'s Racer Profile is Suspended — rewards cannot be redeemed.`;
    case 'archived_account': return `${outcome.racer.displayName}'s Racer Profile is Archived — rewards cannot be redeemed.`;
    case 'found': return '';
  }
}

export default function POSTerminal() {
  const [sale, setSale] = useState<Sale>(() => createNewSale());
  const [confirmed, setConfirmed] = useState<ConfirmedSaleResult | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrMessage, setQrMessage] = useState('');

  const [barcodeInput, setBarcodeInput] = useState('');
  const [productMessage, setProductMessage] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [linkProposal, setLinkProposal] = useState<{ barcode: string; product: PosProduct } | null>(null);
  const [linkedNotice, setLinkedNotice] = useState('');

  const [racerInput, setRacerInput] = useState('');
  const [racerMessage, setRacerMessage] = useState('');
  const [showRacerSearch, setShowRacerSearch] = useState(false);
  const [creditInput, setCreditInput] = useState('');

  const [attachedCar, setAttachedCar] = useState<PosCarRecord | null>(null);
  const [carMessage, setCarMessage] = useState('');
  const [showCarSearch, setShowCarSearch] = useState(false);

  const [eventMessage, setEventMessage] = useState('');
  const [showEventPicker, setShowEventPicker] = useState(false);

  const [redemptionTokens, setRedemptionTokens] = useState<RedemptionToken[]>([]);
  const [generatedRedemption, setGeneratedRedemption] = useState<string>('');

  const [itemsExpanded, setItemsExpanded] = useState(true);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const racerInputRef = useRef<HTMLInputElement | null>(null);
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  // Simulates a payment-idempotency store (a unique DB constraint in the real system).
  const processedKeysRef = useRef<Set<string>>(new Set());
  const productScanGuardRef = useRef(createDuplicateScanGuard(1500));
  const racerScanGuardRef = useRef(createDuplicateScanGuard(1500));

  const totals = calculateSaleTotals(sale);
  const availableReward = sale.racer ? getAvailableReward(sale.racer.loyaltyPoints) : null;
  const rewardEligible = !!sale.racer && canRedeemRewards(sale.racer.accountStatus);
  const saleOpen = sale.status === 'open';
  const raceServiceBlocked = hasUnmetRaceServiceRequirements(sale);

  const addProductToSale = (product: PosProduct) => {
    if (product.availability === 'out_of_stock') {
      setProductMessage(`${product.name} is out of stock.`);
      return;
    }
    setSale(s => scanProduct(s, product));
    setProductMessage('');
  };

  const addPresetToSale = (preset: PosPresetItem, staffEnteredPriceDkk?: number) => {
    setSale(s => scanPresetItem(s, preset, { staffEnteredPriceDkk }));
  };

  const handlePresetClick = (preset: PosPresetItem) => {
    if (preset.unitPriceDkk == null) {
      const entered = window.prompt(`Enter amount for ${preset.name} (DKK):`);
      const amount = Number(entered);
      if (!entered || !Number.isFinite(amount) || amount <= 0) return;
      addPresetToSale(preset, amount);
      return;
    }
    addPresetToSale(preset);
  };

  const applyRacerOutcome = (outcome: RacerScanOutcome, code: string) => {
    if (outcome.kind === 'invalid_qr' || outcome.kind === 'revoked_card') {
      setRacerMessage(racerOutcomeMessage(outcome, code));
      return;
    }
    setSale(s => attachRacer(s, toRacerSnapshot(outcome.racer)));
    setRacerMessage(racerOutcomeMessage(outcome, code));
  };

  // Routes any scanned/typed g4w:<type>:<token> payload to the correct
  // lookup. Shared by the camera scanner and the generic manual QR field.
  const routeQrPayload = (raw: string) => {
    const result = parseQrPayload(raw);
    if (!result.ok) {
      setQrMessage('This QR code is not a recognized Arctic Mini4WD code.');
      return;
    }
    const { type, token } = result.payload;
    setQrMessage('');
    switch (type) {
      case 'product': {
        if (!productScanGuardRef.current.shouldAccept(token)) return;
        const product = lookupProductByQrToken(token);
        if (!product) { setUnknownBarcode(token); return; }
        addProductToSale(product);
        return;
      }
      case 'service': {
        const preset = lookupServiceByCode(token);
        if (!preset) { setQrMessage('Unknown service QR code.'); return; }
        handlePresetClick(preset);
        return;
      }
      case 'racer': {
        applyRacerOutcome(lookupRacerByQrToken(token), token);
        return;
      }
      case 'car': {
        const car = lookupCarByQrToken(token);
        if (!car) { setCarMessage('No registered car found for this QR code.'); return; }
        setAttachedCar(car);
        setCarMessage('');
        return;
      }
      case 'event': {
        const event = lookupEventByQrToken(token);
        if (!event) { setEventMessage('No event found for this QR code.'); return; }
        setSale(s => attachEvent(s, toEventSnapshot(event)));
        setEventMessage('');
        return;
      }
      case 'redemption': {
        const outcome = resolveRedemptionScan(token, redemptionTokens);
        if (outcome.kind === 'not_found') { setQrMessage('Redemption code not recognized.'); return; }
        if (outcome.kind === 'expired') { setQrMessage('This redemption code has expired.'); return; }
        if (outcome.kind === 'already_redeemed') { setQrMessage('This redemption code has already been used.'); return; }
        if (!sale.racer) { setQrMessage('Scan the Racer QR before redeeming.'); return; }
        if (outcome.token.racerId !== sale.racer.racerId) { setQrMessage('This redemption code belongs to a different racer.'); return; }
        try {
          setSale(s => applyLoyaltyReward(s, outcome.token.reward));
          setRedemptionTokens(tokens => tokens.map(t => t.token === outcome.token.token ? markRedemptionTokenUsed(t) : t));
          setQrMessage(`Redeemed: -${outcome.token.reward.discountDkk} DKK`);
        } catch (e) { setQrMessage((e as Error).message); }
        return;
      }
    }
  };

  const handleCameraDetected = (raw: string) => {
    setCameraOpen(false);
    routeQrPayload(raw);
  };

  const handleQrFieldSubmit = () => {
    const code = qrInput.trim();
    if (!code) { setQrMessage('Enter or paste a QR payload.'); return; }
    routeQrPayload(code);
    setQrInput('');
    qrInputRef.current?.focus();
  };

  const handleGenerateRedemption = () => {
    if (!sale.racer || !availableReward) return;
    const token = issueRedemptionToken(sale.racer.racerId, availableReward);
    setRedemptionTokens(tokens => [...tokens, token]);
    setGeneratedRedemption(formatQrPayload('redemption', token.token));
  };

  const handleProductLookup = (rawCode?: string) => {
    const code = (rawCode ?? barcodeInput).trim();
    if (!code) { setProductMessage(PRODUCT_EMPTY_MESSAGE); return; }
    if (!productScanGuardRef.current.shouldAccept(code)) { setBarcodeInput(''); barcodeInputRef.current?.focus(); return; }

    setUnknownBarcode(null);
    setLinkProposal(null);
    const found = scanBarcode(code);
    if (!found) {
      setUnknownBarcode(code);
      setProductMessage('');
    } else if (found.kind === 'product') {
      addProductToSale(found.product);
    } else if (found.preset.unitPriceDkk == null) {
      setProductMessage(`${found.preset.name} needs a staff-entered price — use the preset buttons below.`);
    } else {
      addPresetToSale(found.preset);
      setProductMessage('');
    }
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const handleRacerLookup = (rawCode?: string) => {
    const code = (rawCode ?? racerInput).trim();
    if (!code) { setRacerMessage(RACER_EMPTY_MESSAGE); return; }
    if (!racerScanGuardRef.current.shouldAccept(code)) { setRacerInput(''); racerInputRef.current?.focus(); return; }
    applyRacerOutcome(lookupRacerByScan(code), code);
    setRacerInput('');
    racerInputRef.current?.focus();
  };

  const handleRemoveRacer = () => {
    setSale(s => removeRacer(s));
    setRacerMessage('');
  };

  const handleProductSearchSelect = (product: PosProduct) => {
    setShowProductSearch(false);
    if (unknownBarcode) {
      setLinkProposal({ barcode: unknownBarcode, product });
      setUnknownBarcode(null);
    }
    addProductToSale(product);
  };

  const handleConfirmLinkProposal = () => {
    if (!linkProposal) return;
    proposeBarcodeMapping({
      productId: linkProposal.product.clubProductId,
      barcode: linkProposal.barcode,
      barcodeType: 'manual',
      assignedBy: 'staff',
    });
    setLinkedNotice(`Linked "${linkProposal.barcode}" to ${linkProposal.product.name} (mock — not saved yet).`);
    setLinkProposal(null);
  };

  const handleRacerSearchSelect = (racer: PosRacerRecord) => {
    setShowRacerSearch(false);
    applyRacerOutcome(lookupRacerByQrToken(racer.qrToken), racer.racerId);
  };

  const handleCarSearchSelect = (car: PosCarRecord) => {
    setShowCarSearch(false);
    setAttachedCar(car);
    setCarMessage('');
  };

  const handleSelectEvent = (event: PosEventRecord) => {
    setShowEventPicker(false);
    setSale(s => attachEvent(s, toEventSnapshot(event)));
    setEventMessage('');
  };

  const handleRemoveEvent = () => setSale(s => removeEvent(s));

  const changeQuantity = (li: SaleLineItem, delta: number) => {
    setSale(s => {
      const nextQty = li.quantity + delta;
      if (nextQty <= 0) return { ...s, lineItems: s.lineItems.filter(item => item.id !== li.id) };
      return { ...s, lineItems: s.lineItems.map(item => item.id === li.id ? { ...item, quantity: nextQty } : item) };
    });
  };

  const removeLineItem = (li: SaleLineItem) => {
    setSale(s => ({ ...s, lineItems: s.lineItems.filter(item => item.id !== li.id) }));
  };

  const handleApplyReward = () => {
    try { setSale(s => applyLoyaltyReward(s)); }
    catch (e) { setRacerMessage((e as Error).message); }
  };

  const handleApplyCredit = () => {
    const amount = Number(creditInput);
    try { setSale(s => applyShopCredit(s, amount)); setCreditInput(''); }
    catch (e) { setRacerMessage((e as Error).message); }
  };

  const handleConfirmPayment = () => {
    try {
      const result = confirmSale(sale, sale.id, processedKeysRef.current);
      setSale(result.sale);
      setConfirmed(result);
    } catch (e) { setProductMessage((e as Error).message); }
  };

  const handleCancelSale = () => setSale(s => cancelSale(s));

  const handleNewSale = () => {
    setSale(createNewSale());
    setConfirmed(null);
    setBarcodeInput(''); setRacerInput(''); setCreditInput(''); setQrInput('');
    setProductMessage(''); setRacerMessage(''); setUnknownBarcode(null); setQrMessage('');
    setLinkProposal(null); setLinkedNotice(''); setAttachedCar(null); setCarMessage('');
    setEventMessage(''); setGeneratedRedemption('');
  };

  const registeredCars = sale.racer ? carsForRacer(sale.racer.racerId) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: sale.lineItems.length > 0 ? 64 : 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ ...F, fontWeight: 900, fontSize: 16, color: '#F5F5F5' }}>
          SALE <span style={{ ...FB, fontSize: 11, color: '#6B7280' }}>{sale.id}</span>{' '}
          <span style={{ ...F, fontSize: 10, letterSpacing: 1, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: '#B8C1CC' }}>{sale.status.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {saleOpen && sale.lineItems.length > 0 && (
            <button onClick={handleCancelSale} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', borderRadius: 8, padding: '6px 12px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>CANCEL SALE</button>
          )}
          <button onClick={handleNewSale} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', borderRadius: 8, padding: '6px 12px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>NEW SALE</button>
        </div>
      </div>

      {/* Shared QR scanner — routes any club-controlled QR type automatically */}
      <div style={{ background: '#071426', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setCameraOpen(true)} disabled={!saleOpen} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', ...F, fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5 }}>
            📷 SCAN QR
          </button>
          <span style={{ ...FB, fontSize: 12, color: '#6B7280' }}>Racer, Product, Service, Car, Event, or Redemption</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <input
            ref={qrInputRef}
            value={qrInput}
            onChange={e => setQrInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleQrFieldSubmit(); }}
            disabled={!saleOpen}
            placeholder="Or type/paste a QR payload (g4w:...)"
            style={{ flex: '1 1 200px', minWidth: 0, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', ...FB, fontSize: 13 }}
          />
          <button onClick={handleQrFieldSubmit} disabled={!saleOpen} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', borderRadius: 8, padding: '8px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed' }}>ROUTE</button>
        </div>
        {qrMessage && <div style={{ marginTop: 10, ...FB, fontSize: 13, color: '#FACC15' }}>{qrMessage}</div>}
      </div>

      {/* Product panel */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 10 }}>PRODUCT / SERVICE (MANUAL FALLBACK)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input
            ref={barcodeInputRef}
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleProductLookup(); }}
            disabled={!saleOpen}
            placeholder="Barcode or item number"
            style={{ flex: '1 1 160px', minWidth: 0, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14 }}
          />
          <button onClick={() => handleProductLookup()} disabled={!saleOpen} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', ...F, fontWeight: 900, fontSize: 12, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5, whiteSpace: 'nowrap' }}>
            ADD / LOOK UP
          </button>
          <button onClick={() => setShowProductSearch(v => !v)} disabled={!saleOpen} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', borderRadius: 8, padding: '10px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5 }}>
            SEARCH PRODUCTS
          </button>
        </div>

        {productMessage && (
          <div style={{ marginTop: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: 10, ...FB, fontSize: 13, color: '#FCA5A5' }}>{productMessage}</div>
        )}

        {unknownBarcode && (
          <div style={{ marginTop: 10, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 8, padding: 12 }}>
            <div style={{ ...FB, fontSize: 13, color: '#FACC15', marginBottom: 4 }}>Barcode not linked to a product.</div>
            <div style={{ ...FB, fontSize: 11, color: '#6B7280', fontFamily: 'monospace', marginBottom: 10 }}>{unknownBarcode}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setShowProductSearch(true)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>SEARCH PRODUCT</button>
              <button onClick={() => { setUnknownBarcode(null); barcodeInputRef.current?.focus(); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>SCAN AGAIN</button>
              <button onClick={() => setUnknownBarcode(null)} style={{ background: 'transparent', border: 'none', color: '#6B7280', borderRadius: 8, padding: '8px 14px', ...FB, fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        )}

        {linkProposal && (
          <div style={{ marginTop: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: 12 }}>
            <div style={{ ...FB, fontSize: 13, color: '#93C5FD', marginBottom: 10 }}>Link this barcode to this product.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleConfirmLinkProposal} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>CONFIRM LINK</button>
              <button onClick={() => setLinkProposal(null)} style={{ background: 'transparent', border: 'none', color: '#6B7280', ...FB, fontSize: 11, cursor: 'pointer' }}>DISMISS</button>
            </div>
          </div>
        )}
        {linkedNotice && <div style={{ marginTop: 10, ...FB, fontSize: 12, color: '#6B7280' }}>{linkedNotice}</div>}

        {showProductSearch && (
          <div style={{ marginTop: 10 }}>
            <ProductSearchCombobox onSelect={handleProductSearchSelect} onClose={() => setShowProductSearch(false)} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {PRESET_POS_ITEMS.map(p => (
            <button key={p.barcode} onClick={() => handlePresetClick(p)} disabled={!saleOpen}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', borderRadius: 6, padding: '6px 10px', ...FB, fontSize: 11, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5 }}>
              {p.name}{p.unitPriceDkk != null ? ` — ${p.unitPriceDkk} DKK` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Line items — collapsible */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
        <button onClick={() => setItemsExpanded(v => !v)} style={{ background: 'none', border: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: 0 }}>
          <span style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC' }}>SALE ITEMS ({sale.lineItems.length})</span>
          <span style={{ ...FB, fontSize: 12, color: '#6B7280' }}>{itemsExpanded ? '▲ Collapse' : '▼ Expand'}</span>
        </button>
        {itemsExpanded && (
          sale.lineItems.length === 0 ? (
            <div style={{ ...FB, fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '16px 0' }}>No items scanned yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {sale.lineItems.map(li => {
                const isRaceService = isRaceServiceBarcode(li.barcode);
                return (
                  <div key={li.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                    <div style={{ minWidth: 0, flex: '1 1 160px' }}>
                      <div style={{ ...F, fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{li.name}</div>
                      <div style={{ ...FB, fontSize: 11, color: '#6B7280' }}>
                        {li.tamiyaItemNumber ? `Item #${li.tamiyaItemNumber} · ` : ''}{li.isStockTracked ? 'Stock item' : 'Service/preset'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => changeQuantity(li, -1)} aria-label={`Decrease quantity for ${li.name}`} style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: 'none', color: '#F5F5F5', cursor: 'pointer' }}>−</button>
                      <span style={{ ...F, fontWeight: 700, fontSize: 13, color: '#F5F5F5', minWidth: 18, textAlign: 'center' }}>{li.quantity}</span>
                      <button onClick={() => changeQuantity(li, 1)} disabled={isRaceService} title={isRaceService ? 'Race entries and Second Lives cannot be quantity-stacked — scan the service again for a separate entry.' : undefined}
                        aria-label={`Increase quantity for ${li.name}`} style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: 'none', color: isRaceService ? '#4B5563' : '#F5F5F5', cursor: isRaceService ? 'not-allowed' : 'pointer' }}>+</button>
                    </div>
                    <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#FACC15', minWidth: 70, textAlign: 'right' }}>{li.unitPriceDkk * li.quantity} DKK</div>
                    <button onClick={() => removeLineItem(li)} aria-label={`Remove ${li.name}`} style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 13, ...FB }}>Remove</button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Racer panel */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 10 }}>RACER (OPTIONAL)</div>
        {!sale.racer ? (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                ref={racerInputRef}
                value={racerInput}
                onChange={e => setRacerInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRacerLookup(); }}
                disabled={!saleOpen}
                placeholder="Racer ID"
                style={{ flex: '1 1 160px', minWidth: 0, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', ...FB, fontSize: 14 }}
              />
              <button onClick={() => handleRacerLookup()} disabled={!saleOpen} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', ...F, fontWeight: 900, fontSize: 12, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5, whiteSpace: 'nowrap' }}>
                LOOK UP
              </button>
              <button onClick={() => setShowRacerSearch(v => !v)} disabled={!saleOpen} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', borderRadius: 8, padding: '10px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5 }}>
                SEARCH RACERS
              </button>
            </div>
            {racerMessage && (
              <div style={{ marginTop: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: 10, ...FB, fontSize: 13, color: '#FCA5A5' }}>{racerMessage}</div>
            )}
            {showRacerSearch && (
              <div style={{ marginTop: 10 }}>
                <RacerSearchCombobox onSelect={handleRacerSearchSelect} onClose={() => setShowRacerSearch(false)} />
              </div>
            )}
            <div style={{ marginTop: 10, ...FB, fontSize: 12, color: '#6B7280' }}>No Racer Profile attached — no Loyalty Points will be earned.</div>
          </>
        ) : (
          <>
            {racerMessage && (
              <div style={{ marginBottom: 10, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 8, padding: 10, ...FB, fontSize: 13, color: '#FACC15' }}>{racerMessage}</div>
            )}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ ...F, fontWeight: 900, fontSize: 16, color: '#fff' }}>{initials(sale.racer.displayName)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#F5F5F5' }}>{sale.racer.displayName}</div>
                <div style={{ ...FB, fontSize: 11, color: '#FACC15', fontFamily: 'monospace' }}>{sale.racer.racerId}</div>
                <div style={{ ...FB, fontSize: 10, color: '#6B7280' }}>{sale.racer.accountStatus}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...FB, fontSize: 10, color: '#6B7280' }}>LOYALTY POINTS</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#F5F5F5' }}>{sale.racer.loyaltyPoints.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...FB, fontSize: 10, color: '#6B7280' }}>SHOP CREDIT</div>
                <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#22C55E' }}>{sale.racer.shopCreditDkk} DKK</div>
              </div>
              <button onClick={handleRemoveRacer} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', borderRadius: 8, padding: '6px 12px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>REMOVE / CHANGE RACER</button>
            </div>

            <div style={{ ...FB, fontSize: 11, color: '#F97316', marginTop: 10 }}>⚠️ Staff: visually verify the profile picture matches the racer.</div>

            {registeredCars.length > 0 && (
              <div style={{ marginTop: 10, ...FB, fontSize: 12, color: '#B8C1CC' }}>
                Registered cars: {registeredCars.map(c => `${c.clubCarId} (${c.model})`).join(', ')}
              </div>
            )}

            {saleOpen && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <button onClick={handleApplyReward} disabled={!rewardEligible || !availableReward || !!sale.appliedReward}
                  style={{ background: 'transparent', border: '1px solid rgba(250,204,21,0.3)', color: '#FACC15', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: rewardEligible && availableReward && !sale.appliedReward ? 'pointer' : 'not-allowed', opacity: rewardEligible && availableReward && !sale.appliedReward ? 1 : 0.4 }}>
                  {sale.appliedReward ? `REWARD APPLIED (-${sale.appliedReward.discountDkk} DKK)` : !rewardEligible ? 'REWARDS UNAVAILABLE' : availableReward ? `APPLY REWARD (-${availableReward.discountDkk} DKK)` : 'NO REWARD AVAILABLE'}
                </button>
                {rewardEligible && availableReward && !sale.appliedReward && (
                  <button onClick={handleGenerateRedemption} style={{ background: 'transparent', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>
                    GENERATE REDEMPTION QR (DEMO)
                  </button>
                )}
                <input value={creditInput} onChange={e => setCreditInput(e.target.value)} placeholder="Shop Credit DKK"
                  style={{ width: 120, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#F5F5F5', ...FB, fontSize: 13 }} />
                <button onClick={handleApplyCredit} style={{ background: 'transparent', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>APPLY SHOP CREDIT</button>
              </div>
            )}
            {generatedRedemption && (
              <div style={{ marginTop: 10, ...FB, fontSize: 11, color: '#6B7280' }}>
                Demo redemption code (scan/paste to redeem): <span style={{ fontFamily: 'monospace', color: '#93C5FD' }}>{generatedRedemption}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Car panel */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 10 }}>CLUB CAR (OPTIONAL)</div>
        {!attachedCar ? (
          <>
            <button onClick={() => setShowCarSearch(v => !v)} disabled={!saleOpen} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', borderRadius: 8, padding: '10px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5 }}>
              SEARCH CARS
            </button>
            {carMessage && <div style={{ marginTop: 10, ...FB, fontSize: 13, color: '#FCA5A5' }}>{carMessage}</div>}
            {showCarSearch && <div style={{ marginTop: 10 }}><CarSearchCombobox onSelect={handleCarSearchSelect} onClose={() => setShowCarSearch(false)} /></div>}
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#F5F5F5' }}>{attachedCar.model}</div>
                <div style={{ ...FB, fontSize: 11, color: '#FACC15', fontFamily: 'monospace' }}>{attachedCar.clubCarId}</div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginTop: 4 }}>
                  Owner: {attachedCar.ownerName} ({attachedCar.racerId}) · Chassis: {attachedCar.chassis} · {attachedCar.category} · {attachedCar.mainColor}
                </div>
                <div style={{ ...FB, fontSize: 11, color: '#6B7280', marginTop: 2 }}>Registration: {attachedCar.registrationStatus}</div>
              </div>
              <button onClick={() => setAttachedCar(null)} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', borderRadius: 8, padding: '6px 12px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>REMOVE</button>
            </div>
          </div>
        )}
      </div>

      {/* Event panel */}
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
        <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC', marginBottom: 10 }}>EVENT (REQUIRED FOR RACE SERVICES)</div>
        {!sale.event ? (
          <>
            <button onClick={() => setShowEventPicker(v => !v)} disabled={!saleOpen} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', borderRadius: 8, padding: '10px 16px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: saleOpen ? 'pointer' : 'not-allowed', opacity: saleOpen ? 1 : 0.5 }}>
              SELECT EVENT
            </button>
            {eventMessage && <div style={{ marginTop: 10, ...FB, fontSize: 13, color: '#FCA5A5' }}>{eventMessage}</div>}
            {showEventPicker && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {searchEvents('').map(ev => (
                  <button key={ev.eventId} onClick={() => handleSelectEvent(ev)}
                    style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', color: '#F5F5F5', ...FB, fontSize: 13 }}>
                    <span>{ev.name}</span><span style={{ color: '#6B7280' }}>{ev.date}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...F, fontWeight: 900, fontSize: 15, color: '#F5F5F5' }}>{sale.event.name}</div>
              <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{sale.event.date} · {sale.event.type.replace('_', ' ')} · pricing: {sale.event.pricingModel.replace('_', ' ')}</div>
            </div>
            <button onClick={handleRemoveEvent} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', borderRadius: 8, padding: '6px 12px', ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>CHANGE EVENT</button>
          </div>
        )}
      </div>

      {raceServiceBlocked && (
        <div style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 8, padding: 10, ...FB, fontSize: 13, color: '#FACC15' }}>
          Attach a Racer Profile before confirming a race-related payment.
        </div>
      )}

      {/* Totals + confirm */}
      <div style={{ background: '#071426', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 12, padding: 18 }}>
        {[
          ['Subtotal', `${totals.subtotalDkk} DKK`],
          ['Reward discount', `-${totals.rewardDiscountDkk} DKK`],
          ['Shop Credit applied', `-${totals.shopCreditAppliedDkk} DKK`],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 6 }}>
            <span>{label}</span><span>{value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', ...F, fontWeight: 900, fontSize: 22, color: '#FACC15', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span>CASH DUE</span><span>{totals.cashDueDkk} DKK</span>
        </div>
        <div style={{ ...FB, fontSize: 12, color: '#22C55E', marginTop: 6 }}>
          {sale.racer ? `Racer will earn ${totals.pointsToEarn.toFixed(2)} Loyalty Points` : 'No Racer Profile attached — no Loyalty Points will be earned'}
        </div>

        {saleOpen && (
          <button onClick={handleConfirmPayment} disabled={sale.lineItems.length === 0}
            style={{ marginTop: 16, width: '100%', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: 14, ...F, fontWeight: 900, fontSize: 15, letterSpacing: 2, cursor: sale.lineItems.length ? 'pointer' : 'not-allowed', opacity: sale.lineItems.length ? 1 : 0.4 }}>
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

      {/* Sticky compact cart summary — never overlaps Confirm Payment, which stays in normal flow above. */}
      {sale.lineItems.length > 0 && !confirmed && (
        <div style={{ position: 'sticky', bottom: 0, background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '10px 10px 0 0', boxShadow: '0 -4px 12px rgba(0,0,0,0.4)' }}>
          <span style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>{sale.lineItems.length} item{sale.lineItems.length !== 1 ? 's' : ''}</span>
          <span style={{ ...F, fontWeight: 900, fontSize: 16, color: '#FACC15' }}>{totals.cashDueDkk} DKK</span>
        </div>
      )}

      {cameraOpen && (
        <CameraScannerModal
          title="Scan QR Code"
          onDetected={handleCameraDetected}
          onCancel={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
