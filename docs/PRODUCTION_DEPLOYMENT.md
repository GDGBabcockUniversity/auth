# Production Deployment Guide

This guide covers how to securely deploy the Auth Service to production without exposing sensitive credentials.

## 🔐 Firebase Credentials in Production

**⚠️ NEVER commit or deploy `firebase-service-account.json` to production!**

The code now supports 4 methods for Firebase authentication in production:

## Method 1: Environment Variable with JSON (RECOMMENDED) ⭐

Store the entire service account JSON as an environment variable.

### Setup

1. **Get your service account JSON content:**

```bash
cat firebase-service-account.json
```

2. **Set as environment variable:**

**For most hosting platforms (Heroku, Render, Railway, etc.):**

```bash
# Copy the entire JSON content and set it as FIREBASE_SERVICE_ACCOUNT
# Make sure to keep it as a single line or properly escaped
```

**For Docker:**

```dockerfile
ENV FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project",...}'
```

**For Vercel/Netlify:**

```bash
# In your dashboard, add environment variable:
# Key: FIREBASE_SERVICE_ACCOUNT
# Value: (paste entire JSON content)
```

**For Linux/Mac server:**

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

### Advantages

✅ Works on all platforms  
✅ No file management needed  
✅ Easy to rotate credentials  
✅ Single environment variable

### Disadvantages

❌ JSON can be large (multiple KB)  
❌ Some platforms have size limits on env vars

---

## Method 2: Individual Environment Variables

Break down the service account into separate environment variables.

### Setup

Extract these values from your `firebase-service-account.json`:

```bash
# Required environment variables
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Important:** The private key must include `\n` for newlines!

### For Different Platforms

**Heroku:**

```bash
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\n-----END PRIVATE KEY-----\n"
```

**Docker:**

```dockerfile
ENV FIREBASE_PROJECT_ID=your-project-id
ENV FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
ENV FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\n-----END PRIVATE KEY-----\n"
```

**Linux server (using .env file - but keep secure!):**

```bash
# .env.production (DO NOT COMMIT THIS)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

### Extract Private Key Correctly

```bash
# From your firebase-service-account.json
cat firebase-service-account.json | jq -r '.private_key'

# This will output the key with actual newlines
# You need to replace newlines with \n for the environment variable
# OR use this command:
cat firebase-service-account.json | jq -r '.private_key' | awk '{printf "%s\\n", $0}'
```

### Advantages

✅ More granular control  
✅ Easier to rotate individual values  
✅ Works with strict size limits

### Disadvantages

❌ Multiple environment variables to manage  
❌ Private key formatting can be tricky

---

## Method 3: Secret Management Services (BEST for Large Productions)

Use dedicated secret management services.

### Google Cloud Secret Manager

If deploying on Google Cloud:

```bash
# Store the service account in Secret Manager
gcloud secrets create firebase-service-account \
  --data-file=firebase-service-account.json

# Grant access to your service
gcloud secrets add-iam-policy-binding firebase-service-account \
  --member="serviceAccount:your-service@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Update code to fetch from Secret Manager:**

```javascript
// src/config/firebase.js
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

async function getFirebaseCredentials() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: "projects/YOUR_PROJECT_ID/secrets/firebase-service-account/versions/latest",
  });
  return JSON.parse(version.payload.data.toString());
}
```

### AWS Secrets Manager

```bash
# Store the service account
aws secretsmanager create-secret \
  --name firebase-service-account \
  --secret-string file://firebase-service-account.json

# Grant access via IAM policy
```

### HashiCorp Vault

```bash
# Store secret
vault kv put secret/firebase-service-account @firebase-service-account.json
```

### Advantages

✅ Enterprise-grade security  
✅ Automatic rotation  
✅ Audit logging  
✅ Fine-grained access control

### Disadvantages

❌ Additional service dependency  
❌ More complex setup  
❌ May have additional costs

---

## Method 4: Application Default Credentials (Google Cloud Only)

If deploying on **Google Cloud Platform** (App Engine, Cloud Run, GKE), you can use Application Default Credentials.

### Setup

1. **Assign Firebase Admin role to your service account:**

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"
```

2. **Just set the project ID:**

```bash
export FIREBASE_PROJECT_ID=your-project-id
```

3. **Deploy** - The Firebase Admin SDK will automatically use the service account attached to your Cloud Run/App Engine service.

### Advantages

✅ Zero credential management  
✅ Most secure (no secrets to leak)  
✅ Automatic credential rotation

### Disadvantages

❌ Only works on Google Cloud  
❌ Requires proper IAM setup

---

## 🚀 Platform-Specific Deployment Examples

### Heroku

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-auth-service

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables (Method 1 - Recommended)
heroku config:set FIREBASE_SERVICE_ACCOUNT="$(cat firebase-service-account.json | tr -d '\n')"
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set JWT_SECRET=$(openssl rand -hex 64)
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://yourfrontend.com

# Deploy
git push heroku main

# Run database migration
heroku run psql $DATABASE_URL -f database/schema.sql
```

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create project
railway init

# Add PostgreSQL
railway add

# Set environment variables
railway variables set FIREBASE_SERVICE_ACCOUNT="$(cat firebase-service-account.json)"
railway variables set FIREBASE_PROJECT_ID=your-project-id
railway variables set JWT_SECRET=$(openssl rand -hex 64)
railway variables set NODE_ENV=production

# Deploy
railway up
```

### Render

