import type { StaffRole } from '@/lib/supabaseAuth/roles';

/**
 * Declarative allowlist for admin writes performed on the SERVER with the operator's own session.
 * Anything not described here is refused. Roles are a least-privilege proposal derived from
 * docs/SECURITY_CUTOVER_POLICY_MATRIX_2026-10-16.md and need owner review (see docs/phase1/ROLE_REVIEW.md);
 * `admin` is allowed on every rule. This is application-layer authorization. Database RLS must still be cut
 * over separately (not done).
 *
 * Every written column that carries meaning (status, tier, points, dates, URLs) has a value check, so a
 * permitted role cannot write arbitrary states or amounts into it.
 */
export type WriteOp = 'insert' | 'update' | 'delete' | 'upsert';

export interface ColumnCheck {
  /** exact allowed values */
  in?: readonly (string | number | boolean)[];
  /** integer range, inclusive */
  int?: readonly [number, number];
  /** finite-number range, inclusive */
  num?: readonly [number, number];
  /** string must match (anchored by the pattern itself) */
  re?: RegExp;
  /** string length range, inclusive */
  len?: readonly [number, number];
  /** string array (e.g. race_categories): max items and per-item length */
  strArr?: { max: number; item: readonly [number, number] };
  /** comma-separated list of images: https URL, site-relative path, or a base64 image data URL */
  images?: true;
  nullable?: boolean;
}

export interface WriteRule {
  table: string;
  op: WriteOp;
  /** Columns that may appear in `values`. Unknown columns are REJECTED, not silently stripped. */
  columns: readonly string[];
  /** Columns usable in `match` (equality). update/delete require at least one. */
  match: readonly string[];
  /** update only: columns usable as a "not equal" filter (e.g. deactivate all other seasons). */
  neq?: readonly string[];
  /** upsert only. */
  onConflict?: string;
  /** Per-column value constraints. A column in `columns` without a check accepts any bounded scalar. */
  check?: Readonly<Record<string, ColumnCheck>>;
  /** insert only: the caller may ask for the new row id back */
  returning?: boolean;
  roles: readonly StaffRole[];
}

const ADMIN: readonly StaffRole[] = ['admin'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** date or timestamp as produced by <input type=date>, toISOString() or Postgres timestamptz output */
const ISO_TS = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?)?$/;
const TEXT_SHORT: ColumnCheck = { len: [0, 200], nullable: true };
const TEXT_NOTE: ColumnCheck = { len: [0, 1000], nullable: true };
const NAME: ColumnCheck = { len: [1, 120] };
const NAME_OR_EMPTY: ColumnCheck = { len: [0, 120] };
const ORDER_STATUSES = ['awaiting_payment', 'proof_uploaded', 'payment_confirmed', 'reserved', 'awaiting_stock', 'in_transit', 'ready_for_pickup', 'completed', 'cancelled'] as const;
const TICKET_STATUSES = ['awaiting_payment', 'proof_uploaded', 'payment_confirmed', 'cancelled'] as const;
const TIERS = ['member', 'season_3rd', 'season_2nd', 'season_1st', 'hall_of_fame'] as const;

