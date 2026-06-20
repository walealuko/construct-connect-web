-- Construct Hub: switch products.image_url (single) to products.images (array).
--
-- Apply manually in the Supabase SQL editor (Database → SQL Editor → New query).
-- The migration is one transaction; if any step fails, the whole thing rolls
-- back so the table isn't left in a half-migrated state.
--
-- Backfill rule: every existing non-null image_url is wrapped into a single-
-- element array so it becomes images[0] (the primary). Rows with no image
-- remain an empty array; the products_images_not_empty check constraint
-- will REJECT them, so the user must clean those rows up before running.
-- Run this query first to see if any rows would be rejected:
--
--   select id, name, image_url from public.products
--   where image_url is null or image_url = '';
--
-- Either delete those rows, or set image_url to a placeholder before this
-- migration.

begin;

-- 1. Add the new column with a safe default so existing rows are valid
--    immediately. NOT NULL + default '{}' means no row can ever be in a
--    "no images" half-state.
alter table public.products
  add column if not exists images text[] not null default '{}';

-- 2. Backfill: for every row that currently has a non-null image_url,
--    copy it into the new array. Wrapping in ARRAY[...] makes the legacy
--    value become images[0] (the primary).
update public.products
  set images = array[image_url]
  where image_url is not null
    and images = '{}'::text[];

-- 3. Drop the old column. Now images is the only source of truth.
alter table public.products
  drop column image_url;

-- 4. Constrain length so a runaway client can't insert 10,000 images.
alter table public.products
  add constraint products_images_length_max
  check (cardinality(images) <= 10);

-- 5. Require at least one image at the DB layer too. Belt-and-braces
--    with the application validation in app/actions/products.ts.
alter table public.products
  add constraint products_images_not_empty
  check (cardinality(images) >= 1);

commit;

-- After running, regenerate the TypeScript types:
--   npx supabase gen types typescript --project-id <id> > types/supabase.ts