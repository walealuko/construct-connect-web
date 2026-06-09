-- Seed data for Construct Hub

-- 1. Seed Profiles (Sellers and Individuals)
-- Note: Using random UUIDs. In a real scenario, these would match auth.users.
-- Since we are seeding the 'profiles' table directly, we'll use a few static UUIDs.

INSERT INTO public.profiles (id, first_name, last_name, email, phone, tier, business_name, business_type, location)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'John', 'Doe', 'seller1@example.com', '08011122233', 'business', 'Apex Construction Supplies', 'company', 'Lagos'),
  ('00000000-0000-0000-0000-000000000002', 'Jane', 'Smith', 'seller2@example.com', '08044455566', 'business', 'Quality Bricks & Co', 'partnership', 'Abuja'),
  ('00000000-0000-0000-0000-000000000003', 'Michael', 'Brown', 'user1@example.com', '08077788899', 'individual', NULL, NULL, 'Port Harcourt');

-- 2. Seed Products
-- We assume the 'products' table has denormalized seller info for the marketplace view,
-- or the user is using a view. If it's a table, we insert into these columns.

INSERT INTO public.products (name, description, price, category, image_url, seller_id, seller_name, seller_location, location)
VALUES
  ('Premium Portland Cement', 'High-strength cement for all construction needs. 50kg bag.', 6500.00, 'cement', 'https://images.unsplash.com/photo-1518709760261-977aC7377287?q=80&w=400', '00000000-0000-0000-0000-000000000001', 'Apex Construction Supplies', 'Lagos', 'Lagos'),
  ('Red Clay Bricks', 'Durable and heat-resistant red clay bricks. Price per 100 units.', 12000.00, 'bricks', 'https://images.unsplash.com/photo-1584622660105-855577a32706?q=80&w=400', '00000000-0000-0000-0000-000000000002', 'Quality Bricks & Co', 'Abuja', 'Abuja'),
  ('Treated Hardwood Timber', 'Sustainably sourced treated timber for roofing and flooring. 12ft plank.', 4500.00, 'timber', 'https://images.unsplash.com/photo-1516533075015-4c6546766d93?q=80&w=400', '00000000-0000-0000-0000-000000000001', 'Apex Construction Supplies', 'Lagos', 'Lagos'),
  ('Professional Drill Set', 'Cordless power drill with 20 interchangeable bits.', 25000.00, 'tools', 'https://images.unsplash.com/photo-1581235725876-7775737199a3?q=80&w=400', '00000000-0000-0000-0000-000000000001', 'Apex Construction Supplies', 'Lagos', 'Lagos'),
  ('Electrical Wiring Kit', 'Complete home wiring kit including switches and conduits.', 15000.00, 'electrical', 'https://images.unsplash.com/photo-1558389403-cC66a62626b6?q=80&w=400', '00000000-0000-0000-0000-000000000002', 'Quality Bricks & Co', 'Abuja', 'Abuja'),
  ('PVC Plumbing Pipes', 'High-grade PVC pipes for drainage and water supply. 6m length.', 3200.00, 'plumbing', 'https://images.unsplash.com/photo-1581094260635-67fbbff7077a?q=80&w=400', '00000000-0000-0000-0000-000000000001', 'Apex Construction Supplies', 'Lagos', 'Lagos'),
  ('Weather-Proof Exterior Paint', 'Premium white exterior paint. 20L bucket.', 18000.00, 'paint', 'https://images.unsplash.com/photo-1562607531-f59894f30631?q=80&w=400', '00000000-0000-0000-0000-000000000002', 'Quality Bricks & Co', 'Abuja', 'Abuja'),
  ('Corrugated Aluminum Sheets', 'Durable roofing sheets for industrial and residential use.', 7500.00, 'roofing', 'https://images.unsplash.com/photo-160058PZ-S-dummy?q=80&w=400', '00000000-0000-0000-0000-000000000001', 'Apex Construction Supplies', 'Lagos', 'Lagos'),
  ('Oak Wood Flooring Planks', 'Luxury oak flooring for modern interiors. per sq m.', 9000.00, 'flooring', 'https://images.unsplash.com/photo-1581814344855-61397211f362?q=80&w=400', '00000000-0000-0000-0000-000000000002', 'Quality Bricks & Co', 'Abuja', 'Abuja'),
  ('Heavy Duty Wheelbarrow', 'Steel reinforced wheelbarrow for construction sites.', 35000.00, 'general', 'https://images.unsplash.com/photo-1590487988256-9fb5e82877d9?q=80&w=400', '00000000-0000-0000-0000-000000000001', 'Apex Construction Supplies', 'Lagos', 'Lagos');