const IMAGES: ColumnCheck = { images: true, nullable: true };
const NEWS_COLS = ['title', 'summary', 'body', 'image_url', 'category', 'published', 'tournament_id'];
const NEWS_CHECK: Record<string, ColumnCheck> = { title: { len: [1, 200] }, summary: { len: [0, 600], nullable: true }, body: { len: [0, 20000], nullable: true }, image_url: IMAGES, category: { len: [1, 60] }, published: { in: [true, false] }, tournament_id: { len: [1, 64], nullable: true } };
const GALLERY_COLS = ['title', 'caption', 'image_url', 'category'];
const GALLERY_CHECK: Record<string, ColumnCheck> = { title: { len: [0, 200], nullable: true }, caption: { len: [0, 1000], nullable: true }, image_url: { images: true }, category: { len: [1, 60] } };
const PRICE: ColumnCheck = { num: [0, 1_000_000], nullable: true };
const STOCK: ColumnCheck = { int: [0, 100_000], nullable: true };
const PRODUCT_COLS = ['name', 'item_no', 'category', 'subcategory', 'chassis', 'type', 'status', 'description', 'image_url', 'available', 'is_collectors_vault', 'unbuilt_stock', 'built_stock', 'unbuilt_price_dkk', 'unbuilt_original_price_dkk', 'unbuilt_case_price_dkk', 'unbuilt_case_original_price_dkk', 'built_price_dkk', 'built_original_price_dkk', 'built_case_price_dkk', 'built_case_original_price_dkk', 'price_dkk', 'original_price_dkk', 'stock_qty'];
const PRODUCT_CHECK: Record<string, ColumnCheck> = {
  name: { len: [1, 200] }, item_no: { len: [0, 60], nullable: true }, category: { in: ['cars', 'parts', 'merchandise'], nullable: true }, subcategory: { len: [0, 60], nullable: true },
  chassis: { len: [0, 30], nullable: true }, type: { len: [0, 30], nullable: true }, status: { in: ['in stock', 'preorder only', 'sold out', 'coming soon'], nullable: true },
  description: { len: [0, 5000], nullable: true }, image_url: IMAGES, available: { in: [true, false], nullable: true }, is_collectors_vault: { in: [true, false], nullable: true },
  unbuilt_stock: STOCK, built_stock: STOCK, stock_qty: STOCK, price_dkk: PRICE, original_price_dkk: PRICE,
  unbuilt_price_dkk: PRICE, unbuilt_original_price_dkk: PRICE, unbuilt_case_price_dkk: PRICE, unbuilt_case_original_price_dkk: PRICE,
  built_price_dkk: PRICE, built_original_price_dkk: PRICE, built_case_price_dkk: PRICE, built_case_original_price_dkk: PRICE,
};
const TOURNAMENT_STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled', 'postponed'] as const;
const TOURNAMENT_COLS = ['name', 'date', 'location', 'race_categories', 'ticket_type', 'ticket_price_dkk', 'max_participants', 'status', 'description', 'image_url'];
const TOURNAMENT_CHECK: Record<string, ColumnCheck> = {
  name: { len: [1, 200] }, date: { re: ISO_TS, nullable: true }, location: { len: [0, 200], nullable: true }, race_categories: { strArr: { max: 12, item: [1, 60] } },
  ticket_type: { in: ['weekly', 'weekly_earlybird', 'season'] }, ticket_price_dkk: { num: [0, 100_000] }, max_participants: { int: [1, 1000] },
  status: { in: TOURNAMENT_STATUSES }, description: { len: [0, 10000], nullable: true }, image_url: IMAGES,
};

