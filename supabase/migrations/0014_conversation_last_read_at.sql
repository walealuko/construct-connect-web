-- Construct Centre: per-participant "last read" marker on conversations.
--
-- The inbox UI wants to show a small dot / badge on conversations
-- that have a new message the user hasn't seen yet. The natural
-- shape is a `last_read_at` timestamp on the conversation row that
-- the user's client writes when they open the conversation.
--
-- We intentionally store it on the SHARED conversation row rather
-- than a separate `conversation_participants` table:
--   - There's no existing junction table; the app models
--     participants as a uuid[] array column.
--   - A separate table would require its own RLS policies and its
--     own realtime plumbing; the cost isn't justified for one
--     nullable timestamp.
--
-- The downside: a single shared `last_read_at` can only be
-- "last read by either participant," which doesn't actually mean
-- "last read by ME." We work around that by treating the column
-- as the *user's own* read pointer — every time the client opens
-- a conversation, it writes the new timestamp; the realtime
-- UPDATE event lands on the same row in both clients, but each
-- client only renders the dot if `last_message_at >
-- last_read_at` is true *for that participant's view*. To do that
-- correctly we need a per-participant read marker, which a shared
-- column can't express.
--
-- Pragmatic compromise: a `last_read_at` per *user*, on a
-- `conversation_reads( conversation_id, user_id, last_read_at )`
-- table. Small, RLS-gated, and lets two participants each have
-- their own pointer. The "unread" predicate is a per-row
-- comparison against the user's own `last_read_at` row.
--
-- Apply manually in the Supabase SQL editor. Idempotent — every
-- statement is `if not exists` / `drop ... if exists` so re-running
-- is safe.

begin;

-- New per-participant read table. Composite PK on
-- (conversation_id, user_id) means each user has at most one read
-- row per conversation, and the upsert is a single statement.
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- Last-message-sender pointer on the conversation row. Used by the
-- sidebar to decide whether the "unread" dot is actionable: a
-- conversation where the *current user* sent the most recent
-- message is conceptually "read" from their perspective, even
-- though the other party hasn't read it yet. We need the sender id
-- on the conversation row so the client doesn't have to fetch the
-- latest message of every conversation just to draw a dot.
--
-- Nullable for legacy rows that pre-date this column. The
-- sendMessageAction writes both last_message_sender_id and
-- last_message_at in the same UPDATE, so any new activity
-- backfills the sender id.
alter table public.conversations
  add column if not exists last_message_sender_id uuid
    references auth.users(id) on delete set null;

-- RLS: a user can read their own read rows (and only their own).
-- This powers the "is this conversation unread for me?" check on
-- the client — we don't need to expose anyone else's read marker.
drop policy if exists "users can read their own read rows" on public.conversation_reads;
create policy "users can read their own read rows"
on public.conversation_reads for select to authenticated
using ( user_id = auth.uid() );

-- A user can write their own read rows. The UPSERT in
-- markConversationReadAction targets (conversation_id, user_id)
-- where user_id = auth.uid(), so this single policy is enough.
drop policy if exists "users can upsert their own read rows" on public.conversation_reads;
create policy "users can upsert their own read rows"
on public.conversation_reads for insert to authenticated
with check ( user_id = auth.uid() );

drop policy if exists "users can update their own read rows" on public.conversation_reads;
create policy "users can update their own read rows"
on public.conversation_reads for update to authenticated
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

-- A user can also delete their own read rows (e.g. for an
-- "mark as unread" feature, or to clean up after a conv is
-- emptied). Not used today but cheap to add now.
drop policy if exists "users can delete their own read rows" on public.conversation_reads;
create policy "users can delete their own read rows"
on public.conversation_reads for delete to authenticated
using ( user_id = auth.uid() );

-- Index on user_id so a query like "give me my read markers for
-- every conversation I'm in" is a fast index scan. The PK already
-- covers (conversation_id, user_id) lookups.
create index if not exists conversation_reads_user_id_idx
  on public.conversation_reads (user_id);

commit;
