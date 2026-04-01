-- Sample Data for Farm2Home

-- 1. Insert Users (Consumers and Farmers)
INSERT INTO public.users (id, email, name, role, address, farm_name, farm_location, is_verified)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'consumer1@example.com', 'Ravi Kumar', 'consumer', '123 Main St, Chennai', NULL, NULL, true),
  ('22222222-2222-2222-2222-222222222222', 'consumer2@example.com', 'Priya Sharma', 'consumer', '456 Park Ave, Bangalore', NULL, NULL, true),
  ('33333333-3333-3333-3333-333333333333', 'farmer1@example.com', 'Murugan', 'farmer', '789 Village Rd, Madurai', 'Murugan Farms', 'Madurai, Tamil Nadu', true),
  ('44444444-4444-4444-4444-444444444444', 'farmer2@example.com', 'Lakshmi', 'farmer', '101 Farm Lane, Coimbatore', 'Lakshmi Organics', 'Coimbatore, Tamil Nadu', true);

-- 2. Insert Products
INSERT INTO public.products (id, farmer_id, name, description, price, unit, category, image_url, stock, is_organic, rating, farmer_name, farm_location, farmer_mobile)
VALUES
  ('p1', '33333333-3333-3333-3333-333333333333', 'Fresh Tomatoes', 'Locally grown, pesticide-free tomatoes.', 40.00, 'kg', 'Vegetables', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800', 100, true, 4.8, 'Murugan', 'Madurai, Tamil Nadu', '+91 98765 43210'),
  ('p2', '33333333-3333-3333-3333-333333333333', 'Organic Onions', 'Crisp and flavorful organic onions.', 35.00, 'kg', 'Vegetables', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=800', 150, true, 4.5, 'Murugan', 'Madurai, Tamil Nadu', '+91 98765 43210'),
  ('p3', '44444444-4444-4444-4444-444444444444', 'Alphonso Mangoes', 'Sweet and juicy Alphonso mangoes.', 120.00, 'kg', 'Fruits', 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800', 50, true, 4.9, 'Lakshmi', 'Coimbatore, Tamil Nadu', '+91 87654 32109');

-- 3. Insert Orders
INSERT INTO public.orders (id, user_id, first_name, last_name, email, street_address, city, zip_code, product_name, total_amount, status)
VALUES
  ('ord_1', '11111111-1111-1111-1111-111111111111', 'Ravi', 'Kumar', 'consumer1@example.com', '123 Main St', 'Chennai', '600001', 'Fresh Tomatoes, Organic Onions', 115.00, 'pending'),
  ('ord_2', '22222222-2222-2222-2222-222222222222', 'Priya', 'Sharma', 'consumer2@example.com', '456 Park Ave', 'Bangalore', '560001', 'Alphonso Mangoes', 170.00, 'processing');

-- 4. Insert Reviews
INSERT INTO public.reviews (id, product_id, user_id, user_name, rating, comment, image_url)
VALUES
  ('rev_1', 'p1', '11111111-1111-1111-1111-111111111111', 'Ravi Kumar', 5, 'Excellent quality tomatoes! Very fresh.', NULL),
  ('rev_2', 'p3', '22222222-2222-2222-2222-222222222222', 'Priya Sharma', 5, 'The best mangoes I have ever had.', 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800');

-- 5. Insert Favorite Farmers
INSERT INTO public.favorite_farmers (id, user_id, farmer_name)
VALUES
  ('fav_1', '11111111-1111-1111-1111-111111111111', 'Murugan'),
  ('fav_2', '22222222-2222-2222-2222-222222222222', 'Lakshmi');

-- Useful Queries for the Application

-- Get all products with farmer details
-- SELECT p.*, u.name as farmer_name, u.farm_location 
-- FROM products p 
-- JOIN users u ON p.farmer_id = u.id;

-- Get reviews for a specific product
-- SELECT r.*, u.name as user_name 
-- FROM reviews r 
-- JOIN users u ON r.user_id = u.id 
-- WHERE r.product_id = 'p1';

-- Get favorite farmers for a user
-- SELECT ff.farmer_name 
-- FROM favorite_farmers ff 
-- WHERE ff.user_id = '11111111-1111-1111-1111-111111111111';

-- Get orders for a specific user
-- SELECT * FROM orders WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Get orders for a specific farmer's products (Requires joining orders, order_items, and products - assuming an order_items table exists for a fully normalized schema)
