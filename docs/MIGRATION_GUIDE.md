# Migration Guide: GDG Fields Integration

This guide explains all the changes made to integrate GDG Babcock-specific fields into the Auth Service.

## 📝 Summary of Changes

### Database Schema Changes

#### Updated Extension

```sql
-- Changed from
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- To
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

**Reason:** `pgcrypto` provides `gen_random_uuid()` which is more modern and widely supported.

#### Removed Fields

- `name` → Replaced with `full_name`
- `display_name` → Consolidated into `full_name`
- `photo_url` → Replaced with `avatar_url`
- `phone_number` → Replaced with `whatsapp_number`
- `gdg_member` → Removed (not needed for GDG Babcock)

#### Added Fields

```sql
-- Personal Information
full_name TEXT
whatsapp_number TEXT
avatar_url TEXT
gender TEXT
birthday TEXT

-- Student Information
student_status TEXT      -- "undergraduate", "postgraduate", "alumni"
matric_no TEXT
department TEXT
faculty TEXT

-- GDG Tracks & Skills
primary_track TEXT       -- "web", "mobile", "cloud", "ai/ml", "design", "data"
secondary_track TEXT
primary_skill_level TEXT -- "beginner", "intermediate", "advanced"
secondary_skill_level TEXT

-- Teams
teams TEXT[]            -- Array of team names

-- Terms of Service
tos_agreed BOOLEAN DEFAULT FALSE
tos_agreed_at TIMESTAMP WITH TIME ZONE
tos_version TEXT
```

## 🔄 Migration Steps

### Step 1: Backup Existing Database

```bash
# Backup current database
pg_dump -U postgres auth_db > backup_before_migration.sql
```

### Step 2: Update Database Schema

If you have an existing database, run this migration:

```sql
-- Add new extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Rename fields
ALTER TABLE users RENAME COLUMN name TO full_name;
ALTER TABLE users RENAME COLUMN photo_url TO avatar_url;
ALTER TABLE users RENAME COLUMN phone_number TO whatsapp_number;

-- Drop old fields
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
ALTER TABLE users DROP COLUMN IF EXISTS gdg_member;

-- Add new fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS matric_no TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_track TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_track TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_skill_level TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_skill_level TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS teams TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_agreed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_agreed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_version TEXT;

-- Update refresh_tokens to use TEXT instead of VARCHAR
ALTER TABLE refresh_tokens ALTER COLUMN token_hash TYPE TEXT;

-- Update sessions to use TEXT
ALTER TABLE user_sessions ALTER COLUMN session_token TYPE TEXT;

-- Update audit log
ALTER TABLE auth_audit_log ALTER COLUMN event_type TYPE TEXT;
```

### Step 3: Drop and Recreate (Alternative - For Fresh Start)

If you're starting fresh or can afford to lose existing data:

```bash
# Drop existing database
dropdb auth_db

# Create new database
createdb auth_db

# Run new schema
psql -d auth_db -f database/schema.sql
```

## 📦 Code Changes

### Updated Files

#### 1. `database/schema.sql`

- ✅ Updated to use `pgcrypto`
- ✅ Added all GDG-specific fields
- ✅ Changed VARCHAR to TEXT for better flexibility

#### 2. `src/models/userModel.js`

- ✅ Updated `create()` method to handle new fields
- ✅ Updated `update()` method to allow new fields
- ✅ Updated `getProfile()` to return new fields
- ✅ Added `addTeam()` and `removeTeam()` methods
- ✅ Added `hasTOSAgreed()` and `recordTOSAgreement()` methods
- ✅ Added `getUsersByTrack()` method
- ✅ Added `getUsersByTeam()` method
- ✅ Added `getStudentsByDepartment()` method

#### 3. `src/services/authService.js`

- ✅ Updated to use new field names (fullName, avatarUrl, whatsappNumber)
- ✅ Updated JWT payload to include new fields (teams, primary_track, student_status)
- ✅ Updated token refresh to include new fields

#### 4. `src/controllers/authController.js`

- ✅ Updated profile update to properly restrict protected fields

#### 5. `src/routes/authRoutes.js`

- ✅ Added `POST /auth/tos/agree` endpoint

#### 6. `src/routes/adminRoutes.js`

- ✅ Added team management endpoints
- ✅ Added track/team/department query endpoints

#### 7. `src/middleware/authMiddleware.js`

- ✅ Added `requireTOSAgreement` middleware

## 🔌 API Changes

### New Endpoints

```http
# TOS Agreement
POST /auth/tos/agree
Body: { "version": "1.0.0" }

