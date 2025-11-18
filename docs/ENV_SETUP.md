# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Firebase Configuration
# Option 1: Use service account JSON file (recommended for development)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id

# Option 2: Use application default credentials (recommended for production)
# Just set FIREBASE_PROJECT_ID and configure credentials via gcloud or environment

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=your-database-password
```

## Firebase Setup Steps

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to **Project Settings** (gear icon)
4. Navigate to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the downloaded JSON file as `firebase-service-account.json` in your project root
7. Copy the Project ID and set it as `FIREBASE_PROJECT_ID` in `.env`

## Database Setup

### 1. Install PostgreSQL

**Windows:**

```bash
# Download from https://www.postgresql.org/download/windows/
```

**macOS:**

```bash
brew install postgresql
brew services start postgresql
```

**Linux:**

```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Create database
createdb auth_db

# Or using psql
psql -U postgres
CREATE DATABASE auth_db;
\q
```

### 3. Run Schema Migration

```bash
psql -U postgres -d auth_db -f database/schema.sql
```

### 4. Verify Database

```bash
psql -U postgres -d auth_db

# List tables
\dt

# You should see: users, refresh_tokens, user_sessions, auth_audit_log
```

## JWT Secret Generation

Generate a secure JWT secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64
```

Copy the output and use it as `JWT_SECRET` in your `.env` file.

## Verification

After setup, verify your configuration:

1. **Start the server:**

```bash
npm run dev
```

2. **Check the startup logs:**

```
✓ Firebase initialized
✓ Database connected
```

3. **Test health endpoint:**

```bash
curl http://localhost:3000/health
```

You should see:

```json
{
  "success": true,
  "service": "auth-service",
  "status": "healthy",
  "timestamp": "..."
}
```

## Troubleshooting

### Firebase Initialization Error

**Error:** `Failed to initialize Firebase`

**Solutions:**

- Verify `firebase-service-account.json` exists and is valid JSON
- Check `FIREBASE_PROJECT_ID` matches your Firebase project
- Ensure service account has proper permissions in Firebase Console

### Database Connection Error

**Error:** `Database connection failed`

**Solutions:**

- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure database `auth_db` exists
- Check firewall/network settings

### JWT Token Issues

**Error:** `Invalid token`

**Solutions:**

- Verify `JWT_SECRET` is set correctly
- Ensure token hasn't expired
- Check token format is `Bearer <token>`
- Verify issuer and audience match

## Production Setup

For production deployment:

1. **Use strong secrets:**

```bash
JWT_SECRET=$(openssl rand -hex 64)
```

2. **Enable HTTPS:**

```bash
CORS_ORIGIN=https://yourdomain.com
```

3. **Use environment-specific Firebase project**

4. **Set NODE_ENV:**

```bash
NODE_ENV=production
```

5. **Use connection pooling for database**

6. **Set up monitoring and logging**

7. **Configure reverse proxy (nginx/Apache)**
