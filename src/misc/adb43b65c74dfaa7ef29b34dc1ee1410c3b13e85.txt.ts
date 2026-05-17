-- Add address fields to profiles and orders for smooth delivery
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address_line1 text,
ADD COLUMN IF NOT EXISTS address_line2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text default 'USA';

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_name text,
ADD COLUMN IF NOT EXISTS shipping_address_line1 text,
ADD COLUMN IF NOT EXISTS shipping_address_line2 text,
ADD COLUMN IF NOT EXISTS shipping_city text,
ADD COLUMN IF NOT EXISTS shipping_state text,
ADD COLUMN IF NOT EXISTS shipping_zip_code text,
ADD COLUMN IF NOT EXISTS shipping_country text default 'USA',
ADD COLUMN IF NOT EXISTS shipping_phone text;

-- Add a column to track if it's a delivery or pickup
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'pickup';
