begin;

do $$
declare
  member_backup_count integer;
  live_member_count integer;
  missing_member_backup integer;
begin
  select count(*) into member_backup_count from public.fixed_rewards_members_backup_20260719;
  select count(*) into live_member_count from public.members;
  select count(*) into missing_member_backup
  from public.members m
  left join public.fixed_rewards_members_backup_20260719 b on b.member_id = m.id
  where b.member_id is null;

  if member_backup_count <> live_member_count or missing_member_backup <> 0 then
    raise exception 'Fixed reward rollback preflight failed: backup %, live %, missing %', member_backup_count, live_member_count, missing_member_backup;
  end if;
end $$;

delete from public.points_transactions
where id in (select id from public.fixed_rewards_inserted_transactions_20260719);

update public.members m
set
  total_points = b.total_points,
  points_rate = b.points_rate,
  lifetime_spending = b.lifetime_spending,
  rank = b.rank
from public.fixed_rewards_members_backup_20260719 b
where m.id = b.member_id;

delete from public.loyalty_points
where member_id in (select member_id from public.fixed_rewards_members_backup_20260719);

insert into public.loyalty_points(
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
from public.fixed_rewards_accounts_backup_20260719;

do $$
declare
  restored_members integer;
  restored_accounts integer;
  expected_accounts integer;
begin
  select count(*) into restored_members
  from public.members m
  join public.fixed_rewards_members_backup_20260719 b on b.member_id = m.id
  where m.total_points is not distinct from b.total_points
    and m.points_rate is not distinct from b.points_rate
    and m.lifetime_spending is not distinct from b.lifetime_spending
    and m.rank is not distinct from b.rank;

  select count(*) into restored_accounts
  from public.loyalty_points lp
  join public.fixed_rewards_accounts_backup_20260719 b on b.id = lp.id
  where lp.member_id is not distinct from b.member_id
    and lp.member_name is not distinct from b.member_name
    and lp.points_balance is not distinct from b.points_balance
    and lp.total_earned is not distinct from b.total_earned
    and lp.total_redeemed is not distinct from b.total_redeemed
    and lp.tier is not distinct from b.tier
    and lp.points_rate is not distinct from b.points_rate
    and lp.updated_at is not distinct from b.updated_at;

  select count(*) into expected_accounts from public.fixed_rewards_accounts_backup_20260719;

  if restored_members <> (select count(*) from public.fixed_rewards_members_backup_20260719)
     or restored_accounts <> expected_accounts then
    raise exception 'Fixed reward rollback verification failed: members %, accounts % of %', restored_members, restored_accounts, expected_accounts;
  end if;
end $$;

drop table public.fixed_rewards_inserted_transactions_20260719;
drop table public.fixed_rewards_transactions_backup_20260719;
drop table public.fixed_rewards_accounts_backup_20260719;
drop table public.fixed_rewards_members_backup_20260719;

commit;
