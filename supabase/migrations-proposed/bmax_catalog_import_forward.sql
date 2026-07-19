-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- B-MAX CATALOG IMPORT — insert-only expansion of public.products, plus the
-- price-on-request feature this rollout adds.
--
-- OWNER DECISION THIS REVISION ENFORCES: a missing/unapproved price is NO
-- LONGER a reason to exclude a catalog product. All 106 catalog rows that
-- passed genuine data-integrity validation are inserted here — 2 with a
-- real, board-approved price, 104 marked price_on_request = true with
-- price_dkk left NULL (never a fake/guessed 0 or invented figure). 0 rows
-- were blocked this pass; every candidate cleared the non-price checks
-- (unique/non-blank item_no, valid category, present name, non-negative
-- stock, present description, and the source catalog's own identity flags
-- — has_uncertain_edition / has_unresolved_duplicate / is_internal_test_record
-- / is_archived_by_admin — all false for every candidate).
--
-- OWNER DECISIONS THIS MIGRATION ENFORCES (binding, do not regress):
--   1. public.products is authoritative for every EXISTING product — this
--      file contains no UPDATE that changes an existing row's price, stock,
--      availability, or status. The only UPDATEs below are the 14 narrow,
--      deterministic image_url normalizations (+ one chassis/description
--      correction for 19431) in Step 2, each individually guarded by a
--      WHERE clause that only matches the exact prior value, so a rerun or
--      a row someone already hand-edited is never silently clobbered.
--   2. Only rows whose item_no does NOT already exist in public.products
--      are ever inserted — enforced both by the preflight check (Step 1)
--      and by the anti-join on the bulk insert itself (Step 4).
--   3. No price is ever invented or estimated. price_dkk is either the
--      source catalog's real board-approved figure, or NULL — never 0.
--
-- PREREQUISITES:
--   - Read docs/PRE-MIGRATION-BACKUP-AND-VALIDATION.md and take a fresh
--     row-count + item_no snapshot of public.products before running
--     anything.
--   - Run this on an isolated Supabase branch first, never live for the
--     first pass.
--   - Confirm the admin dry-run (components/admin/CatalogImportPanel.tsx,
--     PREVIEW DRY RUN button, on /admin/products) shows exactly 106 NEW
--     rows and 0 CONFLICTED against the real live table before applying.
--
-- ROLLBACK: bmax_catalog_import_rollback.sql (same directory). Removes only
-- the rows this file inserts (deterministic item_no list) and restores the
-- 14 existing rows' prior image_url/chassis/description values exactly.
--
-- VERIFICATION QUERIES: see the commented block at the end of this file.

begin;

-- ── Step 1: preflight — duplicate/blank item_no and pre-existing-row checks ──
do $$
declare
  duplicate_count integer;
  blank_count integer;
  preexisting_count integer;
begin
  select count(*) into duplicate_count
  from (
    select item_no from public.products
    where item_no is not null and item_no <> ''
    group by item_no having count(*) > 1
  ) dupes;
  if duplicate_count > 0 then
    raise exception 'ABORT: % duplicate non-blank item_no value(s) already exist in public.products — resolve before importing.', duplicate_count;
  end if;

  select count(*) into blank_count
  from public.products
  where item_no is null or item_no = '';
  if blank_count > 0 then
    raise warning 'NOTE: % existing public.products row(s) have a null/blank item_no — the partial unique index below deliberately excludes these.', blank_count;
  end if;

  select count(*) into preexisting_count
  from public.products
  where item_no in ('15347', '15375', '15381', '15383', '15391', '15392', '15394', '15398', '15401', '15402', '15405', '15408', '15416', '15417', '15429', '15430', '15434', '15449', '15450', '15451', '15452', '15453', '15455', '15456', '15457', '15458', '15459', '15462', '15463', '15464', '15465', '15472', '15473', '15474', '15476', '15477', '15484', '15485', '15486', '15487', '15488', '15489', '15490', '15492', '15498', '15499', '15501', '15505', '15506', '15508', '15510', '15512', '15514', '15516', '15518', '15519', '15523', '15524', '15525', '15526', '15527', '15528', '15534', '15541', '15542', '15544', '18069', '18086', '18094', '18095', '18097', '18100', '18101', '18103', '18104', '18105', '18625', '18627', '18632', '18635', '18640', '18646', '18647', '18650', '18657', '18658', '18659', '18660', '18661', '18662', '18701', '18703', '18706', '18707', '18714', '18718', '19438', '92453', '95126', '95190', '95297', '95569', '95570', '95598', '95703', 'display-case');
  if preexisting_count > 0 then
    raise exception 'ABORT: % of the 106 catalog item_nos already exist live — this migration is not idempotent-safe to apply a second time in this form. Investigate before rerunning.', preexisting_count;
  end if;
end $$;

