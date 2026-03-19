-- Run this in Supabase Dashboard → SQL Editor so each variant shows its quantity on the product page.
-- The storefront shows "X in stock" per variant by matching inventory rows to product_variants.

-- 1) Add variant_id so each inventory row can link to one product_variant
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON inventory(variant_id);

-- 2) Optional: add product_variant_id (same meaning as variant_id; app accepts either)
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

-- How to get per-variant quantity showing:
-- - Set inventory.variant_id = product_variants.id for each row (one row per variant, or one per location per variant).
-- - Or set inventory.sku = product_variants.sku so the app matches by sku.
-- - Or use the same order: one inventory row per variant in the same order as product_variants (fallback).
