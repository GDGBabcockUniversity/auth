-- Wrapped 2025/26: precomputed per-member snapshots + chapter aggregates.
-- Additive and idempotent, following 003_radar.sql conventions.
-- Written by the wrapped pipeline (scripts/pipeline in the wrapped repo);
-- read by the wrapped app. The auth service itself does not use these tables.

CREATE TABLE IF NOT EXISTS wrapped_snapshots (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  year        TEXT NOT NULL DEFAULT '2025-2026',
  data        JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wrapped_meta (
  key        TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wrapped_snapshots_email
  ON wrapped_snapshots (lower(email));
