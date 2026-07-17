-- Construct Centre: let buyers insert their own orders.
--
-- Apply manually in the Supabase SQL editor. Idempotent — every policy
-- is preceded by `drop policy if exists` so re-running this migration
-- is safe.
--
-- Why this exists:
-- 0001_storage_and_orders_rls.sql ships SELECT and UPDATE policies on
-- `public.orders` (and the matching SELECT/INSERT policies on
-- `order_items`) but no INSERT policy on `orders` itself. The
-- checkout flow (app/checkout/page.tsx:48) inserts a row with
-- `buyer_id = auth.uid(), status = 'pending'` and then attaches
-- `order_items`. Without an INSERT policy on `orders`, that first
-- insert is rejected with
--   "new row violates row-level security policy for table 'orders'"
-- and the buyer can never reach Paystack. Adding `buyer_id = auth.uid()`
-- as the WITH CHECK restores the intended behavior: anyone signed in
-- can create a new order, but only in their own name.

begin;

drop policy if exists "buyers can insert their own orders" on public.orders;
create policy "buyers can insert their own orders"
on public.orders for insert to authenticated
with check ( buyer_id = auth.uid() );

commit;