-- ── Step 2: price_on_request column — additive, never a fake 0 price ────
-- Nullable price_dkk was already the live schema's shape (confirmed by the
-- earlier pass of this rollout), so no column-nullability change is needed
-- here. This boolean is the single explicit signal the application reads —
-- see lib/pricing.ts isPriceOnRequest() — never inferred from price_dkk
-- being NULL or 0 on its own.
alter table public.products add column if not exists price_on_request boolean not null default false;

-- ── Step 3: product_inquiries — the "ASK FOR PRICE" lead-capture table ──
-- Deliberately minimal: no stock/payment/order relationship whatsoever, so
-- it can never be mistaken for or wired into the checkout path. product_id
-- is ON DELETE SET NULL (an inquiry is never a reason to block deleting a
-- product later; the item_no/product_name snapshot below preserves context
-- even if that happens).
create table if not exists public.product_inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  item_no text,
  product_name text not null,
  customer_name text not null,
  customer_contact text not null,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- ── Step 4: additive uniqueness safeguard on item_no ─────────────────────
create unique index if not exists products_item_no_unique_idx
  on public.products (item_no)
  where item_no is not null and item_no <> '';

-- ── Step 5: deterministic corrections to the 14 existing rows ───────────
-- Exactly 14 UPDATEs, one per existing row, each guarded by a WHERE clause
-- matching the row's exact prior value(s) — so this step is idempotent (a
-- rerun after the first successful apply matches nothing and is a no-op)
-- and never overwrites a row that was independently hand-edited since. Never
-- touches price_dkk, stock, status, or availability on any of these 14 rows.
update public.products set image_url = '/catalog/products/18099-ray-spear.webp' where item_no = '18099' and image_url = '/catalog/products/18099-ray-spear.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817850/ChatGPT_Image_Jun_18_2026_08_23_37_PM_jbezcc.png';
update public.products set image_url = '/catalog/products/18704-shadow-shark.webp' where item_no = '18704' and image_url = '/catalog/products/18704-shadow-shark.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781711223/ChatGPT_Image_Jun_17_2026_02_46_05_PM_y7oto3.png';
update public.products set image_url = '/catalog/products/18705-flame-astute.webp' where item_no = '18705' and image_url = '/catalog/products/18705-flame-astute.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817856/ChatGPT_Image_Jun_18_2026_08_23_31_PM_fhruh8.png';
update public.products set image_url = '/catalog/products/18710-mini-4wd-starter-pack-fm-a-balanced-spec-rowdy-bull.webp' where item_no = '18710' and image_url = '/catalog/products/18710-mini-4wd-starter-pack-fm-a-balanced-spec-rowdy-bull.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1782250355/ChatGPT_Image_Jun_23_2026_08_32_18_PM_bcll7s.png';
update public.products set image_url = '/catalog/products/19431-magnum-saber-premium.webp', chassis = 'Super-II', description = 'Iconic Magnum livery on Super-II Chassis. White and blue fully cowled body with green wheels and gold eagle emblem. Pre-assembled. Only 1 unit — sold out from supplier, never restocking.' where item_no = '19431' and image_url = '/catalog/products/19431-magnum-saber-premium.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781711226/ChatGPT_Image_Jun_17_2026_02_45_59_PM_lhcjb1.png' and chassis = 'AR';
update public.products set image_url = '' where item_no = '19440' and image_url = 'https://res.cloudinary.com/dcedaioew/image/upload/v1782210255/ChatGPT_Image_Jun_23_2026_09_23_48_AM_kafe8o.png';
update public.products set image_url = '' where item_no = '19442' and image_url = 'https://res.cloudinary.com/dcedaioew/image/upload/v1782209340/ChatGPT_Image_Jun_23_2026_09_08_20_AM_brylfs.png';
update public.products set image_url = '/catalog/products/19443-diospada-premium.webp' where item_no = '19443' and image_url = '/catalog/products/19443-diospada-premium.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817856/ChatGPT_Image_Jun_18_2026_08_23_34_PM_sialor.png';
update public.products set image_url = '/catalog/products/19447-beak-stinger-g.webp' where item_no = '19447' and image_url = '/catalog/products/19447-beak-stinger-g.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817851/ChatGPT_Image_Jun_18_2026_08_23_46_PM_nu2y8z.png';
update public.products set image_url = '/catalog/products/19451-gun-bluster-xto-premium.webp' where item_no = '19451' and image_url = '/catalog/products/19451-gun-bluster-xto-premium.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781817853/ChatGPT_Image_Jun_18_2026_08_23_35_PM_lzhia4.png';
update public.products set image_url = '' where item_no = '92461' and image_url = 'https://res.cloudinary.com/dcedaioew/image/upload/v1781908295/ChatGPT_Image_Jun_19_2026_09_31_25_PM_awnnca.png';
update public.products set image_url = '/catalog/products/92462-mach-frame-philippine-cup-special.webp' where item_no = '92462' and image_url = '/catalog/products/92462-mach-frame-philippine-cup-special.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781711221/ChatGPT_Image_Jun_17_2026_02_46_09_PM_ip5mpp.png';
update public.products set image_url = '/catalog/products/95571-exflowly-polycarbonate-body-special-purple.webp' where item_no = '95571' and image_url = '/catalog/products/95571-exflowly-polycarbonate-body-special-purple.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781908146/ChatGPT_Image_Jun_19_2026_09_27_36_PM_qwhbs2.png';
update public.products set image_url = '/catalog/products/95706-geo-glider-asia-challenge-2026-special.webp' where item_no = '95706' and image_url = '/catalog/products/95706-geo-glider-asia-challenge-2026-special.webp,https://res.cloudinary.com/dcedaioew/image/upload/v1781711221/ChatGPT_Image_Jun_17_2026_02_46_07_PM_ieyjk1.png';

