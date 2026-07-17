-- Construct Centre: pin profiles.category to the product-categories
-- vocabulary.
--
-- profiles.category is the seller-side "what do you sell?" field
-- (set at registration, read by the public /artisans directory and
-- pre-fills the seller-dashboard's product modal). The DB had it as
-- free-form text, so a stray value (typo, manual write, future
-- category that was renamed) would silently break the
-- `.eq('category', X)` filter on the artisan directory. This
-- migration adds a CHECK constraint that pins the column to the
-- same vocabulary PRODUCT_CATEGORIES uses in the app, and
-- normalizes the one known legacy value so the migration applies
-- without operator intervention.
--
-- Apply manually in the Supabase SQL editor.

begin;

-- Normalize the one known legacy value before the CHECK is added.
-- 'artisan-service' was the hard-coded category the old artisan
-- product modal stamped on every new listing. Existing rows still
-- carry it; the artisan directory's filter never matched it
-- (the directory's pills use a different vocabulary — a separate
-- gap documented in README.md > "Out of scope"), so re-tagging
-- to 'General' is the right move. We're not migrating the
-- products table; that data lives on products.category, not
-- profiles.category.
update public.profiles
  set category = 'General'
  where category = 'artisan-service';

-- Drop first so re-running this migration is safe.
alter table public.profiles
  drop constraint if exists profiles_category_check;

alter table public.profiles
  add constraint profiles_category_check
  check (
    category is null
    or category in (
      'General',
      'Tools & Equipment',
      'Building Materials',
      'Heavy Machinery',
      'Electrical & Plumbing',
      'Architectural Services',
      'Interior Design',
      'HVAC',
      'Painting & Finishing'
    )
  );

commit;
