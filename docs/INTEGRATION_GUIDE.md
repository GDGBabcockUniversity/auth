# Integration Guide for Other Services

This guide shows how to integrate your other platform services with the Auth Service.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│ Auth Service │────▶│  Firebase   │
│  (Frontend) │     │   (This)     │     │    Auth     │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       │ JWT Token          │
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│   Games     │     │  Analytics   │
│  Service    │     │   Service    │
└─────────────┘     └──────────────┘
```

**Key Principle:** Only the Auth Service talks to Firebase. All other services just validate JWTs.

## Frontend Integration

### 1. Firebase Client Setup

```javascript
// firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### 2. Login Flow

```javascript
// auth.js
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { auth } from "./firebase-config";

const AUTH_SERVICE_URL = "http://localhost:3000";

export async function login(email, password) {
  try {
    // Step 1: Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Step 2: Get Firebase ID token
    const firebaseToken = await getIdToken(userCredential.user);

    // Step 3: Exchange Firebase token for your platform JWT
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firebase_token: firebaseToken }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();

    // Step 4: Store tokens
    localStorage.setItem("access_token", data.tokens.access_token);
    localStorage.setItem("refresh_token", data.tokens.refresh_token);

    return data.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function logout() {
  const refreshToken = localStorage.getItem("refresh_token");
  const accessToken = localStorage.getItem("access_token");

  try {
    // Logout from Auth Service
    await fetch(`${AUTH_SERVICE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    // Clear local storage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
}
```

### 3. Token Refresh

```javascript
// token-refresh.js
const AUTH_SERVICE_URL = "http://localhost:3000";

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const data = await response.json();

    // Update access token
    localStorage.setItem("access_token", data.tokens.access_token);

    return data.tokens.access_token;
  } catch (error) {
    // Refresh failed - user needs to login again
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
    throw error;
  }
}

// Automatically refresh token on 401 errors
export async function fetchWithAuth(url, options = {}) {
  const accessToken = localStorage.getItem("access_token");

  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  };

  let response = await fetch(url, options);

  // If unauthorized, try refreshing token
  if (response.status === 401) {
    await refreshAccessToken();

    // Retry request with new token
    const newToken = localStorage.getItem("access_token");
    options.headers["Authorization"] = `Bearer ${newToken}`;
    response = await fetch(url, options);
  }

  return response;
}
```

### 4. React Hook Example

```javascript
// useAuth.js
import { useState, useEffect, createContext, useContext } from "react";
import { login, logout } from "./auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("access_token");
    if (token) {
      // Verify token and get user data
      fetch("http://localhost:3000/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUser(data.user);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (email, password) => {
    const userData = await login(email, password);
    setUser(userData);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login: handleLogin, logout: handleLogout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

## Backend Service Integration

### Node.js/Express Example

```javascript
// auth-middleware.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET; // Same secret as Auth Service

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "auth-service",
      audience: "platform-services",
    });

    // Attach user data to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

// Optional: Check specific roles
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: `${role} role required`,
      });
    }
    next();
  };
};

// Optional: Check GDG membership
const requireGDGMember = (req, res, next) => {
  if (!req.user || !req.user.gdg_member) {
    return res.status(403).json({
      success: false,
      error: "GDG membership required",
    });
  }
  next();
};

module.exports = { authenticateToken, requireRole, requireGDGMember };
```

### Using the Middleware

```javascript
// games-service/app.js
const express = require("express");
const { authenticateToken, requireGDGMember } = require("./auth-middleware");

const app = express();

// Public endpoint
app.get("/games", async (req, res) => {
  // Anyone can view games
  const games = await getGames();
  res.json({ games });
});

// Protected endpoint
app.post("/games/:id/play", authenticateToken, async (req, res) => {
  // Only logged-in users can play
  const userId = req.user.user_id;
  const result = await playGame(req.params.id, userId);
  res.json({ result });
});

// GDG-only endpoint
app.post(
  "/games/:id/tournament",
  authenticateToken,
  requireGDGMember,
  async (req, res) => {
    // Only GDG members can join tournaments
    const userId = req.user.user_id;
    const result = await joinTournament(req.params.id, userId);
    res.json({ result });
  }
);
```

### Python/Flask Example

```python
# auth_middleware.py
from functools import wraps
from flask import request, jsonify
import jwt
import os

JWT_SECRET = os.getenv('JWT_SECRET')

def authenticate_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({'error': 'Authentication required'}), 401

        try:
            token = auth_header.split(' ')[1]  # Bearer TOKEN
            decoded = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=['HS256'],
                issuer='auth-service',
                audience='platform-services'
            )
            request.user = decoded
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 403

    return decorated_function

# Usage
from flask import Flask
app = Flask(__name__)

@app.route('/protected')
@authenticate_token
def protected_route():
    user_id = request.user['user_id']
    return jsonify({'message': f'Hello user {user_id}'})
```

## Important Notes

### ✅ DO

- Store the JWT secret securely
- Validate tokens on every protected endpoint
- Use the same JWT secret across all services
- Extract `user_id` from token for database queries
- Use `gdg_member` and `roles` for authorization
- Handle token expiration gracefully

### ❌ DON'T

- Don't install Firebase SDK in other services
- Don't call Firebase Auth API directly
- Don't create your own user authentication
- Don't trust client-provided user IDs
- Don't skip token validation
- Don't hardcode the JWT secret

## Service Communication

When services need to communicate with each other:

```javascript
// games-service calls analytics-service
const serviceToken = localStorage.getItem("access_token"); // From client

const response = await fetch("http://analytics-service/api/track", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${serviceToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event: "game_played",
    game_id: "chess",
  }),
});
```

The analytics service validates the same JWT token.

## Database Queries

Always use the internal `user_id` from the JWT token:

```javascript
// ✅ CORRECT
app.post("/games/:id/score", authenticateToken, async (req, res) => {
  const userId = req.user.user_id; // From JWT token
  const { score } = req.body;

  await db.query(
    "INSERT INTO game_scores (user_id, game_id, score) VALUES ($1, $2, $3)",
    [userId, req.params.id, score]
  );

  res.json({ success: true });
});

// ❌ WRONG
app.post("/games/:id/score", async (req, res) => {
  const { user_id, score } = req.body; // Don't trust client!
  // ...
});
```

## Testing

Test your integration:

```bash
# 1. Get token from Auth Service
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"firebase_token": "..."}' \
  | jq -r '.tokens.access_token')

# 2. Use token in your service
curl http://localhost:4000/api/protected \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

**Token validation fails:**

- Ensure JWT_SECRET is identical across services
- Check issuer and audience match
- Verify token format is `Bearer <token>`

**User ID not found:**

- Use `req.user.user_id` not `req.user.id`
- Check token contains `user_id` claim

**Role check fails:**

- Roles are an array: `req.user.roles`
- Use `.includes()` not `===`
