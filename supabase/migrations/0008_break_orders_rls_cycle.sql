-- Construct Centre: break the orders ↔ order_items RLS recursion cycle.
--
-- Apply manually in the Supabase SQL editor. Idempotent — every
-- function is created with `create or replace`, and every policy
-- is preceded by `drop policy if exists`, so re-running this
-- migration is safe.
--
-- Why this exists:
-- The pre-existing policies on `orders` and `order_items` form a
-- recursion cycle that Postgres only surfaces when both sides are
-- actually exercised together. The trigger was the new
-- `buyers can insert their own orders` policy from 0007 — without
-- that, the orders INSERT failed immediately and the order_items
-- subquery was never reached. Now the checkout flow can:
--
--   1. INSERT into orders                       (allowed)
--   2. INSERT into order_items, whose WITH CHECK
--      does exists(select from orders ...)      (would recurse)
--   3. SELECT the order again                   (also recurses)
--
-- The cycle:
--   orders SELECT (sellers)        → reads order_items
--   order_items SELECT (buyers)    → reads orders
--   ... → back to orders SELECT
--
-- Fix: replace the cross-table subqueries with SECURITY DEFINER
-- helper functions. The functions run as the function owner and
-- bypass RLS on the inner reads, so the planner never has to
-- re-evaluate orders' policies from inside order_items' (or vice
-- versa). Security is preserved because each function compares
-- against `auth.uid()` — so the helper can only confirm
-- ownership for the *current* user, even though it sees all rows.
--
-- The four helpers cover every cross-table check on the
-- orders / order_items pair. (Signatures below are documentation
-- only — copy each `create or replace function` block from the
-- SQL body further down; do NOT paste these lines into the
-- editor as-is, they are inside a comment.)
--
--   1. is_buyer_of_order(_order_id)        -> boolean
--      Used in: order_items SELECT (buyers),
--               order_items INSERT (buyers).
--
--   2. is_seller_of_order(_order_id)       -> boolean
--      Used in: orders SELECT (sellers),
--               orders UPDATE (sellers).
--
--   3. is_seller_of_product(_product_id)   -> boolean
--      Used in: order_items SELECT (sellers).
--
--   4. product_exists(_product_id)         -> boolean
--      Used in: order_items INSERT (buyers). The previous policy
--      used `exists(select from products where id = ...)`. The
--      subquery itself isn't recursive, but routing it through
--      a SECURITY DEFINER helper keeps every cross-table check
--      in this migration consistent and avoids any future
--      policy on `products` from re-introducing a cycle.
--
-- The INSERT policy on orders (from 0007) is a flat
-- `buyer_id = auth.uid()` check — no subquery, no recursion.
-- That's left alone.

begin;

-- ============================================================
-- 1. Helper functions (SECURITY DEFINER, stable, no RLS on reads)
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
-- 2. Replace the cyclic policies
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

-- Order_items: buyers can insert line items into their own
-- orders. quantity must be > 0, the order must belong to the
-- buyer, and the product must exist.
drop policy if exists "buyers can insert order_items for their own orders" on public.order_items;
create policy "buyers can insert order_items for their own orders"
on public.order_items for insert to authenticated
with check (
  quantity > 0
  and public.is_buyer_of_order(order_items.order_id)
  and public.product_exists(order_items.product_id)
);

commit;
