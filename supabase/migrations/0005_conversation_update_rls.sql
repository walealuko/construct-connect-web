-- Construct Hub: let conversation participants reset the conversation
-- snapshot (last_message, last_message_at) when they clear or send.
--
-- Apply manually in the Supabase SQL editor. Idempotent — every policy
-- is preceded by `drop policy if exists` so re-running this migration
-- is safe.
--
-- The action layer in `app/actions/chat.ts` (clearConversationAction
-- and send-message updates) writes to `last_message` / `last_message_at`
-- after a row is added or removed. Without an UPDATE policy, those
-- writes silently fail under RLS and the sidebar keeps showing stale
-- previews after a delete or "empty" operation.
--
-- Scope: only participants can touch the snapshot fields. They can't
-- rewrite participant_ids or any future sensitive columns because
-- the WITH CHECK also gates on auth.uid() = any (participant_ids).
-- The shape of that gate is the same as the INSERT policy, so
-- participants cannot re-add themselves to a conversation they
-- weren't originally in.

begin;

drop policy if exists "participants can update their conversation snapshot" on public.conversations;
create policy "participants can update their conversation snapshot"
on public.conversations for update to authenticated
using ( auth.uid() = any (participant_ids) )
with check ( auth.uid() = any (participant_ids) );

commit;