-- Construct Centre: RLS policies for storage uploads and order updates.
--
-- Apply this in the Supabase SQL editor (Database → SQL Editor → New query).
-- Run as a single batch; this file is idempotent (every policy is preceded
-- by `drop policy if exists`) so it's safe to re-run.
--
-- Tested against Supabase Postgres 15+.

-- ============================================================
-- 0. Helper functions used by the orders / order_items policies
--    below. Defined first so the policies can reference them
--    regardless of textual order — `create policy` evaluates the
--    expression at creation time, so the function must already
--    exist on a fresh database.
--
--    These helpers break the orders ↔ order_items RLS recursion
--    cycle. The pre-existing policies on those two tables each
--    reference the other via `exists(...)` subqueries, which
--    Postgres rejects at query time with "infinite recursion
--    detected in policy for relation 'orders'". The functions
--    run as the function owner (SECURITY DEFINER) and bypass RLS
--    on the inner reads; security is preserved because each
--    helper compares against `auth.uid()`, so it can only confirm
--    ownership for the current user.
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
-- 1. Storage: product-images bucket
-- ============================================================

drop policy if exists "authenticated can upload product-images" on storage.objects;
create policy "authenticated can upload product-images"
on storage.objects for insert to authenticated
with check ( bucket_id = 'product-images' );

drop policy if exists "owners can update product-images" on storage.objects;
create policy "owners can update product-images"
on storage.objects for update to authenticated
using ( bucket_id = 'product-images' and owner = auth.uid() )
with check ( bucket_id = 'product-images' and owner = auth.uid() );

drop policy if exists "owners can delete product-images" on storage.objects;
create policy "owners can delete product-images"
on storage.objects for delete to authenticated
using ( bucket_id = 'product-images' and owner = auth.uid() );

-- ============================================================
-- 2. Storage: artisan-portfolio bucket
-- ============================================================

drop policy if exists "authenticated can upload artisan-portfolio" on storage.objects;
create policy "authenticated can upload artisan-portfolio"
on storage.objects for insert to authenticated
with check ( bucket_id = 'artisan-portfolio' );

drop policy if exists "owners can update artisan-portfolio" on storage.objects;
create policy "owners can update artisan-portfolio"
on storage.objects for update to authenticated
using ( bucket_id = 'artisan-portfolio' and owner = auth.uid() )
with check ( bucket_id = 'artisan-portfolio' and owner = auth.uid() );

drop policy if exists "owners can delete artisan-portfolio" on storage.objects;
create policy "owners can delete artisan-portfolio"
on storage.objects for delete to authenticated
using ( bucket_id = 'artisan-portfolio' and owner = auth.uid() );

