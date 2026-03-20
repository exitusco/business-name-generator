-- =============================================
-- Poacher.io — Phase 1: Projects & Searches Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Projects: top-level container for a business
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,                    -- Clerk user ID
  anonymous_id TEXT,               -- for anonymous users
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  chosen_name TEXT,                -- the final chosen business name
  chosen_domain TEXT,              -- the final chosen domain
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT projects_has_owner CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_anon ON projects(anonymous_id, created_at DESC) WHERE anonymous_id IS NOT NULL;

-- Project components: tracks what "pieces" a project has (business_name, logo, colors, etc.)
CREATE TABLE IF NOT EXISTS project_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN (
    'business_name', 'color_palette', 'logo_ideas', 'logo_design', 'design_elements', 'typography'
  )),
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'in_progress', 'complete')),
  result_data JSONB DEFAULT '{}'::jsonb,  -- stores outcome (e.g. chosen name/domain for business_name)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(project_id, component_type)
);

CREATE INDEX IF NOT EXISTS idx_components_project ON project_components(project_id);

-- Searches: a single search session within a project's business_name component
CREATE TABLE IF NOT EXISTS searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_id UUID REFERENCES project_components(id) ON DELETE CASCADE,
  user_id TEXT,
  anonymous_id TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- search settings (tld, styles, obscurity, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT searches_has_owner CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_searches_project ON searches(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_searches_user ON searches(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_searches_anon ON searches(anonymous_id, created_at DESC) WHERE anonymous_id IS NOT NULL;

-- Search results: individual name cards generated during a search
CREATE TABLE IF NOT EXISTS search_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  rationale TEXT,
  gradient TEXT,
  font_family TEXT,
  text_color TEXT,
  exact_domain TEXT,
  variants JSONB DEFAULT '[]'::jsonb,         -- array of variant domain strings
  domain_checks JSONB DEFAULT '{}'::jsonb,    -- cached domain check results
  is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  is_chosen BOOLEAN NOT NULL DEFAULT FALSE,
  batch_number INTEGER DEFAULT 1,
  position INTEGER DEFAULT 0,                 -- ordering within the search
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_search ON search_results(search_id, position);
CREATE INDEX IF NOT EXISTS idx_results_saved ON search_results(search_id) WHERE is_saved = TRUE;
CREATE INDEX IF NOT EXISTS idx_results_chosen ON search_results(search_id) WHERE is_chosen = TRUE;

-- Chat messages within a search
CREATE TABLE IF NOT EXISTS search_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system-event')),
  content TEXT NOT NULL DEFAULT '',
  suggested_changes JSONB,                    -- for config change proposals
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_search ON search_chat_messages(search_id, created_at);

-- Dividers that appear in the results grid (triggered by chat or config changes)
CREATE TABLE IF NOT EXISTS search_dividers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,                  -- card index where divider appears
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dividers_search ON search_dividers(search_id);

-- =============================================
-- Triggers for updated_at
-- =============================================

-- Reuse the function if it exists from the previous migration
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER components_updated_at BEFORE UPDATE ON project_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER searches_updated_at BEFORE UPDATE ON searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS policies (service role bypasses, but good practice)
-- =============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_dividers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON project_components FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON searches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON search_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON search_chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON search_dividers FOR ALL USING (true) WITH CHECK (true);
