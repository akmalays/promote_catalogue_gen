-- ============================================================
-- Background jobs + atomic RPCs
-- Created: 2026-05-17
--
-- Goals:
--   1. Replace the Node setInterval scheduler with pg_cron jobs.
--   2. Auto-deactivate campaigns whose end_date has passed.
--   3. Make COGS moving-average update atomic with row-level lock.
-- ============================================================

-- 1) Functions ----------------------------------------------

-- Flush scheduled notifications whose time has come.
CREATE OR REPLACE FUNCTION flush_due_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH upd AS (
    UPDATE notifications
       SET is_sent = true,
           sent_at = NOW()
     WHERE is_sent = false
       AND scheduled_at IS NOT NULL
       AND scheduled_at <= NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO affected FROM upd;
  RETURN affected;
END;
$$;

COMMENT ON FUNCTION flush_due_notifications IS
  'Marks scheduled notifications as sent when their scheduled_at is reached.';

-- Auto deactivate campaigns past their end date.
CREATE OR REPLACE FUNCTION deactivate_expired_campaigns()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH upd AS (
    UPDATE promo_campaigns
       SET is_active = false
     WHERE is_active = true
       AND end_date IS NOT NULL
       AND end_date < NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO affected FROM upd;
  RETURN affected;
END;
$$;

COMMENT ON FUNCTION deactivate_expired_campaigns IS
  'Sets is_active = false on campaigns whose end_date has passed.';

-- Atomic moving-average COGS update + supply log
CREATE OR REPLACE FUNCTION process_inbound(
  p_product_id    UUID,
  p_quantity      INTEGER,
  p_purchase_price NUMERIC,
  p_company_id    UUID,
  p_supplier      TEXT DEFAULT NULL,
  p_salesman      TEXT DEFAULT NULL,
  p_invoice_image TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  cur_stock  INTEGER;
  cur_cost   NUMERIC;
  new_total  INTEGER;
  new_cost   NUMERIC;
  log_row    supply_history%ROWTYPE;
BEGIN
  -- Lock the product row so concurrent inbounds compute against a consistent state.
  SELECT stock, COALESCE(cost_price, 0)
    INTO cur_stock, cur_cost
    FROM products
   WHERE id = p_product_id AND company_id = p_company_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found for company %', p_product_id, p_company_id;
  END IF;

  new_total := COALESCE(cur_stock, 0) + p_quantity;

  IF cur_stock > 0 AND new_total > 0 THEN
    new_cost := ((cur_stock * cur_cost) + (p_quantity * p_purchase_price)) / new_total;
  ELSE
    new_cost := p_purchase_price;
  END IF;

  UPDATE products
     SET stock      = new_total,
         cost_price = ROUND(new_cost)
   WHERE id = p_product_id AND company_id = p_company_id;

  INSERT INTO supply_history (
    product_id, quantity, purchase_price, company_id, supplier, salesman, invoice_image
  ) VALUES (
    p_product_id, p_quantity, p_purchase_price, p_company_id, p_supplier, p_salesman, p_invoice_image
  )
  RETURNING * INTO log_row;

  RETURN jsonb_build_object(
    'product_id',  p_product_id,
    'new_stock',   new_total,
    'new_cost',    ROUND(new_cost),
    'log_id',      log_row.id
  );
END;
$$;

COMMENT ON FUNCTION process_inbound IS
  'Atomic stock + moving-average COGS update with supply_history log.';

-- 2) Schedule jobs via pg_cron ------------------------------
-- pg_cron must be enabled in the Supabase dashboard:
--   Database → Extensions → enable "pg_cron".
-- This block self-skips if the extension is not installed.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Drop any existing job with the same name before re-creating.
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname IN ('flush-due-notifications', 'deactivate-expired-campaigns');

    PERFORM cron.schedule(
      'flush-due-notifications',
      '* * * * *',
      $cron$ SELECT flush_due_notifications(); $cron$
    );

    PERFORM cron.schedule(
      'deactivate-expired-campaigns',
      '*/5 * * * *',
      $cron$ SELECT deactivate_expired_campaigns(); $cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron extension is not installed. Enable it via Supabase Dashboard → Database → Extensions, then re-run this migration.';
  END IF;
END;
$$;
