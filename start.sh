#!/bin/bash

# FashionistApp Quick Start Script
# This script sets up and runs the FashionistApp

set -e  # Exit on error

echo "🎨 FashionistApp Quick Start Script"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js 20.x or higher from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: PostgreSQL is not installed"
    echo "Please install PostgreSQL 16.x or higher"
    exit 1
fi

echo "✓ PostgreSQL is installed"

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "⚠️  PostgreSQL is not running. Attempting to start..."
    
    # Try to start PostgreSQL (Ubuntu/Debian)
    if command -v service &> /dev/null; then
        sudo service postgresql start
    # Try Homebrew (macOS)
    elif command -v brew &> /dev/null; then
        brew services start postgresql
    else
        echo "❌ Unable to start PostgreSQL automatically"
        echo "Please start PostgreSQL manually and run this script again"
        exit 1
    fi
    
    sleep 2
    
    if ! pg_isready -h localhost -p 5432 &> /dev/null; then
        echo "❌ Failed to start PostgreSQL"
        exit 1
    fi
fi

echo "✓ PostgreSQL is running"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    echo "✓ Dependencies installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env file..."
    
    # Generate a random password for the database
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    cat > .env << EOF
# Database configuration
DATABASE_URL=postgresql://fashionuser:${DB_PASSWORD}@localhost:5432/fashionistapp

# AI Service API Keys (optional for basic startup)
OPENAI_API_KEY=sk-placeholder
GEMINI2APIKEY=placeholder-key
EOF
    echo "✓ .env file created with secure random database password"
    echo ""
    echo "⚠️  Note: AI features require valid API keys"
    echo "   Update .env with your API keys to enable full functionality:"
    echo "   - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys"
    echo "   - GEMINI2APIKEY: Get from https://makersuite.google.com/app/apikey"
else
    # Read existing password from .env
    DB_PASSWORD=$(grep DATABASE_URL .env | sed -n 's/.*:\/\/fashionuser:\([^@]*\)@.*/\1/p')
    if [ -z "$DB_PASSWORD" ]; then
        echo "⚠️  Warning: Could not parse database password from .env"
        echo "   Using default for database setup"
        DB_PASSWORD="fashionpass"
    fi
fi

# Create database if it doesn't exist
echo ""
echo "🗄️  Setting up database..."

# Check if database exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw fashionistapp; then
    echo "✓ Database already exists"
else
    echo "Creating database and user..."
    sudo -u postgres psql << EOF
CREATE DATABASE fashionistapp;
CREATE USER fashionuser WITH PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE fashionistapp TO fashionuser;
\c fashionistapp
GRANT ALL ON SCHEMA public TO fashionuser;
EOF
    echo "✓ Database created with user 'fashionuser'"
fi

# Push database schema
echo ""
echo "📊 Pushing database schema..."
npm run db:push
echo "✓ Schema updated"

# Start the application
echo ""
echo "🚀 Starting FashionistApp..."
echo ""
echo "The application will be available at: http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
