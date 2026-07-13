-- Comprehensive Seed Data for Construct Hub
-- This script populates both profiles (Sellers/Buyers) and the products marketplace.

-- 1. Clear existing data to avoid duplicates (Optional, use with caution)
-- TRUNCATE public.products CASCADE;
-- TRUNCATE public.profiles CASCADE;

-- 2. Seed Profiles
-- IDs are static UUIDs to maintain consistent relationships in this seed.
INSERT INTO public.profiles (id, first_name, last_name, email, phone, tier, business_name, business_type, location)
VALUES
  -- Sellers (Business Tier)
  ('11111111-1111-1111-1111-111111111111', 'Ade', 'Okonkwo', 'apex@example.com', '08011122233', 'business', 'Apex Construction Supplies', 'company', 'Lagos'),
  ('22222222-2222-2222-2222-222222222222', 'Bisi', 'Adeyemi', 'quality@example.com', '08044455566', 'business', 'Quality Bricks & Co', 'partnership', 'Abuja'),
  ('33333333-3333-3333-3333-333333333333', 'Chioma', 'Eze', 'timberland@example.com', '08077788899', 'business', 'Timberland Woodworks', 'sole_proprietor', 'Enugu'),
  ('44444444-4444-4444-4444-444444444444', 'David', 'Suleiman', 'powertools@example.com', '08099900011', 'business', 'PowerTool Pro', 'company', 'Kano'),
  ('55555555-5555-5555-5555-555555555555', 'Efe', 'Omosa', 'finishing@example.com', '08022233344', 'business', 'Elite FinishingTouch', 'company', 'Port Harcourt'),

  -- Buyers (Individual Tier)
  ('66666666-6666-6666-6666-666666666666', 'Frank', 'Uche', 'frank@example.com', '08033344455', 'individual', NULL, NULL, 'Lagos'),
  ('77777777-7777-7777-7777-777777777777', 'Grace', 'Akin', 'grace@example.com', '08055566677', 'individual', NULL, NULL, 'Ibadan'),
  ('88888888-8888-8888-8888-888888888888', 'Hassan', 'Musa', 'hassan@example.com', '08077799900', 'individual', NULL, NULL, 'Kaduna'),
  ('99999999-9999-9999-9999-999999999999', 'Ike', 'Opara', 'ike@example.com', '08088811122', 'individual', NULL, NULL, 'Owerri'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Joy', 'Ibrahim', 'joy@example.com', '08066677788', 'individual', NULL, NULL, 'Sokoto');

-- 3. Seed Products
-- Note: We denormalize seller_name and seller_location for the marketplace view as per the project requirements.

INSERT INTO public.products (name, description, price, category, images, seller_id, seller_name, seller_location, location, stock, created_at)
VALUES
  -- Apex Construction Supplies (Lagos)
  ('Premium Portland Cement', 'High-strength cement for all construction needs. 50kg bag.', 6500.00, 'cement', ARRAY['https://images.unsplash.com/photo-1518709760261-977aC7377287?q=80&w=400'], '11111111-1111-1111-1111-111111111111', 'Apex Construction Supplies', 'Lagos', 'Lagos', 100, NOW()),
  ('Heavy Duty Wheelbarrow', 'Steel reinforced wheelbarrow for construction sites.', 35000.00, 'general', ARRAY['https://images.unsplash.com/photo-1590487988256-9fb5e82877d9?q=80&w=400'], '11111111-1111-1111-1111-111111111111', 'Apex Construction Supplies', 'Lagos', 'Lagos', 15, NOW()),
  ('PVC Plumbing Pipes', 'High-grade PVC pipes for drainage and water supply. 6m length.', 3200.00, 'plumbing', ARRAY['https://images.unsplash.com/photo-1581094260635-67fbbff7077a?q=80&w=400'], '11111111-1111-1111-1111-111111111111', 'Apex Construction Supplies', 'Lagos', 'Lagos', 50, NOW()),
  ('Industrial Concrete Mixer', 'Electric concrete mixer with 200L capacity.', 450000.00, 'tools', ARRAY['https://images.unsplash.com/photo-1581235725876-7775737199a3?q=80&w=400'], '11111111-1111-1111-1111-111111111111', 'Apex Construction Supplies', 'Lagos', 'Lagos', 2, NOW()),

  -- Quality Bricks & Co (Abuja)
  ('Red Clay Bricks', 'Durable and heat-resistant red clay bricks. Price per 100 units.', 12000.00, 'bricks', ARRAY['https://images.unsplash.com/photo-1584622660105-855577a32706?q=80&w=400'], '22222222-2222-2222-2222-222222222222', 'Quality Bricks & Co', 'Abuja', 'Abuja', 500, NOW()),
  ('Interlocking Paving Stones', 'High-quality concrete pavers for driveways and patios.', 8000.00, 'bricks', ARRAY['https://images.unsplash.com/photo-1584622660105-855577a32706?q=80&w=400'], '22222222-2222-2222-2222-222222222222', 'Quality Bricks & Co', 'Abuja', 'Abuja', 1000, NOW()),
  ('Electrical Wiring Kit', 'Complete home wiring kit including switches and conduits.', 15000.00, 'electrical', ARRAY['https://images.unsplash.com/photo-1558389403-cC66a62626b6?q=80&w=400'], '22222222-2222-2222-2222-222222222222', 'Quality Bricks & Co', 'Abuja', 'Abuja', 20, NOW()),
  ('Weather-Proof Exterior Paint', 'Premium white exterior paint. 20L bucket.', 18000.00, 'paint', ARRAY['https://images.unsplash.com/photo-1562607531-f59894f30631?q=80&w=400'], '22222222-2222-2222-2222-222222222222', 'Quality Bricks & Co', 'Abuja', 'Abuja', 30, NOW()),

  -- Timberland Woodworks (Enugu)
  ('Treated Hardwood Timber', 'Sustainably sourced treated timber for roofing and flooring. 12ft plank.', 4500.00, 'timber', ARRAY['https://images.unsplash.com/photo-1572731269670-eb52b03d0124?q=80&w=400'], '33333333-3333-3333-3333-333333333333', 'Timberland Woodworks', 'Enugu', 'Enugu', 80, NOW()),
  ('Mahogany Door Frame', 'Premium carved mahogany door frame for luxury homes.', 45000.00, 'timber', ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400'], '33333333-3333-3333-3333-333333333333', 'Timberland Woodworks', 'Enugu', 'Enugu', 5, NOW()),
  ('Plywood Sheets', 'High-grade structural plywood sheets. 4ft x 8ft.', 12000.00, 'timber', ARRAY['https://images.unsplash.com/photo-1611288875785-f9d4d9c2c1f5?q=80&w=400'], '33333333-3333-3333-3333-333333333333', 'Timberland Woodworks', 'Enugu', 'Enugu', 40, NOW()),
  ('Hardwood Flooring Planks', 'Luxury oak flooring for modern interiors. per sq m.', 9000.00, 'flooring', ARRAY['https://images.unsplash.com/photo-1581814344855-61397211f362?q=80&w=400'], '33333333-3333-3333-3333-333333333333', 'Timberland Woodworks', 'Enugu', 'Enugu', 200, NOW()),

  -- PowerTool Pro (Kano)
  ('Professional Drill Set', 'Cordless power drill with 20 interchangeable bits.', 25000.00, 'tools', ARRAY['https://images.unsplash.com/photo-1581235725876-7775737199a3?q=80&w=400'], '44444444-4444-4444-4444-444444444444', 'PowerTool Pro', 'Kano', 'Kano', 12, NOW()),
  ('Angle Grinder 115mm', 'Heavy duty angle grinder for metal and stone cutting.', 18000.00, 'tools', ARRAY['https://images.unsplash.com/photo-1581235725876-7775737199a3?q=80&w=400'], '44444444-4444-4444-4444-444444444444', 'PowerTool Pro', 'Kano', 'Kano', 10, NOW()),
  ('Laser Level Tool', 'High precision self-leveling laser for alignment.', 32000.00, 'tools', ARRAY['https://images.unsplash.com/photo-1581235725876-7775737199a3?q=80&w=400'], '44444444-4444-4444-4444-444444444444', 'PowerTool Pro', 'Kano', 'Kano', 8, NOW()),
  ('Industrial Vacuum', 'Wet and dry heavy-duty vacuum for construction sites.', 55000.00, 'general', ARRAY['https://images.unsplash.com/photo-1590487988256-9fb5e82877d9?q=80&w=400'], '44444444-4444-4444-4444-444444444444', 'PowerTool Pro', 'Kano', 'Kano', 4, NOW()),

  -- Elite FinishingTouch (Port Harcourt)
  ('Luxury Interior Paint', 'Satin finish interior paint. 20L bucket.', 22000.00, 'paint', ARRAY['https://images.unsplash.com/photo-1562607531-f59894f30631?q=80&w=400'], '55555555-5555-5555-5555-555555555555', 'Elite FinishingTouch', 'Port Harcourt', 'Port Harcourt', 25, NOW()),
  ('Aluminum Window Frame', 'Modern sliding aluminum window frame. Standard size.', 15000.00, 'roofing', ARRAY['https://images.unsplash.com/photo-1604147495798-57beb5d6af73?q=80&w=400'], '55555555-5555-5555-5555-555555555555', 'Elite FinishingTouch', 'Port Harcourt', 'Port Harcourt', 15, NOW()),
  ('Ceramic Floor Tiles', 'High-gloss porcelain tiles. Price per sq m.', 7500.00, 'flooring', ARRAY['https://images.unsplash.com/photo-1581814344855-61397211f362?q=80&w=400'], '55555555-5555-5555-5555-555555555555', 'Elite FinishingTouch', 'Port Harcourt', 'Port Harcourt', 300, NOW()),
  ('Waterproofing Membrane', 'High-performance bituminous membrane for roofs.', 12000.00, 'roofing', ARRAY['https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=400'], '55555555-5555-5555-5555-555555555555', 'Elite FinishingTouch', 'Port Harcourt', 'Port Harcourt', 20, NOW());
