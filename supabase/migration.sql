-- =============================================
-- Poacher.io — Usage Tracking Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- User metadata: tracks billing periods, preferences
CREATE TABLE IF NOT EXISTS user_meta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT UNIQUE,
  anonymous_id TEXT UNIQUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
  selected_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- At least one identifier must be present
  CONSTRAINT user_meta_has_identifier CHECK (clerk_user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_meta_clerk ON user_meta(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_meta_anon ON user_meta(anonymous_id) WHERE anonymous_id IS NOT NULL;

-- Usage events: append-only log of all trackable actions
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,              -- Clerk user ID (nullable for anonymous)
  anonymous_id TEXT,         -- Session-based anonymous ID (nullable for logged-in)
  metric TEXT NOT NULL CHECK (metric IN ('generation', 'domain_check', 'saved_name')),
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT usage_events_has_identifier CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

-- Indexes for querying usage by user and time period
CREATE INDEX IF NOT EXISTS idx_usage_events_user ON usage_events(user_id, created_at) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_events_anon ON usage_events(anonymous_id, created_at) WHERE anonymous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_events_metric ON usage_events(metric, created_at);

-- Auto-update updated_at on user_meta
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_meta_updated_at
  BEFORE UPDATE ON user_meta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: Disable for now since we're using service role key from server only
-- If you ever expose the client key, enable RLS and add policies
ALTER TABLE user_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so no policies needed for server-side access
-- But add a permissive policy so the tables aren't completely locked
CREATE POLICY "Service role full access" ON user_meta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON usage_events FOR ALL USING (true) WITH CHECK (true);
