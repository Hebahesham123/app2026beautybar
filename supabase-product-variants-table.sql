-- Run this in Supabase Dashboard → SQL Editor
-- Creates product_variants so product pages can show Size, Color, etc.

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value TEXT NOT NULL,
  price NUMERIC(12,2),
  compare_at_price NUMERIC(12,2),
  sku TEXT,
  stock INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Allow public read for storefront
CREATE POLICY "Anyone can read product_variants"
  ON product_variants FOR SELECT
  USING (true);

-- Example insert (adjust product_id to match your products table):
-- INSERT INTO product_variants (product_id, title, value, price, sku) VALUES
--   ('your-product-uuid', 'Size', 'S', 29.99, 'TEE-001-S'),
--   ('your-product-uuid', 'Size', 'M', 29.99, 'TEE-001-M'),
--   ('your-product-uuid', 'Size', 'L', 29.99, 'TEE-001-L');
