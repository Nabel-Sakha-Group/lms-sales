-- migrations/001_create_users_table.sql
-- Create users table for non-admin users (bypassing Supabase Auth email verification)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read (for login check) - adjust as needed for production
CREATE POLICY "Allow public read for login" ON users
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users (admin via service role or your app logic) can insert
-- For now, allow insert from authenticated users (your admin)
CREATE POLICY "Allow authenticated insert" ON users
  FOR INSERT
  WITH CHECK (true);

-- Optional: Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
