-- ==========================================
-- SUPABASE TABLE: store_settings
-- Jalankan SQL ini di Supabase SQL Editor
-- ==========================================

CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Masukkan data default
INSERT INTO store_settings ("key", "value") VALUES 
('daily_sales_target', '{"amount": 5000000}'),
('focus_items', '[
  {"name": "Aqua 600ml (Isi 24)", "target": 50}, 
  {"name": "Minyak Kita 1L", "target": 50}, 
  {"name": "Beras Premium 5kg", "target": 50}
]')
ON CONFLICT ("key") DO NOTHING;

-- Aktifkan RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Izinkan semua operasi untuk ANON key (sesuaikan jika perlu lebih aman)
CREATE POLICY "Allow all store_settings" ON store_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
