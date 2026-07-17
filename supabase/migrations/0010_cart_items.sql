-- Construct Centre: persistent cart storage.
--
-- Until now, the cart lived in localStorage only. A guest who filled
-- a cart and then signed in lost it; the same person on phone and
-- laptop saw two different carts. This migration adds a server-side
-- cart table that survives both.
--
-- HOW TO USE
-- ----------
-- Paste the ENTIRE contents of this file into the Supabase SQL
-- editor (Database → SQL Editor → New query) and click Run.
--
-- Every statement is idempotent: the table creation uses
-- `if not exists`, every policy is preceded by `drop policy if exists`,
-- and the helper function uses `create or replace function`.
-- Re-running this file is safe.
--
-- DO NOT just paste the comment block at the top of this file.
-- The comment block describes what the SQL below does — it is
-- not itself runnable SQL.
--
-- WHY THIS TABLE
-- --------------
-- One row per (user, product) pair. The composite primary key makes
-- "user has 2 of product X" a single row, which:
--   - matches the localStorage shape (also one entry per product),
--   - makes `upsert` semantics trivial (insert or update on conflict),
--   - and prevents the duplicate-row bugs that a surrogate key would
--     invite.
--
-- RLS is self-only: a user can read/write only their own cart rows.
-- Anonymous users have no access (the cart is per-user, and there's
-- no concept of a guest cart in the database — the guest cart stays
-- in localStorage and merges into the server cart on sign-in).
--
-- Stock validation lives in the application layer, not in a CHECK
-- constraint. The cart may temporarily contain a quantity higher
-- than the product's available stock (the user is browsing, not
-- buying). The checkout flow validates stock before placing the
-- order. A DB-level check would make the cart too strict for
-- legitimate browsing.

begin;

-- ============================================================
-- 1. The table itself.
-- ============================================================

create table if not exists public.cart_items (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  product_id  uuid        not null references public.products(id) on delete cascade,
  quantity    int         not null check (quantity > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ============================================================
-- 2. updated_at trigger. Same shape as other tables in the app
--    so we can reason about them uniformly.
-- ============================================================

create or replace function public.touch_cart_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cart_items_touch_updated_at on public.cart_items;
create trigger cart_items_touch_updated_at
  before update on public.cart_items
  for each row execute function public.touch_cart_items_updated_at();

-- ============================================================
-- 3. RLS policies — self-only CRUD for authenticated users.
-- ============================================================

alter table public.cart_items enable row level security;

drop policy if exists "users can read their own cart" on public.cart_items;
create policy "users can read their own cart"
on public.cart_items for select to authenticated
using ( user_id = auth.uid() );

drop policy if exists "users can insert into their own cart" on public.cart_items;
create policy "users can insert into their own cart"
on public.cart_items for insert to authenticated
with check ( user_id = auth.uid() );

drop policy if exists "users can update their own cart" on public.cart_items;
create policy "users can update their own cart"
on public.cart_items for update to authenticated
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

drop policy if exists "users can delete from their own cart" on public.cart_items;
create policy "users can delete from their own cart"
on public.cart_items for delete to authenticated
using ( user_id = auth.uid() );

commit;
