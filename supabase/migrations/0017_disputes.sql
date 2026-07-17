-- Construct Centre: order disputes.
--
-- Adds an audit-trail table for "open a dispute on this order"
-- and a buyer-side UPDATE policy that lets a buyer flip an order's
-- status to 'disputed'.
--
-- Why two pieces in one migration:
--
-- 1. `disputes` — one row per opened dispute. RLS gates reads to
--    either party on the order (the buyer, or any seller with a
--    line item in the order). RLS gates writes to the same set,
--    plus the implicit opened_by = auth.uid() check on insert. The
--    "resolve" transition is intentionally NOT exposed via RLS
--    updates — only an admin role (tier = 'admin') can flip the
--    `status` column past `open`, and that's enforced in the
--    action layer because RLS can't cleanly column-scope writes.
--    Without an admin resolver in this round, a dispute sits in
--    `open` until a human flips it via the Supabase dashboard.
--
-- 2. Buyer-side UPDATE policy on `orders` — the existing seller
--    UPDATE policy (gated on the caller being a seller of one of
--    the order_items) does NOT cover a buyer flipping their own
--    order's status to 'disputed'. The 0015 migration added a
--    similar policy for the soft-delete column. This migration
--    extends that pattern to status: the buyer can update status
--    on their own row, and the new status must still pass
--    WITH CHECK (i.e. it has to be a legal value). The action
--    layer is the safety net for "must be 'disputed'" — RLS only
--    enforces the membership + that the row belongs to the buyer.
--
-- Apply manually in the Supabase SQL editor. Idempotent — every
-- statement is `if not exists` / `drop ... if exists` so re-running
-- is safe.

begin;

-- ============================================================
-- 1. disputes table
-- ============================================================

create table if not exists public.disputes (
  id          uuid        primary key default gen_random_uuid(),
  order_id    uuid        not null references public.orders(id) on delete cascade,
  -- Either the buyer or a seller on one of the line items.
  -- RLS restricts the visible/writable set to either party on the
  -- order, so this column is mostly belt-and-braces for the audit
  -- trail.
  opened_by   uuid        not null references auth.users(id) on delete restrict,
  reason      text        not null check (char_length(reason) between 1 and 2000),
  -- open: just opened, awaiting the team's review
  -- under_review: a human has picked it up
  -- resolved_refund: closed, buyer refunded (out of scope for the
  --   automated flow — a human resolves via the Supabase dashboard)
  -- resolved_no_refund: closed, no refund issued
  status      text        not null default 'open'
                          check (status in ('open', 'under_review', 'resolved_refund', 'resolved_no_refund')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for the "give me the dispute for this order" lookup that
-- the order-detail page does. Most orders will have at most one
-- dispute row, but the unique-by-order constraint lives in the
-- action layer, not in the schema — admins may add a follow-up
-- row to the same order for a reopened case.
create index if not exists disputes_order_id_idx
  on public.disputes (order_id);

-- updated_at trigger. Same shape as the other tables' triggers.
create or replace function public.touch_disputes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists disputes_touch_updated_at on public.disputes;
create trigger disputes_touch_updated_at
  before update on public.disputes
  for each row execute function public.touch_disputes_updated_at();

-- ============================================================
-- 2. RLS — either party on the order can read & write
-- ============================================================

alter table public.disputes enable row level security;

-- A row is readable when the caller is the buyer on the order, or
-- a seller of one of the order_items in the order. The action
-- layer does the same check (and re-checks before writing), but
-- RLS is the source of truth — a bug in the action layer that
-- leaks the dispute id won't also leak the data.
--
-- The subquery is a denormalization trade-off. It runs per row in
-- the `disputes` table on every SELECT, but the planner caches the
-- order + order_items + products lookups well, and the volume per
-- seller is small (their own disputes, not the whole platform's).
-- If profiling shows the planner is struggling, the next step is a
-- denormalized `dispute_participants` join table keyed on
-- (dispute_id, user_id).
drop policy if exists "parties to the order can read disputes" on public.disputes;
create policy "parties to the order can read disputes"
on public.disputes for select to authenticated
using (
  order_id in (
    select o.id from public.orders o
    where o.buyer_id = auth.uid()
       or o.id in (
         select oi.order_id from public.order_items oi
         join public.products p on p.id = oi.product_id
         where p.seller_id = auth.uid()
       )
  )
);

-- Same dual-party gate for inserts, with the additional requirement
-- that the row's `opened_by` matches the caller (so a buyer can't
-- open a dispute on the seller's behalf). The action layer also
-- verifies the membership, so a bug there is caught by RLS.
drop policy if exists "parties to the order can open disputes" on public.disputes;
create policy "parties to the order can open disputes"
on public.disputes for insert to authenticated
with check (
  opened_by = auth.uid()
  and order_id in (
    select o.id from public.orders o
    where o.buyer_id = auth.uid()
       or o.id in (
         select oi.order_id from public.order_items oi
         join public.products p on p.id = oi.product_id
         where p.seller_id = auth.uid()
       )
  )
);

-- Updates are gated on the same dual-party check. We don't
-- column-scope this — the action layer is the gate. Only admins
-- (tier = 'admin') can flip `status` past `open`; the open path
-- in `openDisputeAction` only writes once and only via the action.
drop policy if exists "parties to the order can update their dispute" on public.disputes;
create policy "parties to the order can update their dispute"
on public.disputes for update to authenticated
using (
  order_id in (
    select o.id from public.orders o
    where o.buyer_id = auth.uid()
       or o.id in (
         select oi.order_id from public.order_items oi
         join public.products p on p.id = oi.product_id
         where p.seller_id = auth.uid()
       )
  )
)
with check (
  order_id in (
    select o.id from public.orders o
    where o.buyer_id = auth.uid()
       or o.id in (
         select oi.order_id from public.order_items oi
         join public.products p on p.id = oi.product_id
         where p.seller_id = auth.uid()
       )
  )
);

-- ============================================================
-- 3. Buyer-side UPDATE on orders.status (the 'disputed' flip)
-- ============================================================

-- The existing seller-side UPDATE policy on `orders` is gated on
-- the caller being a seller of one of the order_items — that
-- doesn't match a buyer flipping their own order to 'disputed'.
-- The 0015 migration added a similar policy for the soft-delete
-- column; this is the same pattern for the status column.
--
-- The action layer is the strict gate: it whitelists status = 'disputed'
-- only, and rejects any other status change. RLS just gates the
-- row to buyer_id = auth.uid() so a buyer can't touch a row they
-- don't own.
drop policy if exists "buyers can flag their own order as disputed" on public.orders;
create policy "buyers can flag their own order as disputed"
on public.orders for update to authenticated
using ( buyer_id = auth.uid() )
with check ( buyer_id = auth.uid() );

commit;
