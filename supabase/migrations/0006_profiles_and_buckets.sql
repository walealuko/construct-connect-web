-- Construct Centre: align the public.profiles table with the columns the
-- application reads and writes. The profiles table was originally
-- created outside the migration set, so its live schema diverged
-- from the app's expectations — every profile edit (or new user
-- registration) tried to write to columns that didn't exist,
-- surfacing as PostgREST "Could not find the X column of profiles
-- in the schema cache" errors.
--
-- Apply manually in the Supabase SQL editor. Every ALTER is guarded
-- with `add column if not exists` so re-running this migration is
-- safe even on a fresh database.
--
-- The columns added here match the union of every insert/upsert/update
-- site in app/actions/* and components/. Drop a column here only if
-- you also stop writing it in code.

begin;

-- ============================================================
-- 1. profiles: add the columns the app expects.
-- ============================================================

alter table public.profiles
  add column if not exists first_name     text,
  add column if not exists last_name      text,
  add column if not exists username       text,
  add column if not exists tier           text
    check (tier in ('admin','business','individual','artisan')),
  add column if not exists business_name  text,
  add column if not exists business_type  text,
  add column if not exists bio            text,
  add column if not exists location       text,
  add column if not exists state          text,
  add column if not exists portfolio      text[] not null default '{}';

-- username: backfill from email's local part when missing so existing
-- rows aren't null, then keep it nullable (new users set it at signup).
update public.profiles
  set username = split_part(email, '@', 1)
  where username is null
    and email is not null;

-- tier: backfill 'individual' for any existing profile that has no
-- tier yet, so the role-based middleware redirect picks a sane
-- default rather than failing the auth gate.
update public.profiles
  set tier = 'individual'
  where tier is null;

-- ============================================================
-- 2. Storage buckets: create the buckets the app uploads to.
--    The 0001 migration only added the per-bucket RLS policies on
--    storage.objects; it never created the buckets themselves. If a
--    user's Supabase project was set up by hand without the buckets,
--    every upload and every image render returns "Bucket not found".
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('product-images',    'product-images',    true),
  ('artisan-portfolio', 'artisan-portfolio', true)
on conflict (id) do nothing;

commit;