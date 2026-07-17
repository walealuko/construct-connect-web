-- Construct Centre: diagnostic query — what's currently on the orders / order_items tables?
--
-- This is a SELECT-only query. Run it in the Supabase SQL editor; it
-- will not change anything. The result tells you which RLS policies
-- are currently in effect on `public.orders` and `public.order_items`,
-- plus whether RLS itself is enabled on those tables.
--
-- What to look for:
--   - You need at least these policies on public.orders:
--       * "buyers can insert their own orders"          (FOR INSERT)
--       * "buyers can read their own orders"            (FOR SELECT)
--       * "sellers can read orders with their products" (FOR SELECT)
--       * "sellers can update orders with their products" (FOR UPDATE)
--   - You need at least these policies on public.order_items:
--       * "buyers can insert order_items for their own orders" (FOR INSERT)
--       * "buyers can read their own order_items"     (FOR SELECT)
--       * "sellers can read order_items for their products" (FOR SELECT)
--   - You also need these helper functions in the public schema:
--       * is_buyer_of_order(uuid)
--       * is_seller_of_order(uuid)
--       * is_seller_of_product(uuid)
--       * product_exists(uuid)
--   - Both tables must have `rowsecurity = true`.
--
-- If anything is missing, apply 0009_orders_rls_one_shot.sql.

select
  n.nspname as schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('orders', 'order_items')
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('orders', 'order_items')
order by tablename, policyname;

select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_buyer_of_order',
    'is_seller_of_order',
    'is_seller_of_product',
    'product_exists'
  )
order by p.proname;