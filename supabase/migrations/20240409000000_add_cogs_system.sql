-- Migration: Add COGS (Cost Price) tracking to Products and Supply History
-- Created at: 2024-04-09 11:47:00

-- 1. Add cost_price to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;

-- 2. Add purchase_price to supply_history
ALTER TABLE supply_history ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0;

-- Optional: Update description for better clarity in DB
COMMENT ON COLUMN products.cost_price IS 'Average Cost Price (COGS) calculated using Moving Average';
COMMENT ON COLUMN supply_history.purchase_price IS 'Purchase price at the time of supply inbound';
