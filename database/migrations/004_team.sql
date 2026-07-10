-- Phase 3: team roster + first-login seed data
-- Additive migration — applied on top of schema.sql + 002_events.sql + 003_radar.sql.
-- Idempotent (safe to re-run), same conventions as prior migrations.

-- Team roster, replacing the previously hardcoded GDGWebsite/lib/team-data.ts.
-- UNIQUE(name, team_year) exists specifically so the one-time importer (and
-- any future re-import) can upsert without duplicating rows.
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,               -- display title, e.g. "Organizer" — unrelated to users.roles
  section TEXT NOT NULL,            -- core | tracks | dev | media | events
  subteam TEXT,
  is_lead BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  words_to_live_by TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  spotify_track_name TEXT,
  spotify_track_artist TEXT,
  spotify_track_url TEXT,
  team_year TEXT NOT NULL DEFAULT 'current',
  display_order INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, team_year)
);

-- First-login autofill lookup, replacing the previously hardcoded (and
-- publicly-bundled) GDGWebsite/lib/member-seed-data.ts. Consulted by
-- AuthService.loginWithFirebase before the very first INSERT into users —
-- never touched after that (not a live sync).
CREATE TABLE IF NOT EXISTS member_seed_data (
  email TEXT PRIMARY KEY,           -- lowercased
  profile JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_members_year_order ON team_members(team_year, display_order);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
