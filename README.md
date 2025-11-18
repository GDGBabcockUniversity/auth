# Auth Service - Firebase SSO

Central authentication service for your platform using Firebase as the identity provider. This service provides single sign-on (SSO) capabilities across all your platform services.

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   Auth Service (This Backend)          │
│   - Wraps Firebase Auth                 │
│   - Central user profiles DB            │
│   - Issues your own JWTs                │
│   - Syncs with Firebase                 │
└─────────────────────────────────────────┘
          │
          │ JWT with user_id
          ▼
    All Other Services
    (Just validate JWT, never touch Firebase)
```

## ✨ Features

- **Firebase Integration**: Secure authentication via Firebase Auth
- **Central User Database**: Single source of truth for user data
- **JWT Token Management**: Issue and validate JWT tokens with custom claims
- **Role-Based Access Control**: Support for user roles (admin, moderator, user)
- **GDG Member Tracking**: Custom field for GDG Babcock membership
- **Refresh Token Support**: Long-lived refresh tokens for token rotation
- **Audit Logging**: Track authentication events for security
- **Admin API**: Manage users, roles, and permissions

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Firebase project with Admin SDK credentials

### Installation

1. **Clone and install dependencies**

```bash
npm install
```

2. **Set up PostgreSQL database**

```bash
# Create database
createdb auth_db

# Run schema migration
psql -d auth_db -f database/schema.sql
```

3. **Configure environment variables**

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
```

4. **Set up Firebase**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a project or use existing one
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Save as `firebase-service-account.json` in project root
   - Update `FIREBASE_PROJECT_ID` in `.env`

5. **Start the server**

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Authentication Endpoints

#### POST `/auth/login`

Login with Firebase token

**Request:**

```json
{
  "firebase_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response:**

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
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 86400
  }
}
```

#### POST `/auth/refresh`

Refresh access token

**Request:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**

```json
{
  "success": true,
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 86400
  }
}
```

#### POST `/auth/logout`

Logout and revoke refresh token (requires authentication)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### GET `/auth/me`

Get current user profile (requires authentication)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "display_name": "John",
    "photo_url": "https://...",
    "email_verified": true,
    "gdg_member": true,
    "roles": ["user", "gdg_member"],
    "created_at": "2024-01-01T00:00:00Z",
    "last_login_at": "2024-01-15T12:00:00Z"
  }
}
```

#### PUT `/auth/profile`

Update user profile (requires authentication)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request:**

```json
{
  "name": "John Smith",
  "display_name": "Johnny",
  "phone_number": "+1234567890"
}
```

#### GET `/auth/verify`

Verify token validity (requires authentication)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "valid": true,
  "user": {
    "user_id": "uuid",
    "email": "user@example.com",
    "roles": ["user"]
  }
}
```

### Admin Endpoints

All admin endpoints require authentication and admin role.

#### GET `/admin/users/:userId`

Get user by ID

#### PUT `/admin/users/:userId/gdg-member`

Set user's GDG member status

**Request:**

```json
{
  "gdg_member": true
}
```

#### POST `/admin/users/:userId/roles`

Add role to user

**Request:**

```json
{
  "role": "moderator"
}
```

#### DELETE `/admin/users/:userId/roles/:role`

Remove role from user

### Health Check

#### GET `/health`

Check service health

**Response:**

```json
{
  "success": true,
  "service": "auth-service",
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## 🔐 JWT Token Structure

Access tokens contain the following claims:

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["user", "admin"],
  "gdg_member": true,
  "iss": "auth-service",
  "aud": "platform-services",
  "exp": 1234567890,
  "iat": 1234567890
}
```

## 🔒 Using Auth in Other Services

Other services should **NEVER** talk to Firebase directly. Instead, they validate the JWT tokens issued by this service.

### Example Middleware (Express)

```javascript
const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Use in routes
app.get("/protected", authenticateToken, (req, res) => {
  res.json({ user_id: req.user.user_id });
});
```

### Example: Check GDG Member Status

```javascript
app.get("/gdg-only", authenticateToken, (req, res) => {
  if (!req.user.gdg_member) {
    return res.status(403).json({ error: "GDG membership required" });
  }

  res.json({ message: "Welcome GDG member!" });
});
```

### Example: Check User Roles

```javascript
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user.roles.includes(role)) {
      return res.status(403).json({ error: `${role} role required` });
    }
    next();
  };
};

app.get("/admin-only", authenticateToken, requireRole("admin"), (req, res) => {
  res.json({ message: "Admin access granted" });
});
```

## 🧪 Testing the Service

### 1. Test with Firebase (Frontend)

```javascript
// In your frontend
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";

// Sign in with Firebase
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const firebaseToken = await getIdToken(userCredential.user);

// Login to your Auth Service
const response = await fetch("http://localhost:3000/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ firebase_token: firebaseToken }),
});

const { user, tokens } = await response.json();

// Use access_token for subsequent requests
localStorage.setItem("access_token", tokens.access_token);
localStorage.setItem("refresh_token", tokens.refresh_token);
```

### 2. Test with cURL

```bash
# Login (you need a valid Firebase token)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"firebase_token": "YOUR_FIREBASE_TOKEN"}'

# Get profile
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Verify token
curl http://localhost:3000/auth/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📊 Database Schema

The service uses the following tables:

- **users**: Central user storage
- **refresh_tokens**: Active refresh tokens
- **user_sessions**: Optional session tracking
- **auth_audit_log**: Authentication event logging

See `database/schema.sql` for complete schema.

## 🔧 Configuration

### Environment Variables

| Variable                        | Description                  | Default              |
| ------------------------------- | ---------------------------- | -------------------- |
| `PORT`                          | Server port                  | `3000`               |
| `NODE_ENV`                      | Environment                  | `development`        |
| `JWT_SECRET`                    | Secret for signing JWTs      | _(required)_         |
| `JWT_EXPIRES_IN`                | Access token expiry          | `24h`                |
| `REFRESH_TOKEN_EXPIRES_IN`      | Refresh token expiry         | `7d`                 |
| `FIREBASE_PROJECT_ID`           | Firebase project ID          | _(required)_         |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON | _(required for dev)_ |
| `DB_HOST`                       | PostgreSQL host              | `localhost`          |
| `DB_PORT`                       | PostgreSQL port              | `5432`               |
| `DB_NAME`                       | Database name                | `auth_db`            |
| `DB_USER`                       | Database user                | `postgres`           |
| `DB_PASSWORD`                   | Database password            | _(required)_         |
| `CORS_ORIGIN`                   | CORS allowed origins         | `*`                  |

## 🛡️ Security Best Practices

1. **Never commit** `firebase-service-account.json` or `.env` files
2. **Use strong JWT secrets** in production
3. **Enable HTTPS** in production (set `CORS_ORIGIN` appropriately)
4. **Rotate secrets** regularly
5. **Monitor audit logs** for suspicious activity
6. **Set up rate limiting** for auth endpoints
7. **Use environment-specific** Firebase projects

## 📝 License

ISC

## 👥 Contributing

This is a GDG Babcock University project.

## 📞 Support

For issues or questions, please open an issue on the GitHub repository.