export const WRITE_RULES: readonly WriteRule[] = [
  { table: 'cars', op: 'update', columns: ['status', 'notes'], match: ['id'], check: { status: { in: ['pending', 'approved', 'rejected'] }, notes: TEXT_NOTE }, roles: ['admin', 'registration_staff', 'race_marshal'] },
  { table: 'cars', op: 'delete', columns: [], match: ['id'], roles: ['admin', 'registration_staff'] },

  { table: 'hall_of_fame', op: 'update', columns: ['member_id', 'member_name', 'record_value', 'record_label', 'achieved_at', 'previous_record_value', 'previous_holder_name', 'previous_achieved_at'], match: ['id'],
    check: { member_id: { len: [1, 64], nullable: true }, member_name: NAME_OR_EMPTY, record_value: { num: [0, 10_000_000] }, record_label: TEXT_SHORT, achieved_at: { re: ISO_TS, nullable: true }, previous_record_value: { num: [0, 10_000_000], nullable: true }, previous_holder_name: { len: [0, 120], nullable: true }, previous_achieved_at: { re: ISO_TS, nullable: true } },
    roles: ['admin', 'race_marshal'] },
  { table: 'hall_of_fame_history', op: 'insert', columns: ['category', 'member_name', 'record_value', 'record_label', 'held_from', 'held_until'], match: [],
    check: { category: { len: [1, 80] }, member_name: NAME, record_value: { num: [0, 10_000_000] }, record_label: TEXT_SHORT, held_from: { re: ISO_TS, nullable: true }, held_until: { re: ISO_TS } },
    roles: ['admin', 'race_marshal'] },

  { table: 'members', op: 'update', columns: ['loyalty_tier'], match: ['id'], check: { loyalty_tier: { in: TIERS } }, roles: ['admin', 'race_marshal'] },
  { table: 'members', op: 'update', columns: ['name', 'avatar_url'], match: ['id'], check: { name: NAME, avatar_url: { re: /^https:\/\/\S{1,500}$/ } }, roles: ['admin', 'registration_staff'] },
  { table: 'members', op: 'update', columns: ['season_loyalty_progress', 'weekly_loyalty_progress'], match: ['email'],
    check: { season_loyalty_progress: { int: [0, 9] }, weekly_loyalty_progress: { int: [0, 9] } }, roles: ['admin', 'registration_staff', 'checkin_staff'] },

  // Reward fields (points_awarded, membership_days_awarded, rewards_applied, spend_amount_dkk) are NOT writable here:
  // only lib/admin/loyaltyService.ts (atomic claim, server-derived amounts) may change them.
  { table: 'orders', op: 'update', columns: ['payment_status'], match: ['id'], check: { payment_status: { in: ORDER_STATUSES } }, roles: ['admin', 'shop_staff'] },
  { table: 'orders', op: 'delete', columns: [], match: ['id'], roles: ['admin', 'shop_staff'] },

  { table: 'profile_edit_requests', op: 'update', columns: ['status', 'reviewed_at'], match: ['id'], check: { status: { in: ['approved', 'rejected'] }, reviewed_at: { re: ISO_TS } }, roles: ['admin', 'registration_staff'] },

  { table: 'race_results', op: 'insert', columns: ['season_id', 'race_category', 'member_id', 'member_name', 'race_date', 'position', 'lap_time_seconds', 'qualifying_time_1', 'qualifying_time_2', 'round_2_result', 'wins', 'points_earned', 'notes'], match: [],
    check: { season_id: { len: [1, 64] }, race_category: { len: [1, 80] }, member_id: { len: [1, 64] }, member_name: NAME_OR_EMPTY, race_date: { re: DATE }, position: { int: [1, 200], nullable: true },
      lap_time_seconds: { num: [0, 3600], nullable: true }, qualifying_time_1: { num: [0, 3600], nullable: true }, qualifying_time_2: { num: [0, 3600], nullable: true },
      round_2_result: { len: [0, 80], nullable: true }, wins: { int: [0, 1000] }, points_earned: { int: [0, 100_000] }, notes: TEXT_NOTE },
    roles: ['admin', 'race_marshal'] },
  { table: 'race_results', op: 'delete', columns: [], match: ['id'], roles: ['admin', 'race_marshal'] },

  { table: 'seasons', op: 'insert', columns: ['name', 'start_date', 'end_date', 'is_active'], match: [], check: { name: NAME, start_date: { re: DATE }, end_date: { re: DATE }, is_active: { in: [false] } }, roles: ADMIN },
  { table: 'seasons', op: 'update', columns: ['is_active'], match: ['id'], neq: ['id'], check: { is_active: { in: [true, false] } }, roles: ADMIN },

  { table: 'race_tickets', op: 'update', columns: ['payment_status'], match: ['id'], check: { payment_status: { in: TICKET_STATUSES } }, roles: ['admin', 'registration_staff', 'checkin_staff'] },
  { table: 'race_tickets', op: 'delete', columns: [], match: ['id'], roles: ['admin', 'registration_staff', 'checkin_staff'] },

  { table: 'admin_config', op: 'upsert', columns: ['key', 'value'], match: [], onConflict: 'key', check: { key: { in: ['min_races_for_ranking', 'earlybird_slots'] }, value: { re: /^\d{1,4}$/ } }, roles: ADMIN },
  // ---- content, catalog and event pages (the remaining operator pages) ----
  { table: 'news_posts', op: 'insert', columns: NEWS_COLS.concat(['created_at']), match: [], check: { ...NEWS_CHECK, created_at: { re: ISO_TS } }, roles: ['admin'] },
  { table: 'news_posts', op: 'update', columns: NEWS_COLS, match: ['id'], check: NEWS_CHECK, roles: ['admin'] },
  { table: 'news_posts', op: 'delete', columns: [], match: ['id'], roles: ['admin'] },

  { table: 'gallery_items', op: 'insert', columns: GALLERY_COLS.concat(['created_at']), match: [], check: { ...GALLERY_CHECK, created_at: { re: ISO_TS } }, roles: ['admin'] },
  { table: 'gallery_items', op: 'update', columns: GALLERY_COLS, match: ['id'], check: GALLERY_CHECK, roles: ['admin'] },
  { table: 'gallery_items', op: 'delete', columns: [], match: ['id'], roles: ['admin'] },

  { table: 'products', op: 'insert', columns: PRODUCT_COLS.concat(['created_at']), match: [], check: { ...PRODUCT_CHECK, created_at: { re: ISO_TS } }, roles: ['admin', 'shop_staff'] },
  { table: 'products', op: 'update', columns: PRODUCT_COLS, match: ['id'], check: PRODUCT_CHECK, roles: ['admin', 'shop_staff'] },
  { table: 'products', op: 'delete', columns: [], match: ['id'], roles: ['admin', 'shop_staff'] },
  { table: 'shop_inventory', op: 'update', columns: ['case_stock'], match: ['id'], check: { case_stock: { int: [0, 100_000] } }, roles: ['admin', 'shop_staff'] },
  { table: 'preorders', op: 'update', columns: ['status'], match: ['id'], check: { status: { in: ['fulfilled'] } }, roles: ['admin', 'shop_staff'] },
  { table: 'preorders', op: 'delete', columns: [], match: ['id'], roles: ['admin', 'shop_staff'] },
  { table: 'members', op: 'update', columns: ['member_status'], match: ['id'], check: { member_status: { in: ['registered', 'official', 'suspended'] } }, roles: ['admin', 'shop_staff', 'registration_staff'] },

  // status-only rule first, so a race_marshal can change just the status; full edits are admin only
  { table: 'tournaments', op: 'update', columns: ['status'], match: ['id'], check: { status: { in: TOURNAMENT_STATUSES } }, roles: ['admin', 'race_marshal'] },
  { table: 'tournaments', op: 'update', columns: TOURNAMENT_COLS, match: ['id'], check: TOURNAMENT_CHECK, roles: ['admin'] },
  { table: 'tournaments', op: 'insert', columns: TOURNAMENT_COLS, match: [], check: TOURNAMENT_CHECK, returning: true, roles: ['admin'] },
  { table: 'tournaments', op: 'delete', columns: [], match: ['id'], roles: ['admin'] },
];

export type Scalar = string | number | boolean | null | string[];
const TOP_LEVEL_KEYS = ['table', 'op', 'values', 'match', 'neq', 'onConflict', 'returning'] as const;

export interface WriteRequest {
  table: string;
  op: WriteOp;
  values?: Record<string, Scalar>;
  match?: Record<string, string | number>;
  neq?: Record<string, string | number>;
  onConflict?: string;
  returning?: boolean;
}

export type WriteValidation =
  | { ok: true; rule: WriteRule; req: Required<Pick<WriteRequest, 'table' | 'op'>> & { values: Record<string, Scalar>; match: Record<string, string | number>; neq: Record<string, string | number>; onConflict?: string; returning: boolean } }
  | { ok: false; error: string };

/** Hard ceiling for any string; columns without an explicit `len`/`images` check are held to DEFAULT_MAX. */
export const MAX_STRING = 1_600_000;
const DEFAULT_MAX = 4000;
const isScalar = (v: unknown): v is Scalar =>
  v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= MAX_STRING) ||
  (Array.isArray(v) && v.length <= 50 && v.every(x => typeof x === 'string' && x.length <= 200));
const isKey = (v: unknown): v is string | number =>
  (typeof v === 'string' && v.length > 0 && v.length <= 200) || (typeof v === 'number' && Number.isFinite(v));
const isPlain = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

const IMG_PART = /^(https:\/\/[^\s,]{1,2000}|\/[^\s,]{1,500}|data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]{1,1500000})$/;
function passes(value: Scalar, c: ColumnCheck): boolean {
  if (value === null) return c.nullable === true;
  if (Array.isArray(value)) return !!c.strArr && value.length <= c.strArr.max && value.every(x => x.length >= c.strArr!.item[0] && x.length <= c.strArr!.item[1]);
  if (c.strArr) return false;
  if (c.images) return typeof value === 'string' && (value === '' || (value.startsWith('data:') ? [value] : value.split(',')).map(x => x.trim()).filter(Boolean).every(x => IMG_PART.test(x)));
  if (c.in) return (c.in as readonly Scalar[]).includes(value);
  if (c.int) return typeof value === 'number' && Number.isInteger(value) && value >= c.int[0] && value <= c.int[1];
  if (c.num) return typeof value === 'number' && value >= c.num[0] && value <= c.num[1];
  if (c.re || c.len) {
    if (typeof value !== 'string') return false;
    if (c.len && (value.length < c.len[0] || value.length > c.len[1])) return false;
    if (c.re && !c.re.test(value)) return false;
    return true;
  }
  return true;
}

