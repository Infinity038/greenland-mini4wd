-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 12 ROLLBACK
--
-- ROLLBACK TRIGGERS: see phase12_legacy_deprecation_forward.sql.

begin;

drop policy if exists "admin manage legacy tickets" on public.tickets;
create policy "racer insert own tickets" on public.tickets
  for insert with check (member_email = (select email from public.members where auth_user_id = auth.uid()));
create policy "staff manage tickets" on public.tickets
  for all using (public.has_staff_role(array['checkin_staff', 'shop_staff', 'admin']::public.staff_role[]))
  with check (public.has_staff_role(array['checkin_staff', 'shop_staff', 'admin']::public.staff_role[]));

drop policy if exists "admin manage legacy race tickets" on public.race_tickets;
create policy "racer insert own race tickets" on public.race_tickets
  for insert with check (
    member_email = (select email from public.members where auth_user_id = auth.uid())
    and payment_status = 'awaiting_payment'
  );
create policy "staff manage race tickets" on public.race_tickets
  for all using (public.has_staff_role(array['checkin_staff', 'shop_staff', 'admin']::public.staff_role[]))
  with check (public.has_staff_role(array['checkin_staff', 'shop_staff', 'admin']::public.staff_role[]));

drop policy if exists "admin manage legacy ticket transactions" on public.ticket_transactions;
create policy "staff manage ticket transactions" on public.ticket_transactions
  for all using (public.has_staff_role(array['checkin_staff', 'shop_staff', 'admin']::public.staff_role[]))
  with check (public.has_staff_role(array['checkin_staff', 'shop_staff', 'admin']::public.staff_role[]));

comment on table public.tickets is null;
comment on table public.race_tickets is null;
comment on table public.ticket_transactions is null;
comment on column public.members.membership_expires_at is null;

alter table public.tickets drop column if exists deprecated_at;
alter table public.race_tickets drop column if exists deprecated_at;
alter table public.ticket_transactions drop column if exists deprecated_at;

commit;
