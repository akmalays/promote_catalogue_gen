-- ============================================================
-- Campaigns v2: multi-active + audit + metrics
-- Created: 2026-05-17
--
-- Goals:
--   1. Allow multiple campaigns to be active in parallel.
--   2. Resolve collisions deterministically via priority + stackable.
--   3. Add per-line guardrails (margin floor, qty cap, stock cap).
--   4. Persist promo applications per sale for auditable margin reports.
--   5. Provide a metrics view to power KPI dashboards.
-- ============================================================

-- 1) promo_campaigns: priority / stackable / metadata ---------
ALTER TABLE promo_campaigns
  ADD COLUMN IF NOT EXISTS priority    INT     DEFAULT 100,
  ADD COLUMN IF NOT EXISTS stackable   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS color       TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN promo_campaigns.priority  IS 'Lower number wins when product overlaps. Default 100.';
COMMENT ON COLUMN promo_campaigns.stackable IS 'If true, can be combined with other stackable campaigns at checkout.';
COMMENT ON COLUMN promo_campaigns.color     IS 'Tailwind color hint for tag rendering (e.g. amber, emerald).';

-- Helpful index for "what campaigns are live now" queries.
CREATE INDEX IF NOT EXISTS idx_campaigns_active_window
  ON promo_campaigns (company_id, is_active, start_date, end_date);

-- 2) campaign_products: guardrails ---------------------------
ALTER TABLE campaign_products
  ADD COLUMN IF NOT EXISTS min_margin_pct  NUMERIC,
  ADD COLUMN IF NOT EXISTS max_qty_per_trx INT,
  ADD COLUMN IF NOT EXISTS stock_cap       INT;

COMMENT ON COLUMN campaign_products.min_margin_pct  IS 'Warn (UI) if effective margin drops below this percent.';
COMMENT ON COLUMN campaign_products.max_qty_per_trx IS 'Hard cap on how many promo bundles a cashier can ring per transaction.';
COMMENT ON COLUMN campaign_products.stock_cap       IS 'Optional stock allocation reserved for the promo.';

-- 3) sale_promo_applications: audit log ----------------------
CREATE TABLE IF NOT EXISTS sale_promo_applications (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id                 BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  campaign_id             UUID REFERENCES promo_campaigns(id)  ON DELETE SET NULL,
  campaign_product_id     UUID REFERENCES campaign_products(id) ON DELETE SET NULL,
  product_id              UUID NOT NULL,
  promo_type              TEXT NOT NULL,
  qty_paid                INT  NOT NULL DEFAULT 0,
  qty_free                INT  NOT NULL DEFAULT 0,
  unit_price_normal       NUMERIC NOT NULL,
  unit_price_after        NUMERIC NOT NULL,
  cost_price_snapshot     NUMERIC NOT NULL,
  discount_amount         NUMERIC NOT NULL DEFAULT 0,
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spa_campaign_created
  ON sale_promo_applications (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spa_company_created
  ON sale_promo_applications (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spa_sale
  ON sale_promo_applications (sale_id);

ALTER TABLE sale_promo_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_spa" ON sale_promo_applications;
CREATE POLICY "tenant_spa" ON sale_promo_applications
  FOR ALL
  USING (company_id IS NOT NULL);

-- 4) campaign_metrics view -----------------------------------
-- Aggregates from sale_promo_applications. Empty rows OK (LEFT JOIN).
DROP VIEW IF EXISTS campaign_metrics;
CREATE VIEW campaign_metrics AS
SELECT
  c.id            AS campaign_id,
  c.company_id,
  c.name,
  c.is_active,
  c.start_date,
  c.end_date,
  COUNT(DISTINCT spa.sale_id)                                        AS trx_count,
  COALESCE(SUM(spa.qty_paid + spa.qty_free), 0)                      AS units_moved,
  COALESCE(SUM(spa.discount_amount), 0)                              AS total_discount,
  COALESCE(SUM(spa.unit_price_after * spa.qty_paid), 0)              AS gross_revenue,
  COALESCE(SUM(spa.cost_price_snapshot * (spa.qty_paid + spa.qty_free)), 0) AS total_cogs
FROM promo_campaigns c
LEFT JOIN sale_promo_applications spa ON spa.campaign_id = c.id
GROUP BY c.id;

COMMENT ON VIEW campaign_metrics IS 'Realtime aggregate of sale_promo_applications per campaign.';