# Team Management (Admin only)
POST /admin/users/:userId/teams
DELETE /admin/users/:userId/teams/:team

# Queries (Admin only)
GET /admin/tracks/:track/users
GET /admin/teams/:team/users
GET /admin/departments/:department/students
```

### Updated Responses

#### Login Response (Before)

```json
{
  "user": {
    "name": "John Doe",
    "display_name": "John",
    "photo_url": "...",
    "gdg_member": false
  }
}
```

#### Login Response (After)

```json
{
  "user": {
    "full_name": "John Doe",
    "avatar_url": "...",
    "whatsapp_number": "+234...",
    "student_status": "undergraduate",
    "primary_track": "web",
    "secondary_track": "mobile",
    "teams": ["tech", "organizing"],
    "tos_agreed": true
  }
}
```

### JWT Token Changes

#### Before

```json
{
  "user_id": "...",
  "name": "...",
  "gdg_member": false
}
```

#### After

```json
{
  "user_id": "...",
  "full_name": "...",
  "teams": ["tech"],
  "primary_track": "web",
  "student_status": "undergraduate"
}
```

## 🎨 Frontend Updates Needed

### 1. Update Field Names

```javascript
// OLD
user.name;
user.photo_url;
user.phone_number;
user.gdg_member;

// NEW
user.full_name;
user.avatar_url;
user.whatsapp_number;
user.teams(array);
```

### 2. Add Profile Form Fields

Add inputs for:

- `whatsapp_number`
- `gender`
- `birthday`
- `student_status` (dropdown)
- `matric_no`
- `department`
- `faculty`
- `primary_track` (dropdown)
- `secondary_track` (dropdown)
- `primary_skill_level` (dropdown)
- `secondary_skill_level` (dropdown)

See `docs/GDG_FIELDS.md` for complete form example.

### 3. Add TOS Flow

```javascript
// Check if user has agreed to TOS
if (!user.tos_agreed) {
  // Show TOS agreement modal
  showTOSModal();
}

// Record agreement
await fetch("/auth/tos/agree", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ version: "1.0.0" }),
});
```

## ✅ Testing Checklist

After migration, test:

- [ ] User signup creates user with new fields
- [ ] User login returns new field structure
- [ ] Profile update accepts new fields
- [ ] TOS agreement endpoint works
- [ ] Team management endpoints work (admin)
- [ ] Track/team/department queries work (admin)
- [ ] JWT tokens contain new fields
- [ ] Token refresh works with new fields
- [ ] Existing users still login successfully
- [ ] Database constraints work (unique email, etc.)

## 🐛 Troubleshooting

### Error: relation "users" does not exist

**Solution:** Run `psql -d auth_db -f database/schema.sql`

### Error: column "name" does not exist

**Solution:** Run the migration SQL to rename columns, or drop and recreate database

### Error: function gen_random_uuid() does not exist

**Solution:** Run `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` in your database

### JWT doesn't contain new fields

**Solution:** User needs to logout and login again to get new JWT with updated fields

## 📚 Additional Documentation

- `docs/GDG_FIELDS.md` - Complete guide to GDG-specific fields and features
- `README.md` - General API documentation
- `docs/INTEGRATION_GUIDE.md` - Frontend integration guide
- `docs/ARCHITECTURE.md` - System architecture

## 🎯 Next Steps

1. **Backup your database** ⚠️
2. **Run migration** (choose Step 2 or Step 3 above)
3. **Update frontend** to use new field names
4. **Add profile forms** for new fields
5. **Add TOS agreement** flow
6. **Test thoroughly** using the checklist
7. **Deploy** 🚀

---

**Questions?** Check the documentation or open an issue.
