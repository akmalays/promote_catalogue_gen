-- ============================================================
-- Run this in Supabase SQL Editor to confirm every object the
-- frontend needs is present. Each row prints OK or MISSING.
--
-- This file deliberately avoids referencing the `cron` schema
-- directly so that it parses even when pg_cron is not yet
-- installed. A separate query at the bottom uses dynamic SQL
-- to list cron jobs only when the extension is present.
-- ============================================================

WITH expected_tables(name) AS (VALUES
  ('companies'),
  ('users'),
  ('products'),
  ('catalogues'),
  ('visitors'),
  ('sales'),
  ('blast_history'),
  ('supply_history'),
  ('store_settings'),
  ('notifications'),
  ('stock_opname_sessions'),
  ('promo_campaigns'),
  ('campaign_products'),
  ('sale_promo_applications')
),
expected_views(name) AS (VALUES
  ('campaign_metrics')
),
expected_functions(name) AS (VALUES
  ('get_my_company_id'),
  ('decrement_stock'),
  ('increment_stock'),
  ('process_inbound'),
  ('flush_due_notifications'),
  ('deactivate_expired_campaigns')
),
expected_columns(table_name, column_name) AS (VALUES
  ('promo_campaigns', 'priority'),
  ('promo_campaigns', 'stackable'),
  ('promo_campaigns', 'description'),
  ('promo_campaigns', 'color'),
  ('campaign_products', 'min_margin_pct'),
  ('campaign_products', 'max_qty_per_trx'),
  ('campaign_products', 'stock_cap'),
  ('products', 'cost_price'),
  ('supply_history', 'purchase_price')
)
SELECT 'TABLE  ' || name AS object,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = name
       ) THEN 'OK' ELSE 'MISSING' END AS status
  FROM expected_tables
UNION ALL
SELECT 'VIEW   ' || name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.views
          WHERE table_schema = 'public' AND table_name = name
       ) THEN 'OK' ELSE 'MISSING' END
  FROM expected_views
UNION ALL
SELECT 'FUNC   ' || name,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = name
       ) THEN 'OK' ELSE 'MISSING' END
  FROM expected_functions
UNION ALL
SELECT 'COL    ' || table_name || '.' || column_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND information_schema.columns.table_name  = expected_columns.table_name
            AND information_schema.columns.column_name = expected_columns.column_name
       ) THEN 'OK' ELSE 'MISSING' END
  FROM expected_columns
UNION ALL
SELECT 'EXT    pg_cron',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
       ) THEN 'OK' ELSE 'MISSING (enable in Database → Extensions, then run migration 20260517010000)' END
ORDER BY 1;

-- ------------------------------------------------------------
-- Optional: list cron jobs (only meaningful when pg_cron is installed).
-- Run this block on its own. It uses dynamic SQL so it parses safely
-- regardless of whether the cron schema exists yet.
-- ------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed — skipping cron job inspection.';
    RETURN;
  END IF;

  FOR rec IN EXECUTE
    'SELECT jobname, schedule FROM cron.job ORDER BY jobname'
  LOOP
    RAISE NOTICE 'CRON   % · %', rec.jobname, rec.schedule;
  END LOOP;
END;
$$;
