-- ======================================
-- SUPABASE TABLE: notifications
-- Run this SQL in Supabase SQL Editor
-- ======================================

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',       -- 'info' | 'promo' | 'warning' | 'success'
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,           -- false = scheduled, not yet sent
  scheduled_at TIMESTAMPTZ DEFAULT NULL,   -- NULL = send immediately
  sent_at TIMESTAMPTZ DEFAULT NULL,        -- when was it actually sent
  target_role TEXT DEFAULT NULL,           -- NULL = all users
  sender_name TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast scheduler queries
CREATE INDEX IF NOT EXISTS idx_notifications_scheduler
  ON notifications (is_sent, scheduled_at)
  WHERE is_sent = false;

-- Index for active notifications polling
CREATE INDEX IF NOT EXISTS idx_notifications_active
  ON notifications (is_sent, is_read, sent_at)
  WHERE is_sent = true AND is_read = false;

-- Enable Row Level Security (optional, using anon key)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key (adjust for production)
CREATE POLICY "Allow all for anon" ON notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);
