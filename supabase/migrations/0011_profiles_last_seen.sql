-- Construct Centre: add profiles.last_seen for "user is online" detection.
--
-- The chat message-received email throttles on "did the recipient
-- have the app open in the last 5 minutes?" Without a last_seen
-- column we'd have to either always send (spammy) or never send
-- (defeats the point). One timestamp per profile is the simplest
-- answer.
--
-- The application layer (UserContext onAuthStateChange) writes
-- last_seen = now() on INITIAL_SESSION and SIGNED_IN. Subsequent
-- writes can come from a periodic heartbeat (future work); for now,
-- a sign-in time is good enough.
--
-- HOW TO USE
-- ----------
-- Paste the ENTIRE contents of this file into the Supabase SQL
-- editor (Database → SQL Editor → New query) and click Run.
--
-- Idempotent: `add column if not exists` is safe to re-run.

begin;

alter table public.profiles
  add column if not exists last_seen timestamptz;

commit;