/** Pure structural validation. Authorization (roles) is applied by the caller using `rule.roles`. */
export function validateWrite(raw: unknown): WriteValidation {
  if (!isPlain(raw)) return { ok: false, error: 'invalid request' };
  // Strict envelope: identity-like or unknown fields (user, role, actor, roles...) are refused, never ignored.
  if (Object.keys(raw).some(k => !(TOP_LEVEL_KEYS as readonly string[]).includes(k))) return { ok: false, error: 'invalid request' };
  const { table, op } = raw as Record<string, unknown>;
  if (typeof table !== 'string' || typeof op !== 'string') return { ok: false, error: 'invalid request' };
  const values = raw.values ?? {}; const match = raw.match ?? {}; const neq = raw.neq ?? {};
  if (!isPlain(values) || !isPlain(match) || !isPlain(neq)) return { ok: false, error: 'invalid request' };
  const candidates = WRITE_RULES.filter(r => r.table === table && r.op === op);
  if (!candidates.length) return { ok: false, error: 'write not permitted' };

  const vKeys = Object.keys(values), mKeys = Object.keys(match), nKeys = Object.keys(neq);
  if (!Object.values(values).every(isScalar) || !Object.values(match).every(isKey) || !Object.values(neq).every(isKey)) return { ok: false, error: 'invalid value' };

  const rule = candidates.find(r =>
    vKeys.every(k => r.columns.includes(k)) &&
    mKeys.every(k => r.match.includes(k)) &&
    nKeys.every(k => r.neq?.includes(k)));
  if (!rule) return { ok: false, error: 'write not permitted' };

  if ((op === 'insert' || op === 'upsert' || op === 'update') && vKeys.length === 0) return { ok: false, error: 'no values' };
  if (op === 'delete' && vKeys.length) return { ok: false, error: 'invalid request' };
  if ((op === 'update' || op === 'delete') && mKeys.length + nKeys.length === 0) return { ok: false, error: 'a filter is required' };
  if (op === 'delete' && mKeys.length === 0) return { ok: false, error: 'a filter is required' };
  if ((op === 'insert' || op === 'upsert') && (mKeys.length || nKeys.length)) return { ok: false, error: 'invalid request' };
  if (op === 'upsert' && raw.onConflict !== rule.onConflict) return { ok: false, error: 'invalid request' };
  if (op !== 'upsert' && raw.onConflict !== undefined) return { ok: false, error: 'invalid request' };
  for (const k of vKeys) {
    const v = (values as Record<string, Scalar>)[k], c = rule.check?.[k];
    if (c ? !passes(v, c) : (Array.isArray(v) || (typeof v === 'string' && v.length > DEFAULT_MAX))) return { ok: false, error: 'invalid value' };
    if (c && !c.images && !c.len && typeof v === 'string' && v.length > DEFAULT_MAX) return { ok: false, error: 'invalid value' };
  }
  const returning = raw.returning === true;
  if (raw.returning !== undefined && typeof raw.returning !== 'boolean') return { ok: false, error: 'invalid request' };
  if (returning && !(op === 'insert' && rule.returning)) return { ok: false, error: 'invalid request' };
  // An insert/upsert must supply every checked, non-nullable column (no half-written rows).
  if (op === 'insert' || op === 'upsert') {
    for (const [k, c] of Object.entries(rule.check ?? {})) if (!c.nullable && !vKeys.includes(k) && rule.columns.includes(k) && k !== 'is_active') return { ok: false, error: 'invalid value' };
  }
  return { ok: true, rule, req: { table, op: op as WriteOp, values: values as Record<string, Scalar>, match: match as Record<string, string | number>, neq: neq as Record<string, string | number>, onConflict: rule.onConflict, returning } };
}

/** Columns the admin forms may send, shared by the pages (to build the payload) and the rules above (to accept it). */
export const EDITABLE = { news_posts: NEWS_COLS, gallery_items: GALLERY_COLS, products: PRODUCT_COLS, tournaments: TOURNAMENT_COLS } as const;
