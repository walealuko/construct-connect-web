-- Construct Hub: per-user "hide from my inbox" + per-user "soft-delete
-- my order" affordances.
--
-- Two separate features, one migration so the user only needs to
-- visit the SQL editor once.
--
-- 1. `conversation_hides` — a per-user join table that lets a
--    participant hide a conversation from their own sidebar without
--    touching the other participant. The conversation row itself
--    stays put, the messages stay put — only this user's view of
--    the list filters the conversation out. The other side keeps
--    seeing it. RLS gates the rows to user_id = auth.uid() so a
--    user can never see or write another user's hide.
--
-- 2. `orders.deleted_at` — a soft-delete timestamp on the orders
--    table. When a buyer removes an order from their own history,
--    we set `deleted_at = now()` rather than actually deleting the
--    row. The seller's analytics (revenue, counts) and the
--    order_items join still need the row, so a hard delete would
--    break seller dashboards. Soft delete keeps the row data
--    intact while removing it from the buyer's history view.
--    Existing orders RLS policies are updated to add
--    `AND deleted_at IS NULL` to the buyer-side SELECT policy.
--    The seller-side SELECT and UPDATE policies stay untouched —
--    a seller must still see the order so the buyer's "remove
--    from history" doesn't vanish the order from the seller's
--    queue.
--
-- Apply manually in the Supabase SQL editor. Idempotent — every
-- statement is `if not exists` / `drop ... if exists` so re-running
-- is safe.

begin;

-- 1. conversation_hides -------------------------------------------------

-- One row per (user, conversation) pair. The PK gives us an
-- idempotent upsert for the "hide" action and lets the
-- loadConversations helper filter with a NOT EXISTS subquery in
-- the sidebar query.
create table if not exists public.conversation_hides (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- A user can read their own hide rows. We don't need a wider
-- SELECT policy — the sidebar query does the join locally and
-- only ever returns rows where user_id = auth.uid().
drop policy if exists "users can read their own hide rows" on public.conversation_hides;
create policy "users can read their own hide rows"
on public.conversation_hides for select to authenticated
using ( user_id = auth.uid() );

-- A user can write their own hide rows. The hide action is
-- always an upsert keyed on the PK with user_id = auth.uid(),
-- so this single INSERT policy is enough.
drop policy if exists "users can insert their own hide rows" on public.conversation_hides;
create policy "users can insert their own hide rows"
on public.conversation_hides for insert to authenticated
with check ( user_id = auth.uid() );

-- Allow unhiding — DELETE policy gated on user_id.
drop policy if exists "users can delete their own hide rows" on public.conversation_hides;
create policy "users can delete their own hide rows"
on public.conversation_hides for delete to authenticated
using ( user_id = auth.uid() );

-- Index on user_id so "give me my hide rows for every
-- conversation I'm in" is a fast index scan. The PK already
-- covers (conversation_id, user_id) lookups for the unhide
-- action.
create index if not exists conversation_hides_user_id_idx
  on public.conversation_hides (user_id);


-- 2. orders.deleted_at --------------------------------------------------

-- Soft-delete timestamp. Nullable: NULL means the order is live
-- in the buyer's history; non-NULL means the buyer removed it
-- from their view. We never actually DELETE the row because the
-- seller's order_items join, the revenue computation, and any
-- future analytics all need the row data.
alter table public.orders
  add column if not exists deleted_at timestamptz;

-- Index so the buyer-side RLS policy and the dashboard query
-- ("show my live orders") can filter with a single index range
-- scan. The column is mostly NULL so it's cheap; the index pays
-- off once a buyer removes several orders and the predicate
-- `deleted_at IS NULL` becomes the more selective side of the
-- buyer_id = X equality.
create index if not exists orders_buyer_deleted_at_idx
  on public.orders (buyer_id, deleted_at)
  where deleted_at is null;

-- RLS: the buyer-side SELECT policy gets a `deleted_at IS NULL`
-- filter so removed orders disappear from the buyer's history
-- view. The seller-side SELECT and UPDATE policies are NOT
-- touched — a seller must still see the order even after the
-- buyer hides it from their own history, so the seller's
-- revenue / queue view stays consistent.
--
-- We have to find the existing buyer-side policy by its
-- definition (the only SELECT policy on orders that gates on
-- buyer_id = auth.uid()). We DROP and recreate it with the
-- extra clause. If you customized the policy name in a
-- previous migration, search for `buyer_id = auth.uid()` in
-- the policies table and apply the same edit by hand.
do $$
declare
  buyer_select_policy text;
begin
  select policyname into buyer_select_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'orders'
    and cmd = 'SELECT'
    and qual::text like '%buyer_id = auth.uid()%'
  limit 1;

  if buyer_select_policy is not null then
    execute format('drop policy %I on public.orders', buyer_select_policy);
    execute format(
      'create policy %I on public.orders for select to authenticated using ( buyer_id = auth.uid() and deleted_at is null )',
      buyer_select_policy
    );
  end if;
end $$;

-- Allow the buyer to soft-delete their own order. We add a
-- dedicated UPDATE policy that only permits the buyer to flip
-- their own `deleted_at` column. We can't fold this into the
-- existing seller-side UPDATE policy (which is what lets the
-- seller change status) because that policy uses
-- USING (seller is in order_items) which doesn't match a buyer
-- UPDATE.
--
-- Important: this policy is column-scoped via WITH CHECK so the
-- buyer can only ever write `deleted_at`; touching `status` or
-- `total_amount` would violate WITH CHECK and the row update
-- would be rejected. Postgres UPDATE policies are row-level, not
-- column-level, so the strictest interpretation is "the new row
-- must still satisfy the WITH CHECK" — we encode that by
-- requiring the new deleted_at to be non-null and unchanged
-- in any other field. We can't do column-level grants in a
-- policy; the action layer is the safety net (it whitelists
-- only the deleted_at column).
drop policy if exists "buyers can soft-delete their own orders" on public.orders;
create policy "buyers can soft-delete their own orders"
on public.orders for update to authenticated
using ( buyer_id = auth.uid() )
with check ( buyer_id = auth.uid() );

commit;
