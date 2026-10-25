-- P4_02 synthetically replayed in isolated disposable PostgreSQL 17.
-- NO real members, passwords, hashes or server secrets are loaded.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TYPE public.staff_role AS ENUM (
 'admin','registration_staff','checkin_staff','shop_staff','race_marshal','viewer');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE TABLE public.staff_roles (user_id uuid NOT NULL,role public.staff_role NOT NULL);
CREATE TABLE public.members (
 id uuid PRIMARY KEY,
 name text,first_name text,last_name text,email text,
 password_hash text,auth_user_id uuid,avatar_url text,
 member_status text,loyalty_tier text,points_rate numeric,
 loyalty_progress integer,loyalty_needed integer,weekly_loyalty_progress integer,
 season_loyalty_progress integer,total_points integer,rank text,
 membership_expires_at date,is_active_member boolean,
 lifetime_spending numeric
);
-- Current deployed GM4WD supplies public.has_staff_role. This synthetic
-- stub must only mirror its authorization predicate, not its implementation.
CREATE FUNCTION public.has_staff_role(p_allowed public.staff_role[]) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path='pg_catalog','pg_temp' AS $$
 SELECT EXISTS (SELECT 1 FROM public.staff_roles
  WHERE user_id=auth.uid() AND role=any(p_allowed))
$$;
-- Deliberately reproducible pre-lockdown permissions: anon SELECT/INSERT on
-- public.members with RLS OFF, no seeded privileged real member.
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_role(public.staff_role[]) TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.members TO anon,authenticated;
INSERT INTO public.members(id,name,first_name,last_name,email,password_hash,auth_user_id)
 VALUES
 ('11111111-1111-4111-8111-111111111111','One','One','Club','one@example.invalid','SYNTHETIC_HASH_PLACEHOLDER',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('22222222-2222-4222-8222-222222222222','Two','Two','Club','two@example.invalid','SYNTHETIC_HASH_PLACEHOLDER',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO public.staff_roles(user_id,role)
 VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','admin');
-- Execute the ACTUAL migration on disk, not a rewritten approximation.
\i supabase/release/P4_02_r4_r5_lockdown.sql
