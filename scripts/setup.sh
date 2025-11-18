#!/bin/bash

# Auth Service Setup Script

echo "=================================="
echo "Auth Service Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL from https://www.postgresql.org/"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL installed${NC}"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Check for .env file
echo ""
if [ ! -f .env ]; then
    echo -e "${YELLOW}! .env file not found${NC}"
    echo "Creating .env from template..."
    
    cat > .env << EOF
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# JWT Configuration
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=
EOF
    
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}! Please edit .env and add your Firebase and database credentials${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Check for Firebase service account
echo ""
if [ ! -f firebase-service-account.json ]; then
    echo -e "${YELLOW}! Firebase service account not found${NC}"
    echo "Please download your Firebase service account JSON and save it as:"
    echo "  firebase-service-account.json"
    echo ""
    echo "Steps:"
    echo "  1. Go to https://console.firebase.google.com/"
    echo "  2. Select your project"
    echo "  3. Go to Project Settings > Service Accounts"
    echo "  4. Click 'Generate New Private Key'"
    echo "  5. Save the file as firebase-service-account.json"
else
    echo -e "${GREEN}✓ Firebase service account found${NC}"
fi

# Check if database exists
echo ""
echo "Checking database..."
DB_EXISTS=$(psql -U postgres -lqt | cut -d \| -f 1 | grep -w auth_db | wc -l)

if [ $DB_EXISTS -eq 0 ]; then
    echo -e "${YELLOW}! Database 'auth_db' not found${NC}"
    read -p "Create database now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        createdb -U postgres auth_db
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Database created${NC}"
        else
            echo -e "${RED}✗ Failed to create database${NC}"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✓ Database 'auth_db' exists${NC}"
fi

# Run schema migration
echo ""
read -p "Run database migration? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    psql -U postgres -d auth_db -f database/schema.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database schema created${NC}"
    else
        echo -e "${RED}✗ Failed to create schema${NC}"
        exit 1
    fi
fi

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. Edit .env with your credentials"
echo "  2. Add firebase-service-account.json"
echo "  3. Run: npm run dev"
echo ""
echo "See docs/ENV_SETUP.md for detailed instructions"