-- ── Step 6: insert the 106 validated catalog rows ────────────────────────
-- Single bulk insert, anti-joined against the live table so a partial rerun
-- (e.g. after Step 1's stricter check is relaxed for a legitimate re-apply
-- scenario) only inserts whatever is still missing, never a duplicate.
insert into public.products (
  item_no, name, description, chassis, type, category, subcategory,
  price_dkk, original_price_dkk, price_on_request, stock_qty, unbuilt_stock, built_stock,
  status, available, is_collectors_vault, image_url, item_number
)
select v.item_no, v.name, v.description, v.chassis, v.type, v.category, v.subcategory,
  v.price_dkk, v.original_price_dkk, v.price_on_request, v.stock_qty, v.unbuilt_stock, v.built_stock,
  v.status, v.available, v.is_collectors_vault, v.image_url, v.item_number
from (values
  ('18094', 'Neo-VQS', 'Popular VZ platform with a low body and wide parts compatibility. A practical beginner car with a clear upgrade path.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18094-neo-vqs.webp', null),
  ('18103', 'Cross Spear 01', 'Modern VZ kit for racers who want a newer body while keeping the same beginner-friendly upgrade ecosystem.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18103-cross-spear-01.webp', null),
  ('18714', 'Mach Frame', 'Front-motor FM-A car with predictable braking and strong stability. One of the easiest chassis to explain to new racers.', 'FM-A', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18714-mach-frame.webp', null),
  ('18718', 'K4 Gambol', 'Fun FM-A kit with a distinctive body. Suitable for beginners who prefer style without losing B-MAX upgrade compatibility.', 'FM-A', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18718-k4-gambol.webp', null),
  ('18701', 'Aero Avante', 'Reliable AR chassis with wide parts compatibility and simple maintenance. A strong shop demonstration and workshop car.', 'AR', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18701-aero-avante.webp', null),
  ('18646', 'DCR-01', 'Balanced MA dual-shaft car with simple assembly and excellent stability. One of the best introductions to PRO motors.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18646-dcr-01.webp', null),
  ('18657', 'Ignicion', 'Modern MA kit that combines easy assembly, balanced handling and a straightforward B-MAX upgrade route.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18657-ignicion.webp', null),
  ('18640', 'Raikiri', 'Popular MA kit with a low sports-car body. Good for customers who value appearance and stable handling.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18640-raikiri.webp', null),
  ('18627', 'Avante Mk.III Nero', 'Classic MS dual-shaft platform for racers who want to learn center-chassis tuning and PRO motor setups.', 'MS', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18627-avante-mk-iii-nero.webp', null),
  ('19438', 'Ray Stinger Premium', 'Super-II option for classic Fully Cowled fans. Useful as a special-order chassis rather than a large stock item.', 'Super-II', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/19438-ray-stinger-premium.webp', null),
  ('95126', 'Cyclone Magnum Memorial 25th Anniversary', 'Anniversary collector kit on the Super TZ-X chassis. Keep it separate from the recommended beginner chassis selection.', 'Super TZ-X', 'boxed', 'cars', 'Limited Edition Mini 4WD Kit', 389::numeric, null::numeric, false, 0, 0, 0, 'coming soon', false, false, '/catalog/products/95126-cyclone-magnum-memorial-25th-anniversary.webp', null),
  ('15526', 'Basic Tune-Up Parts Set for VZ Chassis', 'The simplest first upgrade for a VZ car. Adds the essential plates, rollers and control parts in one compatible package.', 'VZ', 'boxed', 'parts', 'Starter Upgrade Sets', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15526-basic-tune-up-parts-set-for-vz-chassis.webp', null),
  ('15514', 'Basic Tune-Up Parts Set for FM-A Chassis', 'A complete first-step FM-A package. Recommended before customers buy individual aluminum rollers or faster motors.', 'FM-A', 'boxed', 'parts', 'Starter Upgrade Sets', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15514-basic-tune-up-parts-set-for-fm-a-chassis.webp', null),
  ('15476', 'Basic Tune-Up Parts Set for MA Chassis', 'Beginner bundle for MA cars that adds stability parts without requiring customers to understand every component separately.', 'MA', 'boxed', 'parts', 'Starter Upgrade Sets', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15476-basic-tune-up-parts-set-for-ma-chassis.webp', null),
  ('15450', 'Basic Tune-Up Parts Set for AR Chassis', 'Straightforward AR upgrade set for learning front and rear plates, rollers and basic landing control.', 'AR', 'boxed', 'parts', 'Starter Upgrade Sets', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15450-basic-tune-up-parts-set-for-ar-chassis.webp', null),
  ('15484', 'Torque-Tuned 2 Motor', 'More acceleration and climbing power than the kit motor. Best first motor for short or technical layouts.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15484-torque-tuned-2-motor.webp', null),
  ('15485', 'Rev-Tuned 2 Motor', 'Higher-rev motor for layouts with longer straights. Recommend only after the car is stable.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15485-rev-tuned-2-motor.webp', null),
  ('15486', 'Atomic-Tuned 2 Motor', 'Balanced first motor upgrade for customers who do not yet know whether they need torque or maximum revs.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15486-atomic-tuned-2-motor.webp', null),
  ('15455', 'Light-Dash Motor', 'Intermediate motor between tuned motors and Hyper-Dash. Suitable after basic brakes and rollers are installed.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15455-light-dash-motor.webp', null),
  ('15477', 'Hyper-Dash 3 Motor', 'Strong all-round race motor. Sell with a warning that the car should already have brakes, rollers and landing control.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15477-hyper-dash-3-motor.webp', null),
  ('15487', 'Torque-Tuned 2 Motor PRO', 'Dual-shaft torque motor for MA, MS and ME cars. A safe first PRO motor upgrade.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15487-torque-tuned-2-motor-pro.webp', null),
  ('15488', 'Rev-Tuned 2 Motor PRO', 'Dual-shaft high-rev motor for MA, MS and ME cars. Best after basic stability parts are fitted.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15488-rev-tuned-2-motor-pro.webp', null),
  ('15489', 'Atomic-Tuned 2 Motor PRO', 'Balanced dual-shaft motor for new MA, MS and ME racers.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15489-atomic-tuned-2-motor-pro.webp', null),
  ('15402', 'Light-Dash Motor PRO', 'Intermediate dual-shaft motor for racers moving beyond tuned motors.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15402-light-dash-motor-pro.webp', null),
  ('15375', 'Hyper-Dash Motor PRO', 'Competitive all-round dual-shaft motor. Recommend brakes and stable roller settings before use.', 'Universal', 'boxed', 'parts', 'Motors', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15375-hyper-dash-motor-pro.webp', null),
  ('15512', 'Brake Sponge Set Mild 1/2/3mm Blue', 'Mild brake material in three thicknesses. Easy for beginners to tune without slowing the car too aggressively.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15512-brake-sponge-set-mild-1-2-3mm-blue.webp', null),
  ('15492', 'Brake Sponge Set 1/2/3mm White', 'General-purpose brake material in three thicknesses for adjusting slope entry and jump speed.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15492-brake-sponge-set-1-2-3mm-white.webp', null),
  ('15458', 'Brake Set for AR Chassis', 'Simple bolt-on brake system for compatible chassis. Useful when customers want a complete brake assembly.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15458-brake-set-for-ar-chassis.webp', null),
  ('15518', 'FRP Rear Brake Stay Set', 'Strong rear brake base that lets racers position sponge more accurately.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15518-frp-rear-brake-stay-set.webp', null),
  ('15405', 'Front Under Guard', 'Helps the front of the car pass track joints and slopes more smoothly while protecting the chassis underside.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15405-front-under-guard.webp', null),
  ('15392', 'Mass Damper Set', 'Basic weights that reduce bouncing after jumps. One of the most useful stability upgrades for new racers.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15392-mass-damper-set.webp', null),
  ('15401', 'Mass Damper Set Heavy', 'Heavier landing-control option for cars that still bounce or leave the track after jumps.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15401-mass-damper-set-heavy.webp', null),
  ('15501', 'Slimline Mass Damper Set', 'Compact dampers that fit many B-MAX layouts without taking excessive space.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15501-slimline-mass-damper-set.webp', null),
  ('15459', 'Side Mass Damper Set for AR Chassis', 'Complete side-damper package for compatible chassis. Easier than buying plates and weights separately.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15459-side-mass-damper-set-for-ar-chassis.webp', null),
  ('15490', 'Side Mass Damper Set for MA Chassis', 'MA-focused side-damper set that gives new racers a clear bolt-on landing-control solution.', 'Universal', 'boxed', 'parts', 'Brakes/Dampers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15381', 'Low-Friction Roller Set', 'Low-cost roller upgrade for smoother wall contact. Ideal before customers invest in aluminum rollers.', 'Universal', 'boxed', 'parts', 'Rollers/Stabilizers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15381-low-friction-roller-set.webp', null),
  ('15457', 'Low-Friction Plastic Double Rollers 13-12mm', 'Budget double rollers that improve wall contact and stability.', 'Universal', 'boxed', 'parts', 'Rollers/Stabilizers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15525', 'Low-Friction Plastic Double Rollers with Rubber Rings 13-12mm', 'Double rollers with rubber rings for additional control where the setup needs more wall grip.', 'Universal', 'boxed', 'parts', 'Rollers/Stabilizers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15398', 'Double Aluminum Rollers 13-12mm', 'Popular durable front roller option for competitive B-MAX setups.', 'Universal', 'boxed', 'parts', 'Rollers/Stabilizers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15398-double-aluminum-rollers-13-12mm.webp', null),
  ('15449', '17mm Aluminum Rollers with Plastic Rings', '17mm aluminum rollers with plastic rings for smooth and durable wall contact.', 'Universal', 'boxed', 'parts', 'Rollers/Stabilizers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15449-17mm-aluminum-rollers-with-plastic-rings.webp', null),
  ('15464', 'HG 19mm Aluminum Ball-Race Rollers Ringless', 'Common 19mm rear roller choice for stable, low-friction B-MAX setups.', 'Universal', 'boxed', 'parts', 'Rollers/Stabilizers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15408', 'Long Stabilizing Pole and 13mm Roller Set', 'Simple stabilizer package that helps keep the car upright when it leans against the course wall.', 'Universal', 'boxed', 'parts', 'Rollers/Stabilizers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15408-long-stabilizing-pole-and-13mm-roller-set.webp', null),
  ('15391', 'Large-Diameter Stabilizer Head Set 11/15mm', 'Stabilizer heads for reducing rollovers and wall climbing.', 'Universal', 'boxed', 'parts', 'Rollers/Stabilizers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15391-large-diameter-stabilizer-head-set-11-15mm.webp', null),
  ('15528', 'Hi-Mount Tube Stabilizer Set Black', 'Compact high-mounted stabilizer option for more advanced B-MAX layouts.', 'Universal', 'boxed', 'parts', 'Rollers/Stabilizers', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15394', 'FRP Multi Roller Setting Stay', 'Affordable universal FRP plate for adding and positioning rollers.', 'Universal', 'boxed', 'parts', 'Plates', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15394-frp-multi-roller-setting-stay.webp', null),
  ('15430', 'FRP Rear Multi Roller Setting Stay', 'Affordable rear FRP plate for rollers, dampers and brake assemblies.', 'Universal', 'boxed', 'parts', 'Plates', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15430-frp-rear-multi-roller-setting-stay.webp', null),
  ('15451', 'FRP Wide Front Plate for AR Chassis', 'Wide front FRP plate that makes roller placement easier on compatible chassis.', 'Universal', 'boxed', 'parts', 'Plates', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15452', 'FRP Wide Rear Plate for AR Chassis', 'Wide rear FRP plate for stable roller spacing and basic B-MAX layouts.', 'Universal', 'boxed', 'parts', 'Plates', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15472', 'FRP Wide Front Plate for Fully Cowled Mini 4WD', 'Front plate designed for many Fully Cowled bodies where standard plates may interfere.', 'Universal', 'boxed', 'parts', 'Plates', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15524', 'FRP Wide Front Plate for VZ Chassis', 'Modern wide front FRP plate with broad compatibility and clear roller mounting positions.', 'Universal', 'boxed', 'parts', 'Plates', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15498', 'HG Carbon Wide Front Plate 1.5mm', 'Lighter and stiffer front plate for racers upgrading from FRP.', 'Universal', 'boxed', 'parts', 'Plates', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15499', 'HG Carbon Wide Rear Plate 1.5mm', 'Lighter and stiffer rear plate for competitive setups.', 'Universal', 'boxed', 'parts', 'Plates', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15542', 'Super Hard 26mm Tires and Carbon Wheels', 'Stable all-round wheel and tire set that reduces bounce and is easy to recommend to beginners.', 'Universal', 'boxed', 'parts', 'Wheels/Tires', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15534', 'Low-Friction 26mm Tires and Carbon Wheels', 'Lower-grip tire set for carrying more speed through corners once the car is already stable.', 'Universal', 'boxed', 'parts', 'Wheels/Tires', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15541', 'Low-Friction Narrow 24mm Tires and Carbon Wheels', 'Small-diameter narrow setup for lowering the car and tuning speed on technical tracks.', 'Universal', 'boxed', 'parts', 'Wheels/Tires', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15544', 'Low-Friction 31mm Tires and Carbon Wheels', 'Large-diameter option for advanced speed-focused builds. Keep as limited stock or special order.', 'Universal', 'boxed', 'parts', 'Wheels/Tires', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15453', 'Carbon-Reinforced 8T Pinion Gears 6pcs', 'Durable replacement pinions for routine maintenance and motor changes.', 'Universal', 'boxed', 'parts', 'Shafts/Gears', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15462', 'Carbon-Reinforced G13 and 8T Pinion Gear Set', 'Reinforced gear and pinion set for reducing wear in upgraded drivetrains.', 'Universal', 'boxed', 'parts', 'Shafts/Gears', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15456', 'Setting Gear Set for AR Chassis', 'Useful AR replacement and tuning gear set.', 'AR', 'boxed', 'parts', 'Shafts/Gears', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15516', 'Setting Gear Set for FM-A Chassis', 'Useful FM-A replacement and tuning gear set.', 'FM-A', 'boxed', 'parts', 'Shafts/Gears', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15429', 'PRO High-Speed EX Gear Set', 'High-speed gear option for MA, MS and ME cars. Explain gear ratio before sale.', 'Universal', 'boxed', 'parts', 'Shafts/Gears', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15429-pro-high-speed-ex-gear-set.webp', null),
  ('15434', 'High-Speed EX Counter Gear Set 3.7:1', '3.7:1 counter gear option for compatible single-shaft cars.', 'Universal', 'boxed', 'parts', 'Shafts/Gears', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15434-high-speed-ex-counter-gear-set-3-7-1.webp', null),
  ('15347', 'Mini 4WD PRO Gear Bearing Set', 'Ball bearings and gear shafts that reduce counter-gear friction in MA and MS cars.', 'Universal', 'boxed', 'parts', 'Bearings', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15347-mini-4wd-pro-gear-bearing-set.webp', null),
  ('15523', 'Low-Friction Plastic Bearing Set', 'Affordable low-friction replacement bearings for beginners not ready for full ball bearings.', 'Universal', 'boxed', 'parts', 'Bearings', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15519', 'HG Round-Hole Ball Bearings 4pcs', 'Premium axle bearings for smoother wheel rotation and improved efficiency.', 'Universal', 'boxed', 'parts', 'Bearings', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '', null),
  ('15416', '60mm Reinforced Shafts Black 4pcs', 'Stronger 60mm axles for compatible chassis. Useful replacement stock item.', 'Universal', 'boxed', 'parts', 'Shafts/Gears', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15416-60mm-reinforced-shafts-black-4pcs.webp', null),
  ('15417', '72mm Reinforced Shafts Black 4pcs', 'Stronger 72mm axles for wide chassis and compatible front-motor setups.', 'Universal', 'boxed', 'parts', 'Shafts/Gears', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15417-72mm-reinforced-shafts-black-4pcs.webp', null),
  ('15508', 'Stainless Steel Screw Set 15/20/25/30mm', 'Common screw lengths for adding plates, rollers and dampers. A high-repeat-purchase item.', 'Universal', 'boxed', 'parts', 'Screws/Nuts', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15508-stainless-steel-screw-set-15-20-25-30mm.webp', null),
  ('15510', 'Stainless Steel Countersunk Screw Set 10/12/20/25/30mm', 'Countersunk hardware for cleaner plate mounting where the rules and plate design permit it.', 'Universal', 'boxed', 'parts', 'Screws/Nuts', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15510-stainless-steel-countersunk-screw-set-10-12-20-25-30mm.webp', null),
  ('15527', 'Stainless Steel Countersunk Screw Set 6/8/15mm', 'Short countersunk screws for compact plate and brake installations.', 'Universal', 'boxed', 'parts', 'Screws/Nuts', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15527-stainless-steel-countersunk-screw-set-6-8-15mm.webp', null),
  ('15473', 'Aluminum Spacer Set 12/6.7/6/3/1.5mm', 'Multiple spacer sizes for setting roller and stabilizer height.', 'Universal', 'boxed', 'parts', 'Screws/Nuts', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15473-aluminum-spacer-set-12-6-7-6-3-1-5mm.webp', null),
  ('15506', 'Lightweight Plastic Spacer Set', 'Budget lightweight spacers for learning setup height before buying more aluminum hardware.', 'Universal', 'boxed', 'parts', 'Screws/Nuts', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15506-lightweight-plastic-spacer-set.webp', null),
  ('15463', 'Mini 4WD Multipurpose Tape 10mm Blue', 'Useful for securing batteries and temporary setup work. Easy add-on sale.', 'Universal', 'boxed', 'parts', 'Accessories', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15463-mini-4wd-multipurpose-tape-10mm-blue.webp', null),
  ('15474', 'Mini 4WD Car Catcher', 'Safer way to collect fast cars from the track. Recommended for every racer.', 'Universal', 'boxed', 'parts', 'Accessories', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15474-mini-4wd-car-catcher.webp', null),
  ('15465', 'Mini 4WD Oil Applicator', 'Precision applicator for controlled lubrication without flooding the motor or bearings.', 'Universal', 'boxed', 'parts', 'Accessories', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15465-mini-4wd-oil-applicator.webp', null),
  ('15383', 'Mini 4WD F Grease', 'Low-friction grease for routine gear and drivetrain maintenance.', 'Universal', 'boxed', 'parts', 'Accessories', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15383-mini-4wd-f-grease.webp', null),
  ('15505', 'Mini 4WD Motor Case 2', 'Protects and organizes spare motors and small parts.', 'Universal', 'boxed', 'parts', 'Accessories', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/15505-mini-4wd-motor-case-2.webp', null),
  ('18703', 'Aero Manta Ray', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'AR', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18703-aero-manta-ray.webp', null),
  ('18707', 'Rowdy Bull', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'FM-A', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18707-rowdy-bull.webp', null),
  ('18635', 'Blast Arrow', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18635-blast-arrow.webp', null),
  ('18105', 'The Grasshopper Jr.', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18105-the-grasshopper-jr.webp', null),
  ('18104', 'Cross Spear 02', 'Sibling kit to Cross Spear 01 (18103) already in the catalog — a distinct item number, not a duplicate.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18104-cross-spear-02.webp', null),
  ('18097', 'Toyota GR Yaris', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18097-toyota-gr-yaris.webp', null),
  ('18095', 'Honda e', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18095-honda-e.webp', null),
  ('18100', 'Eleglitter', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18100-eleglitter.webp', null),
  ('18101', 'Super Avante Jr.', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18101-super-avante-jr.webp', null),
  ('95570', 'Penguin Racer', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/95570-penguin-racer.webp', null),
  ('95569', 'Elephant Racer', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/95569-elephant-racer.webp', null),
  ('18086', 'Dog Racer', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'Super-II', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18086-dog-racer.webp', null),
  ('18706', 'Mini 4WD Starter Pack AR Speed Spec', 'Official Tamiya Starter Pack — Aero Avante body on AR chassis, bundled with tools and upgrade hardware from the factory. A distinct SKU from the plain Aero Avante (18701) already in the catalog.', 'AR', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18706-mini-4wd-starter-pack-ar-speed-spec.webp', null),
  ('18647', 'Mini 4WD Starter Pack MA Power Spec', 'Official Tamiya Starter Pack — Blast Arrow body on MA chassis, bundled with tools and upgrade hardware from the factory.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18647-mini-4wd-starter-pack-ma-power-spec.webp', null),
  ('95598', 'Neo-VQS Advanced Pack', 'A distinct Advanced Pack SKU (not the plain Neo-VQS, 18094, already in the catalog) bundling real upgrade parts with the kit. Component list is not published here until independently verified against the official product page.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/95598-neo-vqs-advanced-pack.webp', null),
  ('18658', 'Chevalier', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18658-chevalier.webp', null),
  ('18659', 'Estoura', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18659-estoura.webp', null),
  ('18650', 'DCR-02', 'Sibling kit to DCR-01 (18646) already in the catalog — a distinct item number, not a duplicate.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18650-dcr-02.webp', null),
  ('18660', 'Stier', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18660-stier.webp', null),
  ('18625', 'Dash-1 Emperor', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'MS', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18625-dash-1-emperor.webp', null),
  ('18632', 'Dash-01 Super Emperor', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'MS', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18632-dash-01-super-emperor.webp', null),
  ('18661', 'Lexus LBX Morizo RR', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18661-lexus-lbx-morizo-rr.webp', null),
  ('18662', 'Avante Mk.III Nero (MS Chassis) Advanced Pack', 'A distinct Advanced Pack SKU — not the plain Avante Mk.III Nero (18627) already in the catalog. Official advanced components: Light-Dash Motor PRO, FRP plates, mass dampers, brake components, high-speed EX gears, super-hard low-profile tires, low-friction rollers, tools.', 'MS', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18662-avante-mk-iii-nero-advanced-pack.webp', null),
  ('95297', 'Sunny-Shuttle Premium', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'AR', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/95297-sunny-shuttle-premium.webp', null),
  ('18069', 'Dash-1 Emperor Premium', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'Super-II', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/18069-dash-1-emperor-premium.webp', null),
  ('92453', 'Lexus LBX Morizo RR White Special', 'Officially released Tamiya kit; not yet stocked or priced by Greenland Mini4WD — pending Philippine supplier verification.', 'MA', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/92453-lexus-lbx-morizo-rr-white-special.webp', null),
  ('95703', 'Zenperor 3 Polycarbonate Body Special', 'Racing Mini 4WD 40th Anniversary Limited Edition — officially released by Tamiya. Not yet stocked or priced by Greenland Mini4WD; supplier availability and image permission are pending.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/95703-zenperor-3-polycarbonate-body-special.webp', null),
  ('95190', 'Iron Beak', 'Japan Cup 2026 special — officially released by Tamiya. "Coming Soon to Greenland" describes only that this shop has not yet stocked or priced it, not that Tamiya has not released it.', 'VZ', 'boxed', 'cars', 'Mini 4WD Kit', null::numeric, null::numeric, true, 0, 0, 0, 'coming soon', false, false, '/catalog/products/95190-iron-beak.webp', null),
  ('display-case', 'Mini 4WD Display Case', 'Shared display case — one stock pool used for both a standalone purchase and a car-plus-case bundle. Supplier cost (300 PHP/case) is a known assumption pending later receipt verification; the 229 DKK standalone / 189 DKK bundled prices are locked and independently margin-verified (lib/pricing/displayCase.ts).', '', 'boxed', 'merchandise', 'Display Case', 229::numeric, null::numeric, false, 0, 0, 0, 'coming soon', false, false, '', null)
) as v(item_no, name, description, chassis, type, category, subcategory, price_dkk, original_price_dkk, price_on_request, stock_qty, unbuilt_stock, built_stock, status, available, is_collectors_vault, image_url, item_number)
where not exists (select 1 from public.products p where p.item_no = v.item_no);

commit;

-- ── VERIFICATION QUERIES (run manually after apply, never automatic) ────
--
-- -- Total product count (expect 120 = 14 existing + 106 inserted):
-- select count(*) from public.products;
--
-- -- Duplicate item_nos (expect 0 rows):
-- select item_no, count(*) from public.products
-- where item_no is not null and item_no <> ''
-- group by item_no having count(*) > 1;
--
-- -- Count of newly inserted item_nos (expect 106):
-- select count(*) from public.products where item_no in ('15347', '15375', '15381', '15383', '15391', '15392', '15394', '15398', '15401', '15402', '15405', '15408', '15416', '15417', '15429', '15430', '15434', '15449', '15450', '15451', '15452', '15453', '15455', '15456', '15457', '15458', '15459', '15462', '15463', '15464', '15465', '15472', '15473', '15474', '15476', '15477', '15484', '15485', '15486', '15487', '15488', '15489', '15490', '15492', '15498', '15499', '15501', '15505', '15506', '15508', '15510', '15512', '15514', '15516', '15518', '15519', '15523', '15524', '15525', '15526', '15527', '15528', '15534', '15541', '15542', '15544', '18069', '18086', '18094', '18095', '18097', '18100', '18101', '18103', '18104', '18105', '18625', '18627', '18632', '18635', '18640', '18646', '18647', '18650', '18657', '18658', '18659', '18660', '18661', '18662', '18701', '18703', '18706', '18707', '18714', '18718', '19438', '92453', '95126', '95190', '95297', '95569', '95570', '95598', '95703', 'display-case');
--
-- -- The 14 existing rows are present with only the deterministic corrections
-- -- applied — no price/stock/status change (expect 14 rows):
-- select item_no, name, price_dkk, status, chassis, image_url from public.products
-- where item_no in ('18099', '18704', '18705', '18710', '19431', '19440', '19442', '19443', '19447', '19451', '92461', '92462', '95571', '95706')
-- order by item_no;
--
-- -- Price-on-request breakdown (expect 104 true, 16 false — the 14 existing
-- -- rows plus the 2 newly-approved-price rows):
-- select price_on_request, count(*) from public.products group by price_on_request;
--
-- -- No price-on-request row ever has a nonzero price, and no non-price-on-request
-- -- row ever has a NULL price (expect 0 rows from each):
-- select item_no, price_dkk, price_on_request from public.products
-- where price_on_request = true and price_dkk is not null;
-- select item_no, price_dkk, price_on_request from public.products
-- where price_on_request = false and price_dkk is null;
--
-- -- No 0 DKK price anywhere (expect 0 rows — a real approved price is never
-- -- zero, and an unpriced row is NULL, never 0):
-- select item_no, price_dkk from public.products where price_dkk = 0;
--
-- -- Poster assignments among the newly inserted rows (expect 84):
-- select count(*) from public.products
-- where item_no in ('15347', '15375', '15381', '15383', '15391', '15392', '15394', '15398', '15401', '15402', '15405', '15408', '15416', '15417', '15429', '15430', '15434', '15449', '15450', '15451', '15452', '15453', '15455', '15456', '15457', '15458', '15459', '15462', '15463', '15464', '15465', '15472', '15473', '15474', '15476', '15477', '15484', '15485', '15486', '15487', '15488', '15489', '15490', '15492', '15498', '15499', '15501', '15505', '15506', '15508', '15510', '15512', '15514', '15516', '15518', '15519', '15523', '15524', '15525', '15526', '15527', '15528', '15534', '15541', '15542', '15544', '18069', '18086', '18094', '18095', '18097', '18100', '18101', '18103', '18104', '18105', '18625', '18627', '18632', '18635', '18640', '18646', '18647', '18650', '18657', '18658', '18659', '18660', '18661', '18662', '18701', '18703', '18706', '18707', '18714', '18718', '19438', '92453', '95126', '95190', '95297', '95569', '95570', '95598', '95703', 'display-case') and image_url like '/catalog/products/%';
--
-- -- Products without a poster overall (expect 25 — 3 existing orphans +
-- -- 22 new rows with no manifest match):
-- select item_no, name, image_url from public.products
-- where (image_url is null or image_url = '' or image_url not like '%/catalog/products/%')
-- order by item_no;
--
-- -- No comma-separated / Cloudinary image_url anywhere in the active catalog
-- -- (expect 0 rows):
-- select item_no, image_url from public.products
-- where image_url like '%,%' or image_url like '%cloudinary%';
--
-- -- Invalid stock values anywhere in the table (expect 0 rows):
-- select item_no, unbuilt_stock, built_stock from public.products
-- where unbuilt_stock < 0 or built_stock < 0;
--
-- -- product_inquiries table exists and is empty immediately after migration:
-- select count(*) from public.product_inquiries;
