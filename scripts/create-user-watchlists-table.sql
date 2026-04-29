-- Create user_watchlists table to persist watchlist per user
CREATE TABLE IF NOT EXISTS user_watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tickers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own watchlist
CREATE POLICY "Users can view own watchlist" ON user_watchlists
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own watchlist
CREATE POLICY "Users can insert own watchlist" ON user_watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own watchlist
CREATE POLICY "Users can update own watchlist" ON user_watchlists
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON user_watchlists(user_id);
