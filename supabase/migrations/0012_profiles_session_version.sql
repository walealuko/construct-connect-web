-- Construct Hub: add profiles.session_version for forced sign-out.
--
-- The admin action `clearAllUserSessionsAction(userId)` rotates this
-- column. The proxy reads the JWT's embedded `session_version` and
-- compares it to the current row value; if they differ, the user is
-- signed out (cookies cleared, redirect to /login).
--
-- Why a column on profiles (and not on auth.users): the column has to
-- be readable from the proxy with RLS. profiles is already RLS-readable
-- to the row owner; auth.users requires service role for reads, which
-- is fine but slower. Storing it on profiles keeps the proxy's read
-- to a single, fast, RLS-gated query.
--
-- Why integer and not timestamptz: simpler comparison, no parsing,
-- and the value is monotonic by construction (we always write
-- Date.now()). The version is a u64 by Date.now(), so collisions are
-- not possible.
--
-- Default 0 so existing rows compare equal to a JWT minted before
-- this column existed (where the JWT has no session_version claim,
-- the proxy treats it as 0).
--
-- HOW TO USE
-- ----------
-- Paste the ENTIRE contents of this file into the Supabase SQL
-- editor (Database → SQL Editor → New query) and click Run.
--
-- Idempotent: `add column if not exists` and `if not exists` on the
-- index are safe to re-run.

begin;

alter table public.profiles
  add column if not exists session_version bigint not null default 0;

create index if not exists profiles_session_version_idx
  on public.profiles (id, session_version);

commit;
