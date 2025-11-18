# Auth Service Architecture

## System Design

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  (Web, Mobile, Desktop - Any platform with Firebase SDK)    │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ 1. Firebase Auth
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    FIREBASE AUTH SERVICE                     │
│              (Identity Provider - Google)                    │
│  • Email/Password authentication                             │
│  • Google Sign-In                                           │
│  • Phone authentication                                      │
│  • Returns Firebase ID Token                                │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ 2. Firebase ID Token
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    AUTH SERVICE (This)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Layer                                             │ │
│  │  • /auth/* endpoints                                   │ │
│  │  • /admin/* endpoints                                  │ │
│  └─────────────────────┬──────────────────────────────────┘ │
│                        │                                     │
│  ┌─────────────────────▼──────────────────────────────────┐ │
│  │  Business Logic Layer                                  │ │
│  │  • AuthService    - Auth operations                    │ │
│  │  • UserModel      - User data operations               │ │
│  │  • JWT Utils      - Token generation/validation        │ │
│  └─────────────────────┬──────────────────────────────────┘ │
│                        │                                     │
│  ┌─────────────────────▼──────────────────────────────────┐ │
│  │  Data Layer                                            │ │
│  │  • PostgreSQL     - User profiles, sessions, audit     │ │
│  │  • Firebase Admin - User verification                  │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ 3. Platform JWT Token
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    PLATFORM SERVICES                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Games     │  │  Analytics  │  │   Wrapped   │         │
│  │  Service    │  │   Service   │  │   Service   │   ...   │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  • Validate JWT only                                        │
│  • Never touch Firebase                                     │
│  • Use user_id from token                                   │
└──────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### 1. Login Flow

```
┌────────┐                ┌──────────┐               ┌──────────┐
│ Client │                │ Firebase │               │   Auth   │
│        │                │   Auth   │               │ Service  │
└───┬────┘                └─────┬────┘               └────┬─────┘
    │                           │                         │
    │ 1. Login credentials      │                         │
    ├──────────────────────────►│                         │
    │                           │                         │
    │ 2. Firebase ID Token      │                         │
    │◄──────────────────────────┤                         │
    │                           │                         │
    │ 3. POST /auth/login       │                         │
    │    { firebase_token }     │                         │
    ├───────────────────────────┴────────────────────────►│
    │                                                      │
    │                           4. Verify token with       │
    │                              Firebase Admin SDK      │
    │                           ◄──────────────────────────┤
    │                                                      │
    │                           5. Get/Create user in DB   │
    │                           ◄──────────────────────────┤
    │                                                      │
    │                           6. Generate platform JWT   │
    │                           ◄──────────────────────────┤
    │                                                      │
    │ 7. Return JWT + user data                           │
    │◄─────────────────────────────────────────────────────┤
    │                                                      │
```

### 2. Protected Request Flow

```
┌────────┐                ┌──────────┐               ┌──────────┐
│ Client │                │   Auth   │               │  Other   │
│        │                │ Service  │               │ Service  │
└───┬────┘                └─────┬────┘               └────┬─────┘
    │                           │                         │
    │ 1. Request with JWT       │                         │
    ├───────────────────────────┴────────────────────────►│
    │   Authorization: Bearer token                       │
    │                                                      │
    │                           2. Validate JWT signature  │
    │                           ◄──────────────────────────┤
    │                                                      │
    │                           3. Extract user_id         │
    │                           ◄──────────────────────────┤
    │                                                      │
    │                           4. Process request         │
    │                           ◄──────────────────────────┤
    │                                                      │
    │ 5. Response                                         │
    │◄─────────────────────────────────────────────────────┤
    │                                                      │
```

### 3. Token Refresh Flow

```
┌────────┐                                      ┌──────────┐
│ Client │                                      │   Auth   │
│        │                                      │ Service  │
└───┬────┘                                      └────┬─────┘
    │                                                │
    │ 1. Access token expired (401 error)           │
    │◄──────────────────────────────────────────────┤
    │                                                │
    │ 2. POST /auth/refresh                         │
    │    { refresh_token }                          │
    ├───────────────────────────────────────────────►│
    │                                                │
    │                           3. Validate refresh  │
    │                              token in DB       │
    │                           ◄────────────────────┤
    │                                                │
    │                           4. Generate new      │
    │                              access token      │
    │                           ◄────────────────────┤
    │                                                │
    │ 5. Return new access token                    │
    │◄───────────────────────────────────────────────┤
    │                                                │
    │ 6. Retry original request                     │
    │                                                │
```

## Component Architecture

### API Layer

```
app.js (Express Server)
    ├── routes/authRoutes.js       - Authentication endpoints
    │   ├── POST /auth/login        - Login with Firebase
    │   ├── POST /auth/refresh      - Refresh token
    │   ├── POST /auth/logout       - Logout
    │   ├── GET  /auth/me           - Get current user
    │   ├── PUT  /auth/profile      - Update profile
    │   └── GET  /auth/verify       - Verify token
    │
    └── routes/adminRoutes.js      - Admin endpoints
        ├── GET    /admin/users/:id           - Get user
        ├── PUT    /admin/users/:id/gdg-member - Set GDG status
        ├── POST   /admin/users/:id/roles     - Add role
        └── DELETE /admin/users/:id/roles/:role - Remove role
```

### Business Logic Layer

```
services/
    └── authService.js
        ├── loginWithFirebase()      - Handle Firebase login
        ├── refreshAccessToken()     - Refresh JWT
        ├── logout()                 - Revoke tokens
        ├── storeRefreshToken()      - Store refresh token
        └── logAuthEvent()           - Audit logging

models/
    └── userModel.js
        ├── findByFirebaseUid()      - Find by Firebase UID
        ├── findById()               - Find by internal ID
        ├── findByEmail()            - Find by email
        ├── create()                 - Create user
        ├── update()                 - Update user
        ├── getProfile()             - Get safe profile
        └── hasRole() / addRole()    - Role management

utils/
    └── jwt.js
        ├── generateAccessToken()    - Generate JWT
        ├── generateRefreshToken()   - Generate refresh JWT
        └── verifyToken()            - Verify JWT
```

### Data Layer

```
PostgreSQL Database (auth_db)
    ├── users
    │   ├── id (UUID)              - Internal user ID
    │   ├── firebase_uid           - Firebase UID
    │   ├── email, name, etc.      - User profile
    │   ├── gdg_member (boolean)   - Custom field
    │   └── roles (text[])         - User roles
    │
    ├── refresh_tokens
    │   ├── id, user_id            - Token identification
    │   ├── token_hash             - Hashed refresh token
    │   ├── expires_at             - Expiration
    │   └── is_active              - Active status
    │
    ├── user_sessions (optional)
    │   └── Session tracking
    │
    └── auth_audit_log
        └── Authentication events for security

Firebase Admin SDK
    └── Used only by Auth Service
        ├── verifyIdToken()        - Verify Firebase tokens
        └── getUser()              - Get Firebase user data
```

## Security Architecture

### Token Security

1. **Firebase ID Token (Short-lived)**

   - Issued by Firebase
   - Valid for 1 hour
   - Used only for initial authentication
   - Never stored

2. **Platform Access Token (24 hours)**

   - Signed with HS256
   - Contains: user_id, email, roles, gdg_member
   - Issuer: `auth-service`
   - Audience: `platform-services`
   - Validated by all services

3. **Refresh Token (7 days)**
   - Stored hashed in database
   - Can be revoked
   - Used to get new access tokens
   - One refresh token per login

### Authorization Layers

```
1. Authentication Layer
   ├── JWT validation
   └── Token expiration check

2. Authorization Layer
   ├── Role-based access control (RBAC)
   │   ├── user    - Basic access
   │   ├── admin   - Full access
   │   └── moderator - Limited admin
   │
   └── Custom attributes
       └── gdg_member - GDG-specific features
```

## Database Schema Design

### Users Table

```sql
users (Central user storage)
├── id (UUID, PK)                  - Internal ID for all services
├── firebase_uid (VARCHAR, UNIQUE) - Links to Firebase
├── email (VARCHAR, UNIQUE)        - User email
├── name, display_name             - User names
├── photo_url                      - Profile picture
├── email_verified (BOOLEAN)       - Email verification status
├── phone_number                   - Phone number
├── gdg_member (BOOLEAN)           - Custom field
├── roles (TEXT[])                 - User roles array
├── created_at, updated_at         - Timestamps
├── last_login_at                  - Last login time
└── is_active, deleted_at          - Soft delete
```

**Why this design?**

- `id` (UUID): Platform-wide user identifier
- `firebase_uid`: Links to Firebase identity
- Extensible with custom fields (gdg_member, roles)
- Supports soft delete for data retention
- Tracks user activity (last_login_at)

### Refresh Tokens Table

```sql
refresh_tokens
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── token_hash (VARCHAR)           - SHA256 hash of token
├── expires_at (TIMESTAMP)         - Expiration date
├── is_active (BOOLEAN)            - Can be revoked
├── created_at
├── revoked_at                     - When revoked
├── ip_address (INET)              - Security tracking
└── user_agent (TEXT)              - Device tracking
```

**Why hash tokens?**

- Even if DB is compromised, tokens can't be used
- SHA256 one-way hashing
- Similar to password hashing

## Scalability Considerations

### Horizontal Scaling

```
         ┌─────────────────┐
         │  Load Balancer  │
         └────────┬────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
┌─────▼─────┐ ┌──▼──────┐ ┌──▼──────┐
│ Auth Svc  │ │Auth Svc │ │Auth Svc │
│ Instance  │ │Instance │ │Instance │
└─────┬─────┘ └──┬──────┘ └──┬──────┘
      │          │           │
      └──────────┼───────────┘
                 │
         ┌───────▼────────┐
         │   PostgreSQL   │
         │    (Primary)   │
         └────────────────┘
```

**Stateless Design:**

- No session storage in memory
- All state in database
- Can scale horizontally by adding instances
- Load balancer distributes requests

### Database Scaling

```
┌──────────────┐
│  Primary DB  │ ◄────── Writes
└──────┬───────┘
       │ Replication
       ├────────────────┐
       │                │
┌──────▼───────┐  ┌─────▼────────┐
│ Read Replica │  │ Read Replica │ ◄─── Reads
└──────────────┘  └──────────────┘
```

**Read/Write Split:**

- Write operations → Primary
- Read operations → Replicas
- Token validation → Replicas (high frequency)
- User creation → Primary (low frequency)

### Caching Strategy (Future)

```
┌────────┐     ┌───────┐     ┌──────────┐
│ Client │────►│ Redis │────►│   Auth   │
└────────┘     └───────┘     │ Service  │
                              └──────────┘
Token Validation Cache
- Cache JWT public key
- Cache user roles (5 min TTL)
- Reduce database queries
```

## Monitoring & Observability

### Key Metrics

1. **Authentication Metrics**

   - Login success/failure rate
   - Token refresh rate
   - Average login time

2. **Performance Metrics**

   - API response times
   - Database query times
   - Firebase API latency

3. **Security Metrics**
   - Failed login attempts
   - Token validation failures
   - Unusual activity patterns

### Audit Logging

All authentication events logged in `auth_audit_log`:

- User logins/logouts
- Token refreshes
- Role changes
- Profile updates
- Failed authentication attempts

## Technology Stack

| Component         | Technology            | Why                                                |
| ----------------- | --------------------- | -------------------------------------------------- |
| Runtime           | Node.js               | JavaScript ecosystem, async I/O                    |
| Framework         | Express               | Simple, flexible, widely used                      |
| Database          | PostgreSQL            | ACID compliance, JSON support, mature              |
| Identity Provider | Firebase Auth         | Production-ready, free tier, multiple auth methods |
| Token Format      | JWT                   | Stateless, standard, widely supported              |
| Language          | JavaScript (CommonJS) | Team familiarity, rapid development                |

## Design Principles

1. **Single Responsibility**: Auth Service only handles authentication
2. **Separation of Concerns**: Clear separation of API, business logic, and data layers
3. **Stateless**: No server-side session storage
4. **Security by Design**: Token hashing, audit logging, validation at every step
5. **Scalability**: Horizontal scaling capability
6. **Maintainability**: Clear code structure, documentation
7. **Flexibility**: Easy to add new auth providers or custom fields

## Why This Architecture?

### ✅ Advantages

1. **Centralized Control**: One place to manage all users
2. **Consistent User IDs**: Single `user_id` across platform
3. **Cost Effective**: One Firebase connection, not N connections
4. **Security**: Only Auth Service has Firebase credentials
5. **Flexibility**: Easy to add custom user fields
6. **Analytics Ready**: Consistent user tracking
7. **Audit Trail**: Complete authentication history
8. **Scalable**: Can handle growth
9. **Standard**: Uses industry-standard JWT

### ⚠️ Trade-offs

1. **Single Point of Failure**: If Auth Service is down, authentication fails
   - Mitigated by: High availability, load balancing, monitoring
2. **Latency**: Extra hop through Auth Service
   - Mitigated by: Fast validation, token caching (future)
3. **Complexity**: More moving parts than direct Firebase
   - Justified by: Platform requirements (wrapped, analytics)

## Future Enhancements

1. **Redis Caching**: Cache user profiles and roles
2. **Rate Limiting**: Prevent brute force attacks
3. **OAuth2 Support**: Add GitHub, Twitter, etc.
4. **2FA**: Two-factor authentication
5. **WebAuthn**: Passwordless authentication
6. **Session Management**: Better device tracking
7. **GraphQL API**: Alternative to REST
8. **Metrics Dashboard**: Real-time monitoring UI
