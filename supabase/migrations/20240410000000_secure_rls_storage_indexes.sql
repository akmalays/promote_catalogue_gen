-- Migration: Secure RLS Policies, Supabase Storage, and Composite Indexes
-- This migration:
-- 1. Replaces weak RLS policies with proper auth.uid() -> company_id checks
-- 2. Creates a storage bucket for product/catalogue images
-- 3. Adds composite indexes for common query patterns

-- ============================================================
-- 1. SECURE RLS POLICIES (auth.uid() based tenant isolation)
-- ============================================================

-- Helper function to get current user's company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop all existing weak policies
DO $$ 
BEGIN
  -- Products
  DROP POLICY IF EXISTS "Tenant isolation for products" ON products;
  DROP POLICY IF EXISTS "Allow all access to products" ON products;
  -- Sales
  DROP POLICY IF EXISTS "Tenant isolation for sales" ON sales;
  DROP POLICY IF EXISTS "Allow all access to sales" ON sales;
  -- Catalogues
  DROP POLICY IF EXISTS "Tenant isolation for catalogues" ON catalogues;
  DROP POLICY IF EXISTS "Allow all access to catalogues" ON catalogues;
  -- Supply History
  DROP POLICY IF EXISTS "Tenant isolation for supply" ON supply_history;
  DROP POLICY IF EXISTS "Allow all access to supply_history" ON supply_history;
  -- Users
  DROP POLICY IF EXISTS "Tenant isolation for users" ON users;
  DROP POLICY IF EXISTS "Allow all access to users" ON users;
  -- Blast History
  DROP POLICY IF EXISTS "Allow all access to blast_history" ON blast_history;
  -- Visitors
  DROP POLICY IF EXISTS "Allow all access to visitors" ON visitors;
  -- Notifications
  DROP POLICY IF EXISTS "Enable all for users based on company_id" ON notifications;
  -- Promo Campaigns
  DROP POLICY IF EXISTS "Enable all for users based on company_id" ON promo_campaigns;
  -- Campaign Products
  DROP POLICY IF EXISTS "Enable all for users based on company_id" ON campaign_products;
  -- Store Settings
  DROP POLICY IF EXISTS "Enable all for users based on company_id" ON store_settings;
  -- Stock Opname Sessions
  DROP POLICY IF EXISTS "Enable all for users based on company_id" ON stock_opname_sessions;
END $$;

-- New secure policies: user can only access rows where company_id matches their own

CREATE POLICY "tenant_products" ON products FOR ALL
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "tenant_sales" ON sales FOR ALL
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "tenant_catalogues" ON catalogues FOR ALL
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "tenant_supply_history" ON supply_history FOR ALL
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "tenant_users" ON users FOR ALL
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "tenant_blast_history" ON blast_history FOR ALL
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "tenant_visitors" ON visitors FOR ALL
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- Notifications (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'CREATE POLICY "tenant_notifications" ON notifications FOR ALL USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id())';
  END IF;
END $$;

-- Promo Campaigns (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_campaigns') THEN
    EXECUTE 'CREATE POLICY "tenant_promo_campaigns" ON promo_campaigns FOR ALL USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id())';
  END IF;
END $$;

-- Campaign Products (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_products') THEN
    EXECUTE 'CREATE POLICY "tenant_campaign_products" ON campaign_products FOR ALL USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id())';
  END IF;
END $$;

-- Store Settings (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_settings') THEN
    EXECUTE 'CREATE POLICY "tenant_store_settings" ON store_settings FOR ALL USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id())';
  END IF;
END $$;

-- Stock Opname Sessions (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_opname_sessions') THEN
    EXECUTE 'CREATE POLICY "tenant_stock_opname" ON stock_opname_sessions FOR ALL USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id())';
  END IF;
END $$;

-- ============================================================
-- 2. SUPABASE STORAGE BUCKET FOR IMAGES
-- ============================================================

-- Create bucket for product and catalogue images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets',
  'store-assets',
  true,
  5242880, -- 5MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can upload to their company folder
CREATE POLICY "Users can upload to own company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-assets' AND
  (storage.foldername(name))[1] = get_my_company_id()::text
);

-- Users can view files from their company folder
CREATE POLICY "Users can view own company files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'store-assets' AND
  (storage.foldername(name))[1] = get_my_company_id()::text
);

-- Users can delete files from their company folder
CREATE POLICY "Users can delete own company files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-assets' AND
  (storage.foldername(name))[1] = get_my_company_id()::text
);

-- Public read access (since bucket is public, anyone can view via URL)
CREATE POLICY "Public read access for store assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

-- ============================================================
-- 3. COMPOSITE INDEXES FOR PERFORMANCE
-- ============================================================

-- Sales: most common query is by company + date
CREATE INDEX IF NOT EXISTS idx_sales_company_created 
  ON sales(company_id, created_at DESC);

-- Products: filtered by company + category
CREATE INDEX IF NOT EXISTS idx_products_company_category 
  ON products(company_id, category);

-- Supply History: by company + date
CREATE INDEX IF NOT EXISTS idx_supply_company_created 
  ON supply_history(company_id, created_at DESC);

-- Blast History: by company + date
CREATE INDEX IF NOT EXISTS idx_blast_company_created 
  ON blast_history(company_id, created_at DESC);

-- Catalogues: by company + date
CREATE INDEX IF NOT EXISTS idx_catalogues_company_created 
  ON catalogues(company_id, created_at DESC);

-- Visitors: by company + name (for search)
CREATE INDEX IF NOT EXISTS idx_visitors_company_name 
  ON visitors(company_id, name);

-- Notifications: by company + sent status + read status
CREATE INDEX IF NOT EXISTS idx_notifications_company_status 
  ON notifications(company_id, is_sent, is_read);

-- Promo Campaigns: by company + active status
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_campaigns') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaigns_company_active ON promo_campaigns(company_id, is_active)';
  END IF;
END $$;
