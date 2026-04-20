-- Run this script in your Supabase SQL Editor to create the required tables and policies.

-- 1. Create the users table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    farmName TEXT,
    location TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the products table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT NOT NULL,
    farmerName TEXT NOT NULL,
    farmerMobile TEXT NOT NULL,
    farmLocation TEXT NOT NULL,
    description TEXT NOT NULL,
    stock INTEGER NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    rating NUMERIC DEFAULT 0
);

-- 3. Create the orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    street_address TEXT NOT NULL,
    city TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    items_json JSONB,
    total_amount NUMERIC NOT NULL,
    delivery_method TEXT DEFAULT 'pickup' NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create the reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    image_url TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create the favorite_farmers table
CREATE TABLE IF NOT EXISTS public.favorite_farmers (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    farmer_name TEXT NOT NULL,
    farmer_mobile TEXT NOT NULL,
    farm_location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_email, farmer_name)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_farmers ENABLE ROW LEVEL SECURITY;

-- Create policies that allow anyone to insert/select (for prototype purposes)
-- In a production app, you would restrict these based on auth.uid()

-- Users
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable select for all users" ON public.users;
CREATE POLICY "Enable insert for all users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON public.users FOR SELECT USING (true);

-- Products
DROP POLICY IF EXISTS "Enable insert for all users" ON public.products;
DROP POLICY IF EXISTS "Enable select for all users" ON public.products;
CREATE POLICY "Enable insert for all users" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON public.products FOR SELECT USING (true);

-- Orders
DROP POLICY IF EXISTS "Enable insert for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable select for all users" ON public.orders;
CREATE POLICY "Enable insert for all users" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON public.orders FOR SELECT USING (true);

-- Reviews
DROP POLICY IF EXISTS "Enable insert for all users" ON public.reviews;
DROP POLICY IF EXISTS "Enable select for all users" ON public.reviews;
CREATE POLICY "Enable insert for all users" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON public.reviews FOR SELECT USING (true);

-- Favorite Farmers
DROP POLICY IF EXISTS "Enable insert for all users" ON public.favorite_farmers;
DROP POLICY IF EXISTS "Enable select for all users" ON public.favorite_farmers;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.favorite_farmers;
CREATE POLICY "Enable insert for all users" ON public.favorite_farmers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON public.favorite_farmers FOR SELECT USING (true);
CREATE POLICY "Enable delete for all users" ON public.favorite_farmers FOR DELETE USING (true);
