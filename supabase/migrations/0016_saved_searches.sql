-- Construct Hub: saved project searches + the trigger that fans
-- them out to a Postgres NOTIFY channel for the realtime listener.
--
-- Two pieces in this migration:
--
-- 1. `saved_searches` — one row per user-saved filter combination on
--    /projects. The user can save a combination of free-text `query`,
--    `category`, `state`, and budget min/max, give it a name, and
--    later re-apply it from a dropdown. RLS is self-only — a user
--    can read/write only their own rows. Same shape as the
--    `cart_items` migration.
--
-- 2. `projects_notify_new` trigger — AFTER INSERT on `projects`,
--    publish a row's id + category + state + budget + title to a
--    `new_project` pg_notify channel. The Edge Function
--    `notify-saved-searches` listens on that channel and matches the
--    payload against every saved_searches row in the database,
--    dispatching one email per match via Resend.
--
--    We deliberately do NOT filter by saved search inside the
--    trigger — the matching is cheap and the JS layer can use the
--    service-role key, which the trigger cannot.
--
--    Fallback path: if the Edge Function deploy turns out to be
--    infeasible, the same trigger body can call
--    `pg_net.http_post(...)` to a Next.js API route. The pg_notify
--    approach is preferred because it survives direct-DB inserts
--    (admin tools, data backfills) without an extra wiring step.
--
-- Apply manually in the Supabase SQL editor. Idempotent — every
-- statement is `if not exists` / `drop ... if exists` so re-running
-- is safe.

begin;

-- ============================================================
-- 1. The saved_searches table
-- ============================================================

create table if not exists public.saved_searches (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  -- Free-text search term; matches against title/description the
  -- same way the search input on /projects does. Nullable so a
  -- user can save a filter set without a free-text term.
  query       text,
  -- Exact-match filters. Nullable so a saved search can target
  -- "any category" or "any state".
  category    text,
  state       text,
  min_budget  int         check (min_budget is null or min_budget >= 0),
  max_budget  int         check (max_budget is null or max_budget >= 0),
  created_at  timestamptz not null default now()
);

-- Index on user_id for the "list my saved searches" query. The
-- table is small (per-user, dozens of rows max) so a covering
-- index isn't worth the write cost.
create index if not exists saved_searches_user_id_idx
  on public.saved_searches (user_id);

-- ============================================================
-- 2. RLS — self-only CRUD for authenticated users
-- ============================================================

alter table public.saved_searches enable row level security;

drop policy if exists "users can read their own saved searches" on public.saved_searches;
create policy "users can read their own saved searches"
on public.saved_searches for select to authenticated
using ( user_id = auth.uid() );

drop policy if exists "users can insert their own saved searches" on public.saved_searches;
create policy "users can insert their own saved searches"
on public.saved_searches for insert to authenticated
with check ( user_id = auth.uid() );

drop policy if exists "users can update their own saved searches" on public.saved_searches;
create policy "users can update their own saved searches"
on public.saved_searches for update to authenticated
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

drop policy if exists "users can delete their own saved searches" on public.saved_searches;
create policy "users can delete their own saved searches"
on public.saved_searches for delete to authenticated
using ( user_id = auth.uid() );

-- ============================================================
-- 3. new_project NOTIFY trigger
-- ============================================================

-- Trigger function: when a new project row is inserted, publish a
-- JSON payload to the `new_project` pg_notify channel. The Edge
-- Function `notify-saved-searches` listens on this channel and
-- matches the payload against every saved_searches row.
--
-- We only emit the columns the matcher needs — id, title,
-- category, state, budget. The full row can be re-fetched by id
-- inside the Edge Function if the matcher needs more.
create or replace function public.notify_new_project()
returns trigger
language plpgsql
as $$
begin
  perform pg_notify(
    'new_project',
    json_build_object(
      'id', new.id,
      'title', new.title,
      'category', coalesce(new.category, ''),
      'state', coalesce(new.state, ''),
      'budget', coalesce(new.budget, 0),
      'created_at', new.created_at
    )::text
  );
  return new;
end;
$$;

drop trigger if exists projects_notify_new on public.projects;
create trigger projects_notify_new
  after insert on public.projects
  for each row execute function public.notify_new_project();

-- pg_notify payload limit is 8000 bytes. The JSON above is well
-- under that for any plausible project title. A future migration
-- could move to a queue table if titles ever blow past that.

commit;
