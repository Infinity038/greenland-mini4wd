-- Disposable PostgreSQL 17-only test of owner approvals and session scope.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TYPE public.staff_role AS ENUM('admin','registration_staff','checkin_staff','shop_staff','race_marshal','viewer');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE TABLE public.members(id uuid PRIMARY KEY, name text);
CREATE TABLE public.staff_roles(user_id uuid,role public.staff_role);
CREATE TABLE public.club_member_sessions(
 token_hash text PRIMARY KEY, member_id uuid NOT NULL, expires_at timestamptz NOT NULL
);
CREATE FUNCTION public.has_staff_role(p_roles public.staff_role[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','pg_temp' AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff_roles
  WHERE user_id=auth.uid() AND role=ANY(p_roles))
$$;
GRANT USAGE ON SCHEMA public TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_role(public.staff_role[]) TO authenticated;
INSERT INTO public.members VALUES
 ('11111111-1111-4111-8111-111111111111','Synthetic approved member'),
 ('22222222-2222-4222-8222-222222222222','Synthetic unapproved member');
INSERT INTO public.staff_roles VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','admin');
INSERT INTO public.club_member_sessions(token_hash,member_id,expires_at) VALUES
 (encode(extensions.digest(repeat('b',64),'sha256'),'hex'),
  '11111111-1111-4111-8111-111111111111',now()+interval '1 hour'),
 (encode(extensions.digest(repeat('c',64),'sha256'),'hex'),
  '22222222-2222-4222-8222-222222222222',now()+interval '1 hour'),
 (encode(extensions.digest(repeat('d',64),'sha256'),'hex'),
  '11111111-1111-4111-8111-111111111111',now()-interval '1 hour');
\i supabase/release-candidate/GM4WD_PIT_P0_APPROVAL_GATE_STAGING_ONLY.sql
