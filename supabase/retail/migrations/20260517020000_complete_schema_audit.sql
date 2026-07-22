-- ============================================================
-- Schema audit + completeness patch
-- Created: 2026-05-17
--
-- Background:
--   The frontend calls supabase.rpc('decrement_stock', ...) and
--   supabase.rpc('increment_stock', ...) but those functions were never
--   defined in the migration history (they were probably created manually
--   via the dashboard).
--
--   The `stock_opname_sessions` table is referenced by RLS migrations and the
--   API but its CREATE TABLE statement was never committed either.
--
-- This migration backfills both, idempotently, so a fresh Supabase project
-- can boot the whole app from migrations alone.
-- ============================================================

-- 1) stock_opname_sessions ----------------------------------
CREATE TABLE IF NOT EXISTS stock_opname_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  notes         TEXT,
  items         JSONB NOT NULL DEFAULT '[]',
  total_diff    INTEGER DEFAULT 0,
  performed_by  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opname_company_created
  ON stock_opname_sessions (company_id, created_at DESC);

ALTER TABLE stock_opname_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_stock_opname" ON stock_opname_sessions;
CREATE POLICY "tenant_stock_opname" ON stock_opname_sessions
  FOR ALL
  USING (company_id IS NOT NULL);

-- 2) decrement_stock RPC ------------------------------------
-- Drop any pre-existing version (return type may differ from earlier
-- manually-created copies) before recreating with our standard signature.
DROP FUNCTION IF EXISTS decrement_stock(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS decrement_stock(p_id UUID, p_quantity INTEGER, p_company_id UUID);

-- Atomic stock decrement guarded by company_id and a row lock.
CREATE OR REPLACE FUNCTION decrement_stock(
  p_id          UUID,
  p_quantity    INTEGER,
  p_company_id  UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cur_stock INTEGER;
BEGIN
  SELECT stock INTO cur_stock
    FROM products
   WHERE id = p_id AND company_id = p_company_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found for company %', p_id, p_company_id;
  END IF;

  IF cur_stock - p_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product % (have %, need %)', p_id, cur_stock, p_quantity;
  END IF;

  UPDATE products
     SET stock = cur_stock - p_quantity
   WHERE id = p_id AND company_id = p_company_id;

  RETURN cur_stock - p_quantity;
END;
$$;

COMMENT ON FUNCTION decrement_stock IS
  'Atomic stock decrement with company guard and oversell protection.';

-- 3) increment_stock RPC ------------------------------------
DROP FUNCTION IF EXISTS increment_stock(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS increment_stock(p_id UUID, p_quantity INTEGER, p_company_id UUID);

CREATE OR REPLACE FUNCTION increment_stock(
  p_id          UUID,
  p_quantity    INTEGER,
  p_company_id  UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cur_stock INTEGER;
BEGIN
  SELECT stock INTO cur_stock
    FROM products
   WHERE id = p_id AND company_id = p_company_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found for company %', p_id, p_company_id;
  END IF;

  UPDATE products
     SET stock = cur_stock + p_quantity
   WHERE id = p_id AND company_id = p_company_id;

  RETURN cur_stock + p_quantity;
END;
$$;

COMMENT ON FUNCTION increment_stock IS
  'Atomic stock increment with company guard. Use process_inbound() if you also need to update cost_price and write supply_history.';
