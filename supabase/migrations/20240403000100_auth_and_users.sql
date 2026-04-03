-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Di produksi, sebaiknya gunakan auth.users Supabase
    nickname TEXT,
    role TEXT DEFAULT 'kasir',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster login
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Basic Policy (Allow all for now as per app logic)
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true);
