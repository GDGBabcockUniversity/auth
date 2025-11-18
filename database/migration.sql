-- Migration script for existing databases
-- Run this if you have existing data you want to keep

-- Add new extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Rename existing fields
ALTER TABLE users RENAME COLUMN name TO full_name;
ALTER TABLE users RENAME COLUMN photo_url TO avatar_url;
ALTER TABLE users RENAME COLUMN phone_number TO whatsapp_number;

-- Drop removed fields
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
ALTER TABLE users DROP COLUMN IF EXISTS gdg_member;

-- Add new personal fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday TEXT;

-- Add student information fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS matric_no TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty TEXT;

-- Add GDG track fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_track TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_track TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_skill_level TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_skill_level TEXT;

-- Add teams array
ALTER TABLE users ADD COLUMN IF NOT EXISTS teams TEXT[] DEFAULT '{}';

-- Add TOS fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_agreed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_agreed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_version TEXT;

-- Update data types for better consistency
ALTER TABLE refresh_tokens ALTER COLUMN token_hash TYPE TEXT;
ALTER TABLE user_sessions ALTER COLUMN session_token TYPE TEXT;
ALTER TABLE auth_audit_log ALTER COLUMN event_type TYPE TEXT;

-- Update comments
COMMENT ON COLUMN users.teams IS 'Teams user belongs to (e.g., organizing team, tech team)';
COMMENT ON COLUMN users.primary_track IS 'User primary focus track (web, mobile, cloud, ai/ml, etc.)';
COMMENT ON COLUMN users.student_status IS 'Student status (undergraduate, postgraduate, alumni)';
COMMENT ON COLUMN users.tos_agreed IS 'Whether user has agreed to Terms of Service';