1. **Connect your GitHub repo**
2. **Create a new Web Service**
3. **Add PostgreSQL database**
4. **Set environment variables in dashboard:**
   - `FIREBASE_SERVICE_ACCOUNT` - paste JSON content
   - `FIREBASE_PROJECT_ID` - your project ID
   - `JWT_SECRET` - generate with `openssl rand -hex 64`
   - `NODE_ENV` - `production`
   - `DATABASE_URL` - (automatically set by Render)
5. **Add build command:** `npm install`
6. **Add start command:** `npm start`
7. **Deploy!**

### Docker

**Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Don't copy firebase-service-account.json!

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
```

**docker-compose.yml:**

```yaml
version: "3.8"

services:
  auth-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - FIREBASE_SERVICE_ACCOUNT=${FIREBASE_SERVICE_ACCOUNT}
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - JWT_SECRET=${JWT_SECRET}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=auth_db
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=auth_db
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

volumes:
  postgres_data:
```

**Deploy:**

```bash
# Create .env.production (DO NOT COMMIT)
cat > .env.production << EOF
FIREBASE_SERVICE_ACCOUNT=$(cat firebase-service-account.json)
FIREBASE_PROJECT_ID=your-project-id
JWT_SECRET=$(openssl rand -hex 64)
DB_PASSWORD=$(openssl rand -hex 32)
EOF

# Build and run
docker-compose --env-file .env.production up -d
```

### VPS (Digital Ocean, Linode, AWS EC2)

```bash
# SSH into server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Clone your repo
git clone https://github.com/your-username/auth.git
cd auth

# Install dependencies
npm install --production

# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_SECRET=$(openssl rand -hex 64)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=your-secure-password
CORS_ORIGIN=https://yourfrontend.com
EOF

# Secure the .env file
chmod 600 .env

# Set up PostgreSQL
sudo -u postgres psql << EOF
CREATE DATABASE auth_db;
CREATE USER authuser WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE auth_db TO authuser;
EOF

# Run schema
psql -U authuser -d auth_db -f database/schema.sql

# Install PM2 for process management
sudo npm install -g pm2

# Start the app
pm2 start app.js --name auth-service

# Set up PM2 to start on boot
pm2 startup
pm2 save

# Set up Nginx as reverse proxy
sudo apt-get install nginx

sudo cat > /etc/nginx/sites-available/auth-service << 'EOF'
server {
    listen 80;
    server_name auth.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/auth-service /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL certificate
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d auth.yourdomain.com
```

---

## 🔒 Security Best Practices

### 1. Environment Variables

```bash
# ✅ DO: Use secure secret generation
JWT_SECRET=$(openssl rand -hex 64)

# ❌ DON'T: Use weak secrets
JWT_SECRET=mysecret123
```

### 2. CORS Configuration

```bash
# ✅ DO: Specify exact origins in production
CORS_ORIGIN=https://yourfrontend.com,https://www.yourfrontend.com

# ❌ DON'T: Allow all origins in production
CORS_ORIGIN=*
```

### 3. Database Credentials

```bash
# ✅ DO: Use strong, randomly generated passwords
DB_PASSWORD=$(openssl rand -base64 32)

# ❌ DON'T: Use default or weak passwords
DB_PASSWORD=postgres
```

### 4. HTTPS

Always use HTTPS in production:

- Set up SSL certificates (Let's Encrypt is free)
- Redirect HTTP to HTTPS
- Set secure cookie flags

### 5. Firewall Rules

```bash
# Only allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## ✅ Production Checklist

Before deploying:

- [ ] Firebase credentials configured (NOT using file in production)
- [ ] Strong JWT_SECRET generated (`openssl rand -hex 64`)
- [ ] DATABASE_URL or DB credentials set
- [ ] NODE_ENV=production
- [ ] CORS_ORIGIN set to your frontend domain(s)
- [ ] Database schema migrated
- [ ] SSL/HTTPS enabled
- [ ] Firewall configured
- [ ] Environment variables secured (not in code)
- [ ] `.env` and `firebase-service-account.json` in `.gitignore`
- [ ] Health check endpoint working
- [ ] Logging configured
- [ ] Error monitoring set up (optional but recommended)

---

## 🧪 Testing Production Setup Locally

Test your production configuration before deploying:

```bash
# Create .env.production
cp .env .env.production

# Modify to use Method 1 (environment variable)
# Replace FIREBASE_SERVICE_ACCOUNT_PATH with FIREBASE_SERVICE_ACCOUNT

# Set the JSON content
export FIREBASE_SERVICE_ACCOUNT=$(cat firebase-service-account.json)

# Test
NODE_ENV=production node app.js
```

---

## 🐛 Troubleshooting

### Firebase initialization fails

**Error:** `Failed to initialize Firebase`

**Solutions:**

1. Check if environment variable is set: `echo $FIREBASE_SERVICE_ACCOUNT`
2. Verify JSON is valid: `echo $FIREBASE_SERVICE_ACCOUNT | jq .`
3. Check server logs for specific error message

### Private key format issues

**Error:** `Error parsing private key`

**Solution:**
Make sure newlines are properly escaped:

```bash
# The private key should have \n (not actual newlines)
echo "$FIREBASE_PRIVATE_KEY" | grep "\\n"
```

### Permission denied

**Error:** `Permission denied accessing Firebase`

**Solution:**
Verify the service account has the correct roles:

- Firebase Admin SDK Administrator Service Agent
- Service Account Token Creator

---

## 📚 Additional Resources

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Docker Security](https://docs.docker.com/engine/security/)

---

**Need help?** Open an issue or check the main documentation.
