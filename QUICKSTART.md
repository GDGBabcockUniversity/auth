# Quick Start Guide

Get the Auth Service running in **5 minutes**.

## Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)
- Firebase account

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select a project
3. Go to **Project Settings → Service Accounts**
4. Click **Generate New Private Key**
5. Save as `firebase-service-account.json` in project root

### 3. Create Database

```bash
# Create database
createdb auth_db

# Run schema
psql -d auth_db -f database/schema.sql
```

### 4. Configure Environment

Create `.env` file:

```bash
# Copy this and save as .env

PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Generate a secure secret (run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your-generated-secret-here

JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id

DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=your-password
```

Generate JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. Start Server

```bash
npm run dev
```

You should see:

```
✓ Firebase initialized
✓ Database connected

╔════════════════════════════════════════════════╗
║         Auth Service - Firebase SSO            ║
║  Server running at http://localhost:3000       ║
╚════════════════════════════════════════════════╝
```

## Test It

### 1. Health Check

```bash
curl http://localhost:3000/health
```

### 2. Get Firebase Token (Frontend)

```javascript
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const firebaseToken = await getIdToken(userCredential.user);
```

### 3. Login to Auth Service

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"firebase_token": "YOUR_FIREBASE_TOKEN"}'
```

Response:

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "gdg_member": false,
    "roles": ["user"]
  },
  "tokens": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "token_type": "Bearer",
    "expires_in": 86400
  }
}
```

### 4. Use Access Token

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## What's Next?

1. **Read the docs:**

   - `README.md` - Full API documentation
   - `docs/ARCHITECTURE.md` - System design
   - `docs/INTEGRATION_GUIDE.md` - Integrate with other services

2. **Integrate with your frontend:**

   - See `docs/INTEGRATION_GUIDE.md` for React example

3. **Integrate with other services:**
   - Copy the JWT validation middleware
   - Use `user_id` from token in your services

## Common Issues

### Firebase Error

```
Error: Failed to initialize Firebase
```

**Fix:** Check `firebase-service-account.json` exists and `FIREBASE_PROJECT_ID` matches your project.

### Database Error

```
Error: Database connection failed
```

**Fix:**

- Ensure PostgreSQL is running: `pg_isready`
- Check database exists: `psql -l | grep auth_db`
- Verify credentials in `.env`

### Token Validation Fails

```
Error: Invalid token
```

**Fix:**

- Ensure `JWT_SECRET` is set
- Check token format is `Bearer <token>`
- Verify token hasn't expired

## Production Deployment

Before deploying to production:

1. ✅ Generate strong `JWT_SECRET`
2. ✅ Set `NODE_ENV=production`
3. ✅ Configure proper `CORS_ORIGIN`
4. ✅ Use environment variables (not .env file)
5. ✅ Set up SSL/TLS
6. ✅ Configure database connection pooling
7. ✅ Set up monitoring and logging
8. ✅ Use Firebase production project

## Help

- **Documentation:** See `README.md` and `docs/` folder
- **Architecture:** `docs/ARCHITECTURE.md`
- **Integration:** `docs/INTEGRATION_GUIDE.md`
- **Issues:** Open an issue on GitHub

---

**Built with ❤️ by GDG Babcock University**
