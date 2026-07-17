-- Construct Centre: let any conversation participant delete any message in it.
--
-- Apply manually in the Supabase SQL editor. Idempotent — every policy
-- is preceded by `drop policy if exists` so re-running this migration
-- is safe.
--
-- The action layer (`app/actions/chat.ts:deleteMessageAction`) relies on
-- this RLS policy as the single source of truth for "can this caller
-- delete this row". The action itself does not pre-check participant
-- membership so the policy stays the gate.

begin;

-- ============================================================
-- messages DELETE: any participant of the parent conversation
-- can delete any message in it. We do not restrict to sender_id
-- by design — the product rule is that either party can clean
-- up a conversation.
-- ============================================================

drop policy if exists "participants can delete messages in their conversations" on public.messages;
create policy "participants can delete messages in their conversations"
on public.messages for delete to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() = any (c.participant_ids)
  )
);

commit;
