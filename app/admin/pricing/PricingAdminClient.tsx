'use client';
// Preview-only pricing/campaign admin UI. Operates entirely on the in-memory
// demo catalog (lib/pricing/previewDemoCatalog.ts) and an in-memory
// PricingAuditLog — zero Supabase reads or writes anywhere in this file.
// The role selector below is a Preview-only simulator standing in for a
// real Supabase Auth session + staff_roles row (docs/PHASED-SUPABASE-MIGRATION-PLAN.md);
// it is not a security boundary and must never be treated as one once Auth/RLS ship.

import { useMemo, useState } from 'react';
import {
  CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR,
  CAMPAIGN_TYPE_LABEL,
  type CampaignType,
  type SaleCampaign,
  type ScopeRule,
  type ExclusionRule,
} from '@/lib/pricing/campaign';
import { buildCampaignPreview } from '@/lib/pricing/campaignPreview';
import { PREVIEW_DEMO_CATALOG } from '@/lib/pricing/previewDemoCatalog';
import { PricingAuditLog } from '@/lib/pricing/auditLog';
import { canCreateCampaign, canApproveCampaign, canUseBelowCostOverride, type PricingStaffRole } from '@/lib/pricing/permissions';
import { oreToDkk } from '@/lib/pricing/money';

const F = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

function dkk(ore: number): string {
  return oreToDkk(ore).toLocaleString('en-DK', { maximumFractionDigits: 0 });
}

const SCOPE_OPTIONS: { value: ScopeRule; label: string }[] = [
  { value: { kind: 'all_products' }, label: 'All products' },
  { value: { kind: 'all_complete_car_kits' }, label: 'All complete car kits' },
  { value: { kind: 'all_upgrade_parts' }, label: 'All upgrade parts' },
  { value: { kind: 'part_group', group: 'motors' }, label: 'All motors' },
  { value: { kind: 'part_group', group: 'rollers' }, label: 'All rollers' },
  { value: { kind: 'part_group', group: 'plates' }, label: 'All plates' },
  { value: { kind: 'part_group', group: 'gears_drivetrain' }, label: 'All gears/drivetrain' },
  { value: { kind: 'part_group', group: 'body_chassis_sets' }, label: 'All body/chassis sets' },
  { value: { kind: 'chassis_family', chassis: 'AR' }, label: 'AR chassis' },
  { value: { kind: 'chassis_family', chassis: 'FM-A' }, label: 'FM-A chassis' },
  { value: { kind: 'chassis_family', chassis: 'VZ' }, label: 'VZ chassis' },
  { value: { kind: 'chassis_family', chassis: 'MA' }, label: 'MA chassis' },
  { value: { kind: 'chassis_family', chassis: 'MS' }, label: 'MS chassis' },
  { value: { kind: 'chassis_family', chassis: 'Super II' }, label: 'Super II chassis' },
  { value: { kind: 'starter_packs' }, label: 'Starter Packs' },
  { value: { kind: 'collector_products' }, label: 'Collector products' },
  { value: { kind: 'preorder_products' }, label: 'Preorder products' },
];

const EXCLUSION_OPTIONS: { key: string; rule: ExclusionRule; label: string }[] = [
  { key: 'collector', rule: { kind: 'collector_products' }, label: 'Collector products' },
  { key: 'preorder', rule: { kind: 'preorder_products' }, label: 'Preorder products' },
  { key: 'special_orders', rule: { kind: 'special_orders' }, label: 'Special orders' },
  { key: 'newly_arrived', rule: { kind: 'newly_arrived', withinDays: 30 }, label: 'Newly arrived (< 30 days)' },
  { key: 'below_margin', rule: { kind: 'below_margin', marginFloor: 0.2 }, label: 'Already below 20% margin' },
];

function scopeLabel(rule: ScopeRule): string {
  return SCOPE_OPTIONS.find(o => JSON.stringify(o.value) === JSON.stringify(rule))?.label ?? rule.kind;
}

export default function PricingAdminClient() {
  const [role, setRole] = useState<PricingStaffRole>('admin');
  const [campaigns, setCampaigns] = useState<SaleCampaign[]>([]);
  const [auditLog] = useState(() => new PricingAuditLog());
  const [auditVersion, setAuditVersion] = useState(0); // bump to re-render after auditLog.record()

  const [name, setName] = useState('');
  const [type, setType] = useState<CampaignType>('standard_sale');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [marginFloorPercent, setMarginFloorPercent] = useState(CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR.standard_sale * 100);
  const [scopeIndex, setScopeIndex] = useState(0);
  const [selectedExclusionKeys, setSelectedExclusionKeys] = useState<Set<string>>(new Set());
  const [badgeText, setBadgeText] = useState('SALE');
  const [publicDescription, setPublicDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [belowCostConfirm1, setBelowCostConfirm1] = useState(false);
  const [belowCostConfirm2, setBelowCostConfirm2] = useState(false);
  const [belowCostFloorDkk, setBelowCostFloorDkk] = useState(0);
  const [formError, setFormError] = useState('');

  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);
  const [pendingActivationId, setPendingActivationId] = useState<string | null>(null);

  const onTypeChange = (t: CampaignType) => {
    setType(t);
    setMarginFloorPercent(CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR[t] * 100);
    setBelowCostConfirm1(false);
    setBelowCostConfirm2(false);
  };

  const toggleExclusion = (key: string) => {
    setSelectedExclusionKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const createCampaign = () => {
    setFormError('');
    const marginFloor = marginFloorPercent / 100;
    const typeDefaultFloor = CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR[type];

    if (!canCreateCampaign(role, type, marginFloor, typeDefaultFloor)) {
      setFormError(
        role === 'viewer'
          ? 'Viewer role is read-only and cannot create campaigns.'
          : `Shop Manager may only create Standard Sale campaigns at or above the ${(typeDefaultFloor * 100).toFixed(0)}% floor. Use the Admin role for ${CAMPAIGN_TYPE_LABEL[type]}.`
      );
      return;
    }
    if (!name.trim()) { setFormError('Campaign name is required.'); return; }

    let belowCostOverride: SaleCampaign['belowCostOverride'];
    if (type === 'liquidation' && belowCostFloorDkk > 0) {
      if (!canUseBelowCostOverride(role)) { setFormError('Only Admin may use the below-cost override.'); return; }
      if (!belowCostConfirm1 || !belowCostConfirm2) { setFormError('Below-cost override requires both confirmations.'); return; }
      belowCostOverride = {
        reason: internalNote || 'Below-cost liquidation override',
        confirmedByUserId: 'preview-admin-1',
        secondConfirmedByUserId: 'preview-admin-2',
        floorOre: Math.round(belowCostFloorDkk * 100),
      };
    }

    const scope = SCOPE_OPTIONS[scopeIndex].value;
    const exclusions = EXCLUSION_OPTIONS.filter(o => selectedExclusionKeys.has(o.key)).map(o => o.rule);
    const now = new Date().toISOString();
    const campaign: SaleCampaign = {
      id: `campaign_${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      type,
      requestedDiscountPercent: discountPercent / 100,
      minimumAllowedMargin: marginFloor,
      belowCostOverride,
      startAt: now,
      endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      enabled: false,
      badgeText,
      internalNote,
      publicDescription,
      createdBy: `preview-${role}`,
      createdAt: now,
      updatedAt: now,
      scope: [scope],
      exclusions,
    };

    setCampaigns(prev => [...prev, campaign]);
    auditLog.record({
      type: 'campaign_created',
      actorUserId: `preview-${role}`,
      previousValue: null,
      newValue: campaign,
      reason: 'Created via Preview admin campaign form.',
      affectedCampaignId: campaign.id,
      sourceContext: 'admin campaign preview',
    });
    setAuditVersion(v => v + 1);
    setName(''); setInternalNote(''); setPublicDescription('');
    setPreviewCampaignId(campaign.id);
  };

  const requestActivation = (id: string) => setPendingActivationId(id);
  const confirmActivation = (id: string) => {
    if (!canApproveCampaign(role)) { setFormError('Only Admin may approve/activate a campaign.'); return; }
    setCampaigns(prev => prev.map(c => (c.id === id ? { ...c, enabled: true, approvedBy: `preview-${role}`, updatedAt: new Date().toISOString() } : c)));
    auditLog.record({
      type: 'campaign_activated',
      actorUserId: `preview-${role}`,
      previousValue: { enabled: false },
      newValue: { enabled: true },
      reason: 'Activated via Preview admin campaign list.',
      affectedCampaignId: id,
      sourceContext: 'admin campaign list',
    });
    setAuditVersion(v => v + 1);
    setPendingActivationId(null);
  };
  const deactivate = (id: string) => {
    setCampaigns(prev => prev.map(c => (c.id === id ? { ...c, enabled: false, updatedAt: new Date().toISOString() } : c)));
    auditLog.record({
      type: 'campaign_deactivated',
      actorUserId: `preview-${role}`,
      previousValue: { enabled: true },
      newValue: { enabled: false },
      reason: 'Deactivated via Preview admin campaign list.',
      affectedCampaignId: id,
      sourceContext: 'admin campaign list',
    });
    setAuditVersion(v => v + 1);
  };

  const previewCampaign = campaigns.find(c => c.id === previewCampaignId) ?? null;
  const preview = useMemo(
    () => (previewCampaign ? buildCampaignPreview(PREVIEW_DEMO_CATALOG, previewCampaign, new Date()) : null),
    [previewCampaign]
  );

  return (
    <div style={{ background: '#050505', minHeight: '100vh', color: '#F5F5F5' }}>
      <div style={{ background: '#7f1d1d', color: '#fff', padding: '14px 18px', textAlign: 'center', ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2 }}>
        PREVIEW — PRICING &amp; CAMPAIGN ADMIN — MOCK DATA — DISABLED IN PRODUCTION
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px' }}>
        <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', marginBottom: 20, lineHeight: 1.7 }}>
          Every campaign/product here is in-memory only (lib/pricing/previewDemoCatalog.ts) — nothing is read from or
          written to Supabase. Supabase Auth, staff roles and RLS are not live yet
          (docs/PHASED-SUPABASE-MIGRATION-PLAN.md); the role selector below simulates a staff session for demonstration
          only and is not a real security boundary.
        </div>

        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#B8C1CC' }}>ROLE SIMULATOR:</div>
          {(['admin', 'shop_manager', 'viewer'] as PricingStaffRole[]).map(r => (
            <button key={r} onClick={() => setRole(r)}
              style={{ background: role === r ? '#DC2626' : 'transparent', color: role === r ? '#fff' : '#B8C1CC', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', ...F, fontWeight: 700, fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>
              {r === 'admin' ? 'Admin' : r === 'shop_manager' ? 'Shop Manager' : 'Viewer'}
            </button>
          ))}
        </div>

        {/* ── Campaign creation form ─────────────────────────────── */}
        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ ...F, fontWeight: 700, fontSize: 14, letterSpacing: 2, color: '#B8C1CC', marginBottom: 16 }}>CREATE CAMPAIGN</div>

          {role === 'viewer' ? (
            <div style={{ ...FB, fontSize: 13, color: '#FACC15' }}>Viewer role is read-only — switch to Admin or Shop Manager to create a campaign.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <label style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                  Campaign name
                  <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Christmas Sale" />
                </label>
                <label style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                  Campaign type
                  <select value={type} onChange={e => onTypeChange(e.target.value as CampaignType)} style={inputStyle} disabled={role === 'shop_manager' && false}>
                    {(['standard_sale', 'anniversary_sale', 'clearance', 'liquidation'] as CampaignType[]).map(t => (
                      <option key={t} value={t} disabled={role === 'shop_manager' && t !== 'standard_sale'}>
                        {CAMPAIGN_TYPE_LABEL[t]} (default floor {(CAMPAIGN_TYPE_DEFAULT_MARGIN_FLOOR[t] * 100).toFixed(0)}%)
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                  Requested discount %
                  <input type="number" min={0} max={100} value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} style={inputStyle} />
                </label>
                <label style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                  Minimum allowed margin %
                  <input type="number" min={0} max={99} value={marginFloorPercent} onChange={e => setMarginFloorPercent(Number(e.target.value))} style={inputStyle}
                    disabled={role === 'shop_manager'} title={role === 'shop_manager' ? 'Shop Manager uses the type default floor' : ''} />
                </label>
                <label style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                  Badge text
                  <input value={badgeText} onChange={e => setBadgeText(e.target.value)} style={inputStyle} />
                </label>
                <label style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                  Target scope
                  <select value={scopeIndex} onChange={e => setScopeIndex(Number(e.target.value))} style={inputStyle}>
                    {SCOPE_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
                  </select>
                </label>
              </div>

              <div>
                <div style={{ ...FB, fontSize: 12, color: '#B8C1CC', marginBottom: 6 }}>Exclusions</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EXCLUSION_OPTIONS.map(o => (
                    <button key={o.key} onClick={() => toggleExclusion(o.key)}
                      style={{ background: selectedExclusionKeys.has(o.key) ? 'rgba(220,38,38,0.15)' : 'transparent', border: `1px solid ${selectedExclusionKeys.has(o.key) ? '#DC2626' : 'rgba(255,255,255,0.15)'}`, borderRadius: 8, padding: '6px 12px', ...FB, fontSize: 12, color: '#F5F5F5', cursor: 'pointer' }}>
                      {selectedExclusionKeys.has(o.key) ? '✓ ' : ''}{o.label}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                Public description
                <input value={publicDescription} onChange={e => setPublicDescription(e.target.value)} style={inputStyle} />
              </label>
              <label style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                Internal note
                <input value={internalNote} onChange={e => setInternalNote(e.target.value)} style={inputStyle} />
              </label>

              {type === 'liquidation' && (
                <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: 14 }}>
                  <div style={{ ...F, fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#FCA5A5', marginBottom: 8 }}>⚠ BELOW-COST OVERRIDE (ADMIN ONLY)</div>
                  <label style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                    Explicit below-cost floor (DKK) — 0 disables the override
                    <input type="number" min={0} value={belowCostFloorDkk} onChange={e => setBelowCostFloorDkk(Number(e.target.value))} style={inputStyle} disabled={!canUseBelowCostOverride(role)} />
                  </label>
                  {belowCostFloorDkk > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ ...FB, fontSize: 12, color: '#F5F5F5', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="checkbox" checked={belowCostConfirm1} onChange={e => setBelowCostConfirm1(e.target.checked)} disabled={!canUseBelowCostOverride(role)} />
                        First confirmation: I understand this sells below landed cost.
                      </label>
                      <label style={{ ...FB, fontSize: 12, color: '#F5F5F5', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="checkbox" checked={belowCostConfirm2} onChange={e => setBelowCostConfirm2(e.target.checked)} disabled={!canUseBelowCostOverride(role)} />
                        Second confirmation: a second administrator has reviewed this.
                      </label>
                    </div>
                  )}
                </div>
              )}

              {formError && <div style={{ ...FB, fontSize: 13, color: '#DC2626' }}>{formError}</div>}

              <button onClick={createCampaign} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', ...F, fontWeight: 900, fontSize: 14, letterSpacing: 1, cursor: 'pointer', alignSelf: 'flex-start' }}>
                CREATE CAMPAIGN (DISABLED UNTIL ACTIVATED)
              </button>
            </div>
          )}
        </div>

        {/* ── Campaign list ──────────────────────────────────────── */}
        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ ...F, fontWeight: 700, fontSize: 14, letterSpacing: 2, color: '#B8C1CC', marginBottom: 16 }}>CAMPAIGNS ({campaigns.length})</div>
          {campaigns.length === 0 ? (
            <div style={{ ...FB, fontSize: 13, color: '#6B7280' }}>No campaigns created yet in this Preview session.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ ...F, fontWeight: 700, fontSize: 15, color: '#F5F5F5' }}>{c.name} <span style={{ color: '#6B7280', fontSize: 12 }}>({CAMPAIGN_TYPE_LABEL[c.type]})</span></div>
                    <div style={{ ...FB, fontSize: 12, color: '#B8C1CC' }}>
                      {scopeLabel(c.scope[0])} · {(c.requestedDiscountPercent * 100).toFixed(0)}% requested · floor {(c.minimumAllowedMargin * 100).toFixed(0)}% ·{' '}
                      <span style={{ color: c.enabled ? '#22C55E' : '#6B7280' }}>{c.enabled ? 'ACTIVE' : 'disabled'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setPreviewCampaignId(c.id)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 12, color: '#F5F5F5', cursor: 'pointer' }}>PREVIEW</button>
                    {c.enabled ? (
                      <button onClick={() => deactivate(c.id)} style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid #DC2626', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 12, color: '#FCA5A5', cursor: 'pointer' }}>DEACTIVATE</button>
                    ) : pendingActivationId === c.id ? (
                      <button onClick={() => confirmActivation(c.id)} style={{ background: '#22C55E', border: 'none', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 900, fontSize: 12, color: '#050505', cursor: 'pointer' }}>CONFIRM ACTIVATION</button>
                    ) : (
                      <button onClick={() => requestActivation(c.id)} disabled={role === 'viewer'} style={{ background: role === 'viewer' ? 'rgba(255,255,255,0.05)' : '#3B82F6', border: 'none', borderRadius: 8, padding: '8px 14px', ...F, fontWeight: 700, fontSize: 12, color: '#fff', cursor: role === 'viewer' ? 'not-allowed' : 'pointer', opacity: role === 'viewer' ? 0.5 : 1 }}>ACTIVATE</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Campaign preview ───────────────────────────────────── */}
        {preview && previewCampaign && (
          <div style={{ background: '#071426', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ ...F, fontWeight: 700, fontSize: 14, letterSpacing: 2, color: '#B8C1CC', marginBottom: 16 }}>
              PREVIEW — {previewCampaign.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
              <Stat label="Selected products" value={preview.selectedCount} />
              <Stat label="Full discount" value={preview.fullDiscountCount} color="#22C55E" />
              <Stat label="Margin-capped" value={preview.marginCappedCount} color="#FACC15" />
              <Stat label="No valid discount" value={preview.noValidDiscountCount} color="#F97316" />
              <Stat label="Excluded" value={preview.excludedCount} color="#6B7280" />
              <Stat label="Regular retail value" value={`${dkk(preview.regularRetailValueOre)} kr`} />
              <Stat label="Expected sale revenue" value={`${dkk(preview.expectedSaleRevenueOre)} kr`} />
              <Stat label="Total landed cost" value={`${dkk(preview.totalLandedCostOre)} kr`} />
              <Stat label="Expected gross profit" value={`${dkk(preview.expectedGrossProfitOre)} kr`} color="#22C55E" />
              <Stat label="Effective gross margin" value={`${(preview.effectiveGrossMargin * 100).toFixed(1)}%`} />
              <Stat label="Expected discount value" value={`${dkk(preview.expectedDiscountValueOre)} kr`} />
              <Stat label="Cash recovered (aged 90+d)" value={`${dkk(preview.estimatedCashRecoveredFromAgedStockOre)} kr`} />
            </div>

            {preview.marginCappedCount > 0 && (
              <div style={{ ...FB, fontSize: 12, color: '#FACC15', marginBottom: 12 }}>
                “Up to {(previewCampaign.requestedDiscountPercent * 100).toFixed(0)}% off” — not every eligible product receives the full requested percentage; see margin-cap reasons below.
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', ...FB, fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#6B7280', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['Product', 'SKU', 'Chassis', 'Landed cost', 'Regular', 'Requested', 'Final', 'Profit', 'Margin', 'Status', 'Reason'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map(r => (
                    <tr key={r.product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '6px 8px', color: '#F5F5F5' }}>{r.product.name}</td>
                      <td style={{ padding: '6px 8px' }}>{r.product.itemNo}</td>
                      <td style={{ padding: '6px 8px' }}>{r.product.chassis ?? '—'}</td>
                      <td style={{ padding: '6px 8px' }}>{dkk(r.product.landedCostOre)} kr</td>
                      <td style={{ padding: '6px 8px' }}>{dkk(r.regularPriceOre)} kr</td>
                      <td style={{ padding: '6px 8px' }}>{r.requestedPriceOre != null ? `${dkk(r.requestedPriceOre)} kr` : '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#22C55E' }}>{r.finalPriceOre != null ? `${dkk(r.finalPriceOre)} kr` : '—'}</td>
                      <td style={{ padding: '6px 8px' }}>{r.grossProfitOre != null ? `${dkk(r.grossProfitOre)} kr` : '—'}</td>
                      <td style={{ padding: '6px 8px' }}>{r.grossMargin != null ? `${(r.grossMargin * 100).toFixed(1)}%` : '—'}</td>
                      <td style={{ padding: '6px 8px', color: r.status === 'excluded' ? '#6B7280' : r.status === 'margin_capped' ? '#FACC15' : r.status === 'no_valid_discount' ? '#F97316' : '#22C55E' }}>{r.status.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '6px 8px', color: '#6B7280' }}>{r.marginCapReason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Audit log ──────────────────────────────────────────── */}
        <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }} key={auditVersion}>
          <div style={{ ...F, fontWeight: 700, fontSize: 14, letterSpacing: 2, color: '#B8C1CC', marginBottom: 16 }}>AUDIT LOG ({auditLog.all().length})</div>
          {auditLog.all().length === 0 ? (
            <div style={{ ...FB, fontSize: 13, color: '#6B7280' }}>No audit events yet in this Preview session.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...auditLog.all()].reverse().map(e => (
                <div key={e.id} style={{ ...FB, fontSize: 12, color: '#B8C1CC', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
                  <span style={{ color: '#F5F5F5', fontWeight: 700 }}>{e.type}</span> · {e.actorUserId} · {new Date(e.timestamp).toLocaleString()} · {e.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ ...FB, fontSize: 10, color: '#6B7280', marginBottom: 4 }}>{label}</div>
      <div style={{ ...F, fontWeight: 900, fontSize: 18, color: color ?? '#F5F5F5' }}>{value}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  background: '#050505',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#F5F5F5',
  ...FB,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};
