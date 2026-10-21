# Rollback runbook — members security release (PREPARED, NOT EXECUTED)
Decide quickly: roll back the APPLICATION first (instant, no data risk), then the DATABASE restrictions if they are the cause. No step below modifies, deletes or restores member rows.

## A. Application (Vercel) — any time after P2
Vercel dashboard > project `greenland-mini4wd` > Deployments > `dpl_pDMc2YRw7tM8aDfSa7yo3bYZveaH` (main 24b6783) > Promote to Production. (CLI: `vercel promote <deployment-url>`.) Effect: the old site returns. IMPORTANT: if P4 (lockdown) is already applied, the old site cannot read/write members as anonymous, so do section B at the same time or immediately after.

## B. Database restrictions only (after P4) — fastest safe undo
Run in the SQL editor:
```sql
begin;
alter table public.members disable row level security;
alter table public.members no force row level security;
grant select, insert, update on public.members to anon, authenticated;
grant delete, truncate, references, trigger on public.members to anon, authenticated;   -- only if the old site needs it (it does not use them)
drop policy if exists members_select_own   on public.members;
drop policy if exists members_select_staff on public.members;
drop policy if exists members_update_staff on public.members;
commit;
```
This restores the audited pre-release exposure (known and accepted for the shortest possible time). Rows are untouched.

## C. Remove the additive objects (optional, after A and B; they are harmless if left)
Run `supabase/release/ROLLBACK_all.sql` (drops the club_* functions and `club_member_sessions`; also restores `grant all` on members as in section B).

## D. Data recovery (only if rows were damaged, which no release step does)
1. Do NOT restore over production blindly. Restore the 2026-10-20 (or the fresh pre-window) backup into a NEW disposable database first (`scripts/backup/40_restore_rehearsal.sh <decrypted-folder>`), compare `public.members` and related tables, then decide a targeted row-level repair with Ace.
2. Items outside the database dump must be re-applied manually from the config snapshot: Auth settings (SMTP, URL configuration, templates, providers), Storage object files (0 objects expected), Edge Functions, Vercel environment variables.

## Triggers for rollback
Registration or login failing for real members; admin lists empty after P4; 5xx or 4xx spikes in Vercel runtime logs; any anonymous request that still reads `members` (then roll back, investigate, never relax the restriction silently).
