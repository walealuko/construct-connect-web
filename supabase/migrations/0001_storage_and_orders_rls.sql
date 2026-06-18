-- Construct Hub: RLS policies for storage uploads and order updates.
--
-- Apply this in the Supabase SQL editor (Database → SQL Editor → New query).
-- Run as a single batch; if any policy already exists with the same name,
-- drop it first or rename in this file.
--
-- Tested against Supabase Postgres 15+.

-- ============================================================
-- 1. Storage: product-images bucket
-- ============================================================

-- Anyone authenticated can upload to product-images.
create policy "authenticated can upload product-images"
on storage.objects for insert to authenticated
with check ( bucket_id = 'product-images' );

-- Sellers can update their own uploads.
create policy "owners can update product-images"
on storage.objects for update to authenticated
using ( bucket_id = 'product-images' and owner = auth.uid() )
with check ( bucket_id = 'product-images' and owner = auth.uid() );

-- Sellers can delete their own uploads.
create policy "owners can delete product-images"
on storage.objects for delete to authenticated
using ( bucket_id = 'product-images' and owner = auth.uid() );

-- ============================================================
-- 2. Storage: artisan-portfolio bucket
-- ============================================================

create policy "authenticated can upload artisan-portfolio"
on storage.objects for insert to authenticated
with check ( bucket_id = 'artisan-portfolio' );

create policy "owners can update artisan-portfolio"
on storage.objects for update to authenticated
using ( bucket_id = 'artisan-portfolio' and owner = auth.uid() )
with check ( bucket_id = 'artisan-portfolio' and owner = auth.uid() );

create policy "owners can delete artisan-portfolio"
on storage.objects for delete to authenticated
using ( bucket_id = 'artisan-portfolio' and owner = auth.uid() );

-- ============================================================
-- 3. Public read on storage objects (so /storage/v1/object/public/* works)
--    The buckets themselves must be marked "Public" in the Supabase dashboard
--    (Storage → bucket → Settings → Public bucket ON) for this to apply.
-- ============================================================

create policy "public can read product-images"
on storage.objects for select to public
using ( bucket_id = 'product-images' );

create policy "public can read artisan-portfolio"
on storage.objects for select to public
using ( bucket_id = 'artisan-portfolio' );

-- ============================================================
-- 4. Orders: sellers can update orders containing their products
-- ============================================================

create policy "sellers can update orders with their products"
on public.orders for update to authenticated
using (
  exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = orders.id
      and p.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = orders.id
      and p.seller_id = auth.uid()
  )
);

-- ============================================================
-- 5. Profiles: users can upsert their own row
--    (matches the new updateProfile → upsert flow in app/actions/user.ts)
-- ============================================================

create policy "users can upsert their own profile"
on public.profiles for insert to authenticated
with check ( id = auth.uid() );

create policy "users can update their own profile"
on public.profiles for update to authenticated
using ( id = auth.uid() )
with check ( id = auth.uid() );

-- ============================================================
-- 6. Conversations + Messages: minimal access so chat works
-- ============================================================

create policy "participants can read their conversations"
on public.conversations for select to authenticated
using ( auth.uid() = any (participant_ids) );

create policy "participants can insert conversations"
on public.conversations for insert to authenticated
with check ( auth.uid() = any (participant_ids) );

create policy "participants can update their conversations"
on public.conversations for update to authenticated
using ( auth.uid() = any (participant_ids) )
with check ( auth.uid() = any (participant_ids) );

create policy "participants can read messages in their conversations"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() = any (c.participant_ids)
  )
);

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
-- ============================================================

create policy "sellers can read order_items for their products"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = order_items.product_id
      and p.seller_id = auth.uid()
  )
);

-- Anyone authenticated can create order_items (checkout inserts them).
create policy "authenticated can insert order_items"
on public.order_items for insert to authenticated
with check ( true );

-- Orders: a seller can read orders containing their products.
create policy "sellers can read orders with their products"
on public.orders for select to authenticated
using (
  exists (
    select 1 from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = orders.id
      and p.seller_id = auth.uid()
  )
);