-- ============================================================
-- 3. Public read on storage objects (so /storage/v1/object/public/* works)
--    The buckets themselves must be marked "Public" in the Supabase dashboard
--    (Storage → bucket → Settings → Public bucket ON) for this to apply.
--    SELECT policies with USING (true) are intentionally permitted here —
--    the buckets are public by design and the lint rule excludes SELECT.
-- ============================================================

drop policy if exists "public can read product-images" on storage.objects;
create policy "public can read product-images"
on storage.objects for select to public
using ( bucket_id = 'product-images' );

drop policy if exists "public can read artisan-portfolio" on storage.objects;
create policy "public can read artisan-portfolio"
on storage.objects for select to public
using ( bucket_id = 'artisan-portfolio' );

-- ============================================================
-- 4. Orders: sellers can update orders containing their products
--
-- All cross-table checks on the orders / order_items pair go
-- through SECURITY DEFINER helper functions (defined in section 0)
-- so the planner never has to re-evaluate orders' policies from
-- inside order_items' (or vice versa). Without the helpers the
-- two policies form a recursion cycle that Postgres rejects at
-- query time with "infinite recursion detected in policy for
-- relation 'orders'".
-- ============================================================

drop policy if exists "sellers can update orders with their products" on public.orders;
create policy "sellers can update orders with their products"
on public.orders for update to authenticated
using ( public.is_seller_of_order(orders.id) )
with check ( public.is_seller_of_order(orders.id) );

-- ============================================================
-- 5. Profiles: users can upsert their own row
--    (matches the new updateProfile → upsert flow in app/actions/user.ts)
-- ============================================================

drop policy if exists "users can upsert their own profile" on public.profiles;
create policy "users can upsert their own profile"
on public.profiles for insert to authenticated
with check ( id = auth.uid() );

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
on public.profiles for update to authenticated
using ( id = auth.uid() )
with check ( id = auth.uid() );

-- ============================================================
-- 6. Conversations + Messages: minimal access so chat works
--
-- Conversations are created with both participants at insert time and
-- are never updated afterwards (the app code only inserts/selects).
-- We intentionally do NOT add an UPDATE policy on conversations — any
-- participant being able to mutate the row (e.g. add themselves to
-- someone else's conversation) is too permissive. If conversation
-- metadata (title, last-read) becomes editable later, restrict the
-- UPDATE policy to a created_by column or drop it entirely.
-- ============================================================

drop policy if exists "participants can read their conversations" on public.conversations;
create policy "participants can read their conversations"
on public.conversations for select to authenticated
using ( auth.uid() = any (participant_ids) );

drop policy if exists "participants can insert conversations" on public.conversations;
create policy "participants can insert conversations"
on public.conversations for insert to authenticated
with check ( auth.uid() = any (participant_ids) );

drop policy if exists "participants can read messages in their conversations" on public.messages;
create policy "participants can read messages in their conversations"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() = any (c.participant_ids)
  )
);

drop policy if exists "participants can insert messages in their conversations" on public.messages;
create policy "participants can insert messages in their conversations"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() = any (c.participant_ids)
  )
);

-- ============================================================
-- 7. Order items: a seller can read rows for their products (so the
--    seller dashboard can join and show which buyer ordered what).
--    Buyers can only insert line items into their OWN orders, never
--    another buyer's order. quantity must be positive and the product
--    must exist. Stock enforcement lives in the app layer (RLS can't
--    express atomic decrement).
--
-- Every cross-table check goes through a SECURITY DEFINER helper
-- (defined in section 0) so the orders / order_items policies
-- don't form a recursion cycle (orders reads order_items;
-- order_items reads orders).
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

-- Order_items: buyers can insert into their own orders, only for
-- products that exist, and only with a positive quantity.
drop policy if exists "buyers can insert order_items for their own orders" on public.order_items;
create policy "buyers can insert order_items for their own orders"
on public.order_items for insert to authenticated
with check (
  quantity > 0
  and public.is_buyer_of_order(order_items.order_id)
  and public.product_exists(order_items.product_id)
);

-- Orders: sellers can read orders containing their products.
drop policy if exists "sellers can read orders with their products" on public.orders;
create policy "sellers can read orders with their products"
on public.orders for select to authenticated
using ( public.is_seller_of_order(orders.id) );

-- Orders: buyers can read their own.
drop policy if exists "buyers can read their own orders" on public.orders;
create policy "buyers can read their own orders"
on public.orders for select to authenticated
using ( buyer_id = auth.uid() );

-- Orders: buyers can create their own orders. The checkout flow
-- (app/checkout/page.tsx) inserts a row with `buyer_id = auth.uid()`
-- and `status = 'pending'`, then attaches `order_items`. Without this
-- policy the orders insert is rejected with
-- "new row violates row-level security policy for table 'orders'"
-- and the buyer can never reach Paystack. The flat buyer_id check
-- is non-recursive, so no helper is needed.
drop policy if exists "buyers can insert their own orders" on public.orders;
create policy "buyers can insert their own orders"
on public.orders for insert to authenticated
with check ( buyer_id = auth.uid() );
