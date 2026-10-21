import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Minimal in-memory stand-in for the supabase-js query builder, for TESTS ONLY (synthetic rows).
 * Each statement executes atomically in a single tick, like one SQL statement, so claim/compare-and-set logic can be
 * exercised for real. Supports: select/insert/update/delete, eq/neq/is/gt/or, order, limit, maybeSingle/single, count/head.
 */
type Row = Record<string, any>;
type Filter = (r: Row) => boolean;

export class FakeDb {
  tables: Record<string, Row[]> = {};
  private seq = 0;
  /** return an error message to make a statement fail: (table, op) => string | null */
  failOn: (table: string, op: string) => string | null = () => null;
  /** columns that must be unique per table, e.g. { loyalty_points: ['member_id'] } */
  unique: Record<string, string[]> = {};
  log: string[] = [];
  seed(table: string, rows: Row[]) { this.tables[table] = rows.map(r => ({ ...r })); return this; }
  rows(table: string) { return this.tables[table] ?? []; }
  /** optional stand-ins for database functions: name -> handler returning { data, error } */
  rpcs: Record<string, (args: Row) => Promise<{ data: any; error: any }> | { data: any; error: any }> = {};
  client(): SupabaseClient {
    return { from: (t: string) => new Q(this, t), rpc: async (name: string, args: Row) => (this.rpcs[name] ? this.rpcs[name](args ?? {}) : { data: null, error: { message: 'unknown function' } }) } as unknown as SupabaseClient;
  }
  nextId() { return `id${++this.seq}`; }
}

function parseOr(expr: string): Filter {
  const parts = expr.split(',').map(p => {
    const [col, op, ...rest] = p.split('.'); const val = rest.join('.');
    return (r: Row) => op === 'is' ? (val === 'null' ? r[col] == null : r[col] === val) : op === 'eq' ? String(r[col]) === val : false;
  });
  return r => parts.some(f => f(r));
}

class Q {
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row = {};
  private filters: Filter[] = [];
  private returning = false;
  private shape: 'maybe' | 'one' | null = null;
  private head = false; private wantCount = false;
  private orderBy: { col: string; asc: boolean } | null = null; private max: number | null = null;
  constructor(private db: FakeDb, private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) { if (this.mode === 'select') { this.head = !!opts?.head; this.wantCount = !!opts?.count; } else this.returning = true; return this; }
  insert(row: Row) { this.mode = 'insert'; this.payload = row; return this; }
  update(patch: Row) { this.mode = 'update'; this.payload = patch; return this; }
  delete() { this.mode = 'delete'; return this; }
  eq(c: string, v: unknown) { this.filters.push(r => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push(r => r[c] !== v); return this; }
  gt(c: string, v: number) { this.filters.push(r => Number(r[c]) > v); return this; }
  is(c: string, v: null) { this.filters.push(r => (v === null ? r[c] == null : r[c] === v)); return this; }
  or(expr: string) { this.filters.push(parseOr(expr)); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orderBy = { col, asc: o?.ascending !== false }; return this; }
  limit(n: number) { this.max = n; return this; }
  maybeSingle() { this.shape = 'maybe'; return this; }
  /** supabase-js `.single()`: modelled like maybeSingle for these tests */
  single() { this.shape = 'maybe'; return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then(resolve: (v: any) => unknown, reject?: (e: unknown) => unknown) { return Promise.resolve().then(() => this.run()).then(resolve, reject); }

  private run() {
    const { db, table } = this;
    db.log.push(`${table}.${this.mode}`);
    const fail = db.failOn(table, this.mode);
    if (fail) return { data: null, error: { message: fail } };
    const all = (db.tables[table] ??= []);
    const match = () => all.filter(r => this.filters.every(f => f(r)));
    let out: Row[] = [];
    if (this.mode === 'select') {
      out = match();
      if (this.orderBy) { const { col, asc } = this.orderBy; out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1)); }
      if (this.max != null) out = out.slice(0, this.max);
      if (this.head) return { data: null, count: out.length, error: null };
    } else if (this.mode === 'insert') {
      for (const u of db.unique[table] ?? []) if (all.some(r => r[u] === this.payload[u] && this.payload[u] != null)) return { data: null, error: { message: `duplicate key value violates unique constraint on ${u}`, code: '23505' } };
      const row = { id: db.nextId(), ...this.payload }; all.push(row); out = [row];
    } else if (this.mode === 'update') {
      out = match(); out.forEach(r => Object.assign(r, this.payload));
    } else {
      out = match(); db.tables[table] = all.filter(r => !out.includes(r));
    }
    if (this.mode !== 'select' && !this.returning) return { data: null, error: null };
    const copy = out.map(r => ({ ...r }));
    if (this.shape === 'maybe') return { data: copy[0] ?? null, error: null };
    return { data: copy, error: null };
  }
}
