-- Run this in Supabase Dashboard → SQL Editor
-- Requires: pg_net extension enabled, cron extension (Supabase usually has these).
-- Replace YOUR_SUPABASE_URL and YOUR_SERVICE_ROLE_KEY with your project URL and service_role key.
-- Variants and stock are synced from Shopify into product_variants / products; the storefront reads them from there.

-- If you had the old single job, run first:
-- SELECT cron.unschedule('shopify-sync-every-minute');

-- Products at min 0,3,6... (staggered to avoid Shopify 429)
SELECT cron.schedule(
  'shopify-sync-products',
  '0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54,57 * * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/shopify-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{"sync":"products"}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);

-- Customers at min 1,4,7... (no overlap with products/inventory)
SELECT cron.schedule(
  'shopify-sync-customers',
  '1,4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49,52,55,58 * * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/shopify-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{"sync":"customers"}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);

-- Inventory at min 2,5,8... (no overlap)
SELECT cron.schedule(
  'shopify-sync-inventory',
  '2,5,8,11,14,17,20,23,26,29,32,35,38,41,44,47,50,53,56,59 * * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/shopify-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{"sync":"inventory"}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);

-- To stop later, run:
-- SELECT cron.unschedule('shopify-sync-products');
-- SELECT cron.unschedule('shopify-sync-customers');
-- SELECT cron.unschedule('shopify-sync-inventory');
