# FashionistApp Setup Guide

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16.x or higher
- npm or yarn package manager

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup PostgreSQL Database

Start PostgreSQL service:
```bash
# On Ubuntu/Debian
sudo service postgresql start

# On macOS with Homebrew
brew services start postgresql

# On Windows
# Use the PostgreSQL service manager
```

Create the database and user:
```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE fashionistapp;
CREATE USER fashionuser WITH PASSWORD 'fashionpass';
GRANT ALL PRIVILEGES ON DATABASE fashionistapp TO fashionuser;
\c fashionistapp
GRANT ALL ON SCHEMA public TO fashionuser;
EOF
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database configuration
DATABASE_URL=postgresql://fashionuser:fashionpass@localhost:5432/fashionistapp

# AI Service API Keys (required for full functionality)
OPENAI_API_KEY=your-openai-api-key-here
GEMINI2APIKEY=your-gemini-api-key-here
```

**Note:** The app will start without valid API keys, but AI features will not work. To use the full functionality:
- Get an OpenAI API key from: https://platform.openai.com/api-keys
- Get a Google Gemini API key from: https://makersuite.google.com/app/apikey

### 4. Initialize Database Schema

Push the database schema using Drizzle:
```bash
npm run db:push
```

### 5. Run the Application

Start the development server:
```bash
npm run dev
```

The application will be available at: **http://localhost:5000**

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check TypeScript files
- `npm run db:push` - Push database schema changes

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set NODE_ENV to production:
```bash
export NODE_ENV=production
```

3. Start the production server:
```bash
npm run start
```

## Troubleshooting

### Database Connection Issues

If you get database connection errors:
1. Verify PostgreSQL is running: `pg_isready`
2. Check your DATABASE_URL in `.env`
3. Ensure the database and user exist

### Port Already in Use

If port 5000 is already in use, you'll need to:
1. Stop the process using port 5000
2. Or modify `server/index.ts` to use a different port

### API Key Warnings

The app will show warnings about missing API keys on startup. This is normal if you haven't configured them yet. The app will still run, but AI features won't work.

## Features

- **AI-Powered Outfit Generation**: Upload garment images and get personalized outfit recommendations
- **Wardrobe Management**: Organize and manage your clothing items
- **Selene Designs**: Browse exclusive handcrafted fashion pieces
- **Magazine View**: Create fashion editorial content
- **Product Search**: Find similar items to purchase
- **Travel Planning**: Pack outfits for trips
- **Style Preferences**: Customize recommendations based on your style

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS, Vite
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: Google Gemini & OpenAI GPT-4
