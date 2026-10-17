-- SYNTHETIC test data only. Never run against a cloud project.
-- Mimics the risky parts of production: auth.users <-> public cross-schema dependencies,
-- an auth trigger that writes into public, RLS policies, grants, storage metadata, migration history.
DO $$ BEGIN
  IF current_setting('gl.synthetic_ok', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'refusing: synthetic seed requires SET gl.synthetic_ok=yes on a disposable DB';
  END IF;
END $$;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN EXECUTE format('CREATE ROLE %I NOLOGIN', r); END IF;
  END LOOP;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text);
CREATE TABLE IF NOT EXISTS auth.identities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, provider text NOT NULL);
CREATE TABLE IF NOT EXISTS storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE IF NOT EXISTS storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id), name text);
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);
DO $do$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth' AND p.proname='uid') THEN
    EXECUTE $f$CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $b$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $b$ $f$;
  END IF;
END $do$;

CREATE TABLE public.members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE REFERENCES auth.users(id),
  display_name text NOT NULL, role text NOT NULL DEFAULT 'member', created_at timestamptz DEFAULT now());
CREATE TABLE public.cars (id bigserial PRIMARY KEY, member_id uuid NOT NULL REFERENCES public.members(id), name text NOT NULL);
CREATE TABLE public.tournaments (id bigserial PRIMARY KEY, name text NOT NULL);
CREATE TABLE public.race_results (id bigserial PRIMARY KEY, tournament_id bigint REFERENCES public.tournaments(id),
  car_id bigint REFERENCES public.cars(id), position int NOT NULL);
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_self ON public.members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY results_read ON public.race_results FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.members, public.race_results TO authenticated;
GRANT SELECT ON public.race_results TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN INSERT INTO public.members (user_id, display_name) VALUES (NEW.id, split_part(NEW.email, '@', 1)); RETURN NEW; END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO auth.users (id, email) SELECT gen_random_uuid(), 'synthetic' || g || '@example.invalid' FROM generate_series(1, 25) g;
INSERT INTO auth.identities (user_id, provider) SELECT id, 'email' FROM auth.users WHERE email LIKE '%@example.invalid';
INSERT INTO public.cars (member_id, name) SELECT id, 'car-' || g FROM public.members, generate_series(1, 2) g;
INSERT INTO public.tournaments (name) SELECT 'synthetic-cup-' || g FROM generate_series(1, 3) g;
INSERT INTO public.race_results (tournament_id, car_id, position)
  SELECT t.id, c.id, row_number() OVER (PARTITION BY t.id ORDER BY c.id) FROM public.tournaments t, public.cars c;
INSERT INTO storage.buckets (id, name) VALUES ('synthetic-avatars', 'synthetic-avatars') ON CONFLICT DO NOTHING;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('20260101000000','synthetic_init'),('20260102000000','synthetic_rls') ON CONFLICT DO NOTHING;
