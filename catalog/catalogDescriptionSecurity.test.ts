import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import reconciledSeedRaw from './bmax-catalog-reconciled-seed.json';

type Audit = {
  status: string;
  sourceUrl: string | null;
  sourceType: string;
  unresolvedFields: string[];
};

type Row = {
  item_no: string;
  description: string;
  chassis: string;
  image_url: string;
  descriptionAudit?: Audit;
};

const seed = reconciledSeedRaw as unknown as {
  existing: Row[];
  new: Row[];
  blocked: Row[];
};

const all = [...seed.existing, ...seed.new];
const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf-8');

const bannedDescriptionWording = /imported exclusively|never restocking|sold out from supplier|pre-assembled|only 1 unit|sell with a warning|supplier cost|margin-verified|margin verified|recommended beginner|shop demonstration|large stock item/i;

describe('catalog description audit', () => {
  it('audits all 120 executable catalog rows', () => {
    expect(all).toHaveLength(120);
    for (const row of all) {
      expect(row.descriptionAudit).toBeDefined();
      expect(row.descriptionAudit?.status).toMatch(/verified/);
      expect(row.descriptionAudit?.unresolvedFields).toEqual([]);
      expect(row.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('removes internal, inventory, supplier, and sales-advice wording', () => {
    for (const row of all) {
      expect(row.description).not.toMatch(bannedDescriptionWording);
    }
  });

  it('keeps descriptions deliberately conservative by product class', () => {
    for (const row of all) {
      expect(row.description).toMatch(/Mini 4WD|display case/i);
    }
  });

  it('corrects item 19431 to Super-II in both chassis and description', () => {
    const row = all.find(product => product.item_no === '19431');
    expect(row?.chassis).toBe('Super-II');
    expect(row?.description).toMatch(/Super-II chassis/i);
    expect(row?.description).not.toMatch(/AR chassis/i);
  });

  it('uses one local poster URL or the empty fallback state only', () => {
    for (const row of all) {
      expect(row.image_url).not.toMatch(/cloudinary/i);
      expect(row.image_url).not.toContain(',');
      if (row.image_url) expect(row.image_url).toMatch(/^\/catalog\/products\/.+\.webp$/);
    }
  });
});

describe('product inquiry database hardening', () => {
  const sql = read('supabase', 'migrations-proposed', 'bmax_catalog_finalize_forward.sql');

  it('enables and forces RLS on product_inquiries', () => {
    expect(sql).toMatch(/alter table public\.product_inquiries enable row level security/i);
    expect(sql).toMatch(/alter table public\.product_inquiries force row level security/i);
  });

  it('revokes direct read/update/delete access and grants only insert capability', () => {
    expect(sql).toMatch(/revoke all on table public\.product_inquiries from anon, authenticated/i);
    expect(sql).toMatch(/grant insert on table public\.product_inquiries to anon, authenticated/i);
    expect(sql).not.toMatch(/grant select .*product_inquiries.*anon/i);
  });

  it('derives item number, product name, status, id, and created_at inside the trigger', () => {
    expect(sql).toMatch(/new\.item_no := product_row\.item_no/i);
    expect(sql).toMatch(/new\.product_name := product_row\.name/i);
    expect(sql).toMatch(/new\.status := 'new'/i);
    expect(sql).toMatch(/new\.id := gen_random_uuid\(\)/i);
    expect(sql).toMatch(/new\.created_at := now\(\)/i);
  });

  it('accepts inquiries only for price-on-request products', () => {
    expect(sql.match(/price_on_request is true/gi)?.length).toBeGreaterThanOrEqual(2);
  });

  it('validates customer field lengths and throttles immediate duplicate inquiries', () => {
    expect(sql).toMatch(/between 2 and 120 characters/i);
    expect(sql).toMatch(/between 3 and 240 characters/i);
    expect(sql).toMatch(/1000 characters or fewer/i);
    expect(sql).toMatch(/interval '5 minutes'/i);
  });
});
