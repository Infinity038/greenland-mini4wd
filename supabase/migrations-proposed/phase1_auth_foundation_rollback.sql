-- DO NOT RUN — REVIEWED PROPOSAL ONLY
--
-- PHASE 1 ROLLBACK (public-schema changes only)
--
-- Only removes what the corrected phase1_auth_foundation_forward.sql adds:
-- current_member_id(), the partial unique index, and the auth_user_id
-- column. No pre-existing `members` row is altered or deleted by either the
-- forward or this rollback script.
--
-- THIS ROLLBACK DOES NOT DELETE SUPABASE AUTH USERS. It never did anything
-- with auth.users/auth.identities to begin with (see the forward file's
-- SCOPE CORRECTION note) — those are created and owned exclusively by
-- Supabase Auth itself via the Admin API, through the separate
-- scripts/migrateMembersToSupabaseAuth.mjs importer, and this SQL rollback
-- has no visibility into, and makes no attempt to touch, that data.
--
-- AUTH USERS CREATED BY THE IMPORTER REQUIRE SEPARATE, DELIBERATE HANDLING.
-- If members were already linked via the importer before this rollback
-- runs, running this rollback drops `auth_user_id` (and therefore the
-- link), but the corresponding `auth.users`/`auth.identities` rows the
-- importer created remain exactly as they are — they are not orphaned in
-- any destructive sense, just no longer referenced by `members`. Deciding
-- whether to keep, relink, or explicitly remove those Auth users (via the
-- Supabase Auth Admin API, `auth.admin.deleteUser()` — never a raw SQL
-- delete) is a separate, deliberate decision for whoever runs this
-- rollback, made with the real list of already-migrated members in hand —
-- this rollback file cannot make that call safely on its own and does not
-- attempt to.
--
-- THIS ROLLBACK MUST NEVER AUTOMATICALLY DELETE AN EXISTING AUTH IDENTITY.
-- There is deliberately no `delete from auth.users` (or any auth.* table)
-- anywhere in this file, unlike an earlier draft of this rollback. A
-- rollback that guessed which Auth users to remove (e.g. by metadata tag)
-- could delete a real, live-login-capable identity based on a heuristic —
-- exactly the kind of blast radius this whole Phase 1 correction exists to
-- avoid.
--
-- ROLLBACK ORDER: current_member_id() first (nothing else in this file
-- depends on it), then the unique index, then the column itself — each
-- step is safe to run alone if a later step needs to stop.
--
-- ROLLBACK TRIGGERS: see phase1_auth_foundation_forward.sql. Run this
-- before rolling back Phase 2/3 if any of those have shipped since — later
-- phases depend on auth_user_id and staff_roles, so they must be unwound
-- first.

begin;

drop function if exists public.current_member_id();
drop index if exists public.members_auth_user_id_key;
alter table public.members drop column if exists auth_user_id;

commit;
