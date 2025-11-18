# Auth Service - Firebase SSO (Simplified)

This is a simplified, production-ready authentication service that uses Firebase as an identity provider. It provides a central auth hub for your platform, issuing its own JWTs so that your other services don't need to interact with Firebase directly.

This streamlined version focuses on the core functionality: login, token management, and profile updates.

## ✨ Core Features

- **Firebase Integration**: Securely validates users via Firebase.
- **Central User Database**: Stores user profiles in your own PostgreSQL database.
- **JWT Token Management**: Issues, refreshes, and validates your platform's own JWTs.
- **Profile Management**: Endpoints for users to view and update their profile.
- **Role-Based Access**: Supports user roles in the JWT for authorization in other services.
- **GDG-Specific Schema**: Includes fields tailored for GDG Babcock members.

## 🚀 Setup Guide (Vercel + Neon)

This guide is optimized for deploying to Vercel with a Neon database.

### 1. Local Setup

**A. Install Dependencies:**

```bash
npm install
```

**B. Set up PostgreSQL:**

- Install PostgreSQL locally.
- Create a database:
  ```bash
  createdb auth_db
  ```
- Run the schema migration:
  ```bash
  psql -d auth_db -f database/schema.sql
  ```

**C. Create `.env` file:**
Create a file named `.env` and fill it with your local credentials.

```env
# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# JWT (generate one for local testing)
JWT_SECRET=your-super-secret-jwt-key-for-local-dev

# Firebase (for local dev)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id

# Local Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=your-local-db-password
```

**D. Get Firebase Credentials:**

- Go to your **Firebase Project Settings → Service Accounts**.
- Click **"Generate new private key"**.
- Save the downloaded file as `firebase-service-account.json` in your project root.

**E. Run the server:**

```bash
npm run dev
```

### 2. Vercel Deployment

**A. Create a `vercel.json` file:**
Create a file named `vercel.json` in your project root. This tells Vercel how to run your server.

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.js"
    }
  ]
}
```

**B. Set Up a Neon Database:**

- Go to [neon.tech](https://neon.tech) and create a free PostgreSQL database.
- Find the **Connection String** for your new database.

**C. Configure Vercel Environment Variables:**

- Go to your Vercel project **Settings → Environment Variables**.
- Add the following secrets:

| Variable Name              | How to Get the Value                                                                                        |
| :------------------------- | :---------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Your Neon connection string. **IMPORTANT:** Add `?sslmode=require` to the end.                              |
| `FIREBASE_SERVICE_ACCOUNT` | In your terminal, run `cat firebase-service-account.json \| tr -d '\n'` and paste the output.               |
| `FIREBASE_PROJECT_ID`      | Copy the `project_id` from your `firebase-service-account.json` file.                                       |
| `JWT_SECRET`               | Run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` to generate a secure secret. |
| `CORS_ORIGIN`              | The URL of your deployed frontend (e.g., `https://your-app.vercel.app`).                                    |
| `NODE_ENV`                 | `production`                                                                                                |

**D. Deploy:**

- Push your code to GitHub. Vercel will build and deploy it.

**E. Run Production Database Migration:**

- In the Neon dashboard, find the PSQL command to connect.
- Run it from your terminal with the schema file:
  ```bash
  psql "YOUR_NEON_CONNECTION_STRING" -f database/schema.sql
  ```

## 📡 API Endpoints

- `POST /auth/login`: Exchange a Firebase token for a platform JWT.
- `POST /auth/refresh`: Get a new access token using a refresh token.
- `POST /auth/logout`: Revoke a refresh token.
- `GET /auth/me`: Get the current user's profile.
- `PUT /auth/profile`: Update the current user's profile.
- `GET /auth/verify`: Check if the current JWT is valid.
- `GET /health`: Health check endpoint.

## Frontend Integration Example

```javascript
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { auth as firebaseAuth } from "./firebase-config"; // Your Firebase client config

const AUTH_API_URL = "https://your-auth-service.vercel.app";

async function login(email, password) {
  // 1. Authenticate with Firebase client-side
  const userCredential = await signInWithEmailAndPassword(
    firebaseAuth,
    email,
    password
  );

  // 2. Get the Firebase ID token
  const firebaseToken = await getIdToken(userCredential.user);

  // 3. Exchange the Firebase token for your platform's JWT
  const response = await fetch(`${AUTH_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firebase_token: firebaseToken }),
  });

  const { tokens, user } = await response.json();

  // 4. Store your tokens and use them for API requests
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);

  return user;
}
```
