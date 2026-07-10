-- Phase 2: RADAR game scores + reading activity
-- Additive migration — applied on top of schema.sql + 002_events.sql.
-- Idempotent (safe to re-run), same conventions as 002_events.sql.

-- One row per game play (history, feeds future leaderboards/analytics).
CREATE TABLE IF NOT EXISTS radar_game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game TEXT NOT NULL,          -- 'crossword' | 'quiz' | ...
  puzzle_id TEXT,
  score INTEGER NOT NULL,
  meta JSONB,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- One row per (user, article) — accumulates reading time across sessions.
-- radar_articles_read = COUNT(*); radar_reading_minutes = SUM(seconds)/60.
CREATE TABLE IF NOT EXISTS radar_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_radar_game_scores_user_id ON radar_game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_radar_game_scores_game ON radar_game_scores(game);
CREATE INDEX IF NOT EXISTS idx_radar_reads_user_id ON radar_reads(user_id);
