begin;

create table if not exists public.fixed_rewards_members_backup_20260719 (
  member_id uuid primary key,
  captured_at timestamptz not null default now(),
  total_points integer,
  points_rate numeric,
  lifetime_spending numeric not null,
  rank text
);

create table if not exists public.fixed_rewards_accounts_backup_20260719 (
  id uuid primary key,
  member_id uuid not null,
  member_name text,
  points_balance numeric,
  total_earned numeric,
  total_redeemed numeric,
  tier text,
  points_rate numeric,
  updated_at timestamp without time zone
);

create table if not exists public.fixed_rewards_transactions_backup_20260719 (
  id uuid primary key,
  member_id uuid,
  member_name text,
  type text,
  amount numeric,
  rate_applied numeric,
  purchase_amount numeric,
  description text,
  created_at timestamp without time zone
);

create table if not exists public.fixed_rewards_inserted_transactions_20260719 (
  id uuid primary key
);

alter table public.fixed_rewards_members_backup_20260719 enable row level security;
alter table public.fixed_rewards_members_backup_20260719 force row level security;
alter table public.fixed_rewards_accounts_backup_20260719 enable row level security;
alter table public.fixed_rewards_accounts_backup_20260719 force row level security;
alter table public.fixed_rewards_transactions_backup_20260719 enable row level security;
alter table public.fixed_rewards_transactions_backup_20260719 force row level security;
alter table public.fixed_rewards_inserted_transactions_20260719 enable row level security;
alter table public.fixed_rewards_inserted_transactions_20260719 force row level security;

revoke all on public.fixed_rewards_members_backup_20260719 from anon, authenticated;
revoke all on public.fixed_rewards_accounts_backup_20260719 from anon, authenticated;
revoke all on public.fixed_rewards_transactions_backup_20260719 from anon, authenticated;
revoke all on public.fixed_rewards_inserted_transactions_20260719 from anon, authenticated;

do $$
declare
  existing_member_backup integer;
  existing_account_backup integer;
  existing_transaction_backup integer;
begin
  select count(*) into existing_member_backup from public.fixed_rewards_members_backup_20260719;
  select count(*) into existing_account_backup from public.fixed_rewards_accounts_backup_20260719;
  select count(*) into existing_transaction_backup from public.fixed_rewards_transactions_backup_20260719;

  if existing_member_backup <> 0 or existing_account_backup <> 0 or existing_transaction_backup <> 0 then
    raise exception 'Fixed reward backup tables are not empty';
  end if;

  if exists (select 1 from public.loyalty_points where coalesce(total_redeemed, 0) <> 0) then
    raise exception 'Migration requires manual review because a current account has redeemed points';
  end if;
end $$;

insert into public.fixed_rewards_members_backup_20260719(
  member_id,
  total_points,
  points_rate,
  lifetime_spending,
  rank
)
select
  id,
  total_points,
  points_rate,
  lifetime_spending,
  rank
from public.members;

insert into public.fixed_rewards_accounts_backup_20260719(
  id,
  member_id,
  member_name,
  points_balance,
  total_earned,
  total_redeemed,
  tier,
  points_rate,
  updated_at
)
select
  id,
  member_id,
  member_name,
  points_balance,
  total_earned,
  total_redeemed,
  tier,
  points_rate,
  updated_at
from public.loyalty_points;

insert into public.fixed_rewards_transactions_backup_20260719(
  id,
  member_id,
  member_name,
  type,
  amount,
  rate_applied,
  purchase_amount,
  description,
  created_at
)
select
  id,
  member_id,
  member_name,
  type,
  amount,
  rate_applied,
  purchase_amount,
  description,
  created_at
from public.points_transactions;

update public.members
set
  total_points = floor(greatest(coalesce(lifetime_spending, 0), 0) / 100)::integer,
  points_rate = 1;

insert into public.loyalty_points(
  member_id,
  member_name,
  points_balance,
  total_earned,
  total_redeemed,
  tier,
  points_rate,
  updated_at
)
select
  m.id,
  coalesce(nullif(trim(m.name), ''), nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''), m.email),
  floor(greatest(coalesce(m.lifetime_spending, 0), 0) / 100),
  floor(greatest(coalesce(m.lifetime_spending, 0), 0) / 100),
  0,
  'fixed_rewards',
  1,
  now()
from public.members m
on conflict (member_id) do update
set
  member_name = excluded.member_name,
  points_balance = excluded.points_balance,
  total_earned = excluded.total_earned,
  total_redeemed = 0,
  tier = 'fixed_rewards',
  points_rate = 1,
  updated_at = now();

with inserted as (
  insert into public.points_transactions(
    member_id,
    member_name,
    type,
    amount,
    rate_applied,
    purchase_amount,
    description
  )
  select
    m.id,
    coalesce(nullif(trim(m.name), ''), nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''), m.email),
    'adjust',
    floor(greatest(coalesce(m.lifetime_spending, 0), 0) / 100),
    1,
    m.lifetime_spending,
    'Converted to fixed rewards: 1 point per 100 DKK of eligible spending'
  from public.members m
  where floor(greatest(coalesce(m.lifetime_spending, 0), 0) / 100) > 0
  returning id
)
insert into public.fixed_rewards_inserted_transactions_20260719(id)
select id from inserted;

do $$
declare
  member_count integer;
  account_count integer;
  invalid_member_points integer;
  invalid_accounts integer;
  legacy_rate_accounts integer;
begin
  select count(*) into member_count from public.members;
  select count(*) into account_count from public.loyalty_points;

  select count(*) into invalid_member_points
  from public.members
  where total_points is distinct from floor(greatest(coalesce(lifetime_spending, 0), 0) / 100)::integer
     or points_rate is distinct from 1::numeric;

  select count(*) into invalid_accounts
  from public.members m
  left join public.loyalty_points lp on lp.member_id = m.id
  where lp.member_id is null
     or lp.points_balance is distinct from floor(greatest(coalesce(m.lifetime_spending, 0), 0) / 100)
     or lp.total_earned is distinct from floor(greatest(coalesce(m.lifetime_spending, 0), 0) / 100)
     or lp.total_redeemed is distinct from 0::numeric
     or lp.points_balance <> trunc(lp.points_balance);

  select count(*) into legacy_rate_accounts
  from public.loyalty_points
  where points_rate is distinct from 1::numeric;

  if member_count <> account_count then
    raise exception 'Expected one reward account per member: members %, accounts %', member_count, account_count;
  end if;

  if invalid_member_points <> 0 or invalid_accounts <> 0 or legacy_rate_accounts <> 0 then
    raise exception 'Fixed reward verification failed: members %, accounts %, legacy rates %', invalid_member_points, invalid_accounts, legacy_rate_accounts;
  end if;
end $$;

commit;
