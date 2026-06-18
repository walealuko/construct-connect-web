-- Construct Hub: add `portfolio` column to profiles for artisan gallery.
--
-- Apply in Supabase SQL editor (Database → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS via the ADD COLUMN check below.
--
-- The artisan dashboard's portfolio upload feature stores the bare file
-- path in profiles.portfolio as a text[] of public-bucket paths.

alter table public.profiles
  add column if not exists portfolio text[] not null default '{}';

-- RLS: a user can read and update their own portfolio.
-- INSERT/UPDATE/SELECT on their own row is already covered by the
-- "users can upsert their own profile" and "users can update their own
-- profile" policies in 0001_storage_and_orders_rls.sql — no new policies
-- needed.
