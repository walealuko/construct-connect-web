-- Construct Hub: one-shot fix for the orders RLS errors.
--
-- HOW TO USE
-- ----------
-- Paste the ENTIRE contents of this file into the Supabase SQL
-- editor (Database → SQL Editor → New query) and click Run.
--
-- Every statement is idempotent: helper functions use
-- `create or replace function`, and every policy is preceded
-- by `drop policy if exists`. Re-running this file is safe.
--
-- DO NOT just paste the comment block at the top of this file.
-- The comment block describes what the SQL below does — it is
-- not itself runnable SQL.
--
-- WHY THIS FILE EXISTS
-- --------------------
-- Three things need to be true for the checkout flow
-- (app/checkout/page.tsx) to work end to end:
--
--   1. A buyer can INSERT into public.orders.
--   2. A buyer can INSERT into public.order_items, with the line
--      item pointing at their own order.
--   3. The orders / order_items policies don't form a recursion
--      cycle that Postgres rejects at query time.
--
-- The earlier migrations (0001, 0007, 0008) each fix one of
-- those, but they are split across multiple files and easy to
-- skip. This file bundles the minimum required to fix all
-- three. If you have not yet applied 0001, 0007, or 0008, you
-- can use this file INSTEAD — running the whole thing once
-- gets the database to a consistent state.
--
-- If you have already applied some of those files, that's
-- fine: every statement here is idempotent.

begin;

-- ============================================================
-- 1. Helper functions used by the orders / order_items policies
--    below. Defined first so the policies can reference them
--    regardless of textual order — `create policy` evaluates
--    the expression at creation time, so the function must
--    already exist on a fresh database.
--
--    These helpers break the orders ↔ order_items RLS
--    recursion cycle. The pre-existing policies on those two
--    tables each reference the other via `exists(...)`
--    subqueries, which Postgres rejects at query time with
--    "infinite recursion detected in policy for relation
--    'orders'". The functions run as the function owner
--    (SECURITY DEFINER) and bypass RLS on the inner reads;
--    security is preserved because each helper compares
--    against `auth.uid()`, so it can only confirm ownership
--    for the current user.
-- ============================================================

create or replace function public.is_buyer_of_order(_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.orders
    where id = _order_id
      and buyer_id = auth.uid()
  );
$$;

grant execute on function public.is_buyer_of_order(uuid) to authenticated;

create or replace function public.is_seller_of_order(_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = _order_id
      and p.seller_id = auth.uid()
  );
$$;

grant execute on function public.is_seller_of_order(uuid) to authenticated;

create or replace function public.is_seller_of_product(_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.products
    where id = _product_id
      and seller_id = auth.uid()
  );
$$;

grant execute on function public.is_seller_of_product(uuid) to authenticated;

create or replace function public.product_exists(_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.products
    where id = _product_id
  );
$$;

grant execute on function public.product_exists(uuid) to authenticated;

-- ============================================================
-- 2. Order_items policies (helpers above keep them non-recursive).
-- ============================================================

-- Order_items: sellers can read rows for their products.
drop policy if exists "sellers can read order_items for their products" on public.order_items;
create policy "sellers can read order_items for their products"
on public.order_items for select to authenticated
using ( public.is_seller_of_product(order_items.product_id) );

-- Order_items: buyers can read their own.
drop policy if exists "buyers can read their own order_items" on public.order_items;
create policy "buyers can read their own order_items"
on public.order_items for select to authenticated
using ( public.is_buyer_of_order(order_items.order_id) );

-- Order_items: buyers can insert into their own orders, only
-- for products that exist, and only with a positive quantity.
drop policy if exists "buyers can insert order_items for their own orders" on public.order_items;
create policy "buyers can insert order_items for their own orders"
on public.order_items for insert to authenticated
with check (
  quantity > 0
  and public.is_buyer_of_order(order_items.order_id)
  and public.product_exists(order_items.product_id)
);

-- ============================================================
-- 3. Orders policies.
-- ============================================================

-- Orders: sellers can read orders containing their products.
drop policy if exists "sellers can read orders with their products" on public.orders;
create policy "sellers can read orders with their products"
on public.orders for select to authenticated
using ( public.is_seller_of_order(orders.id) );

-- Orders: sellers can update orders containing their products.
-- USING  — must already have a relationship to update the row.
-- WITH CHECK — must still have a relationship after the update,
-- so a seller can't "transfer" the order to themselves by
-- rewriting order_items (a deeper invariant not solved here).
drop policy if exists "sellers can update orders with their products" on public.orders;
create policy "sellers can update orders with their products"
on public.orders for update to authenticated
using ( public.is_seller_of_order(orders.id) )
with check ( public.is_seller_of_order(orders.id) );

-- Orders: buyers can read their own.
drop policy if exists "buyers can read their own orders" on public.orders;
create policy "buyers can read their own orders"
on public.orders for select to authenticated
using ( buyer_id = auth.uid() );

-- Orders: buyers can create their own orders. The checkout
-- flow (app/checkout/page.tsx) inserts a row with
-- `buyer_id = auth.uid(), status = 'pending'`, then attaches
-- order_items. Without this policy the orders insert is rejected
-- with
--   "new row violates row-level security policy for table 'orders'"
-- and the buyer can never reach Paystack. The flat `buyer_id`
-- check is non-recursive, so no helper is needed.
drop policy if exists "buyers can insert their own orders" on public.orders;
create policy "buyers can insert their own orders"
on public.orders for insert to authenticated
with check ( buyer_id = auth.uid() );

commit;
