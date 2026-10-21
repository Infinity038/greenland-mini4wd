begin;
-- R3: remove privileges that no code path uses.
revoke delete, truncate, references, trigger on public.members from anon, authenticated;
revoke update on public.members from anon;
commit;
