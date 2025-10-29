# FashionistApp- Anna Style
Overview
FashionistApp (Anna Style) is a sophisticated fashion styling application that leverages AI technology to create personalized outfit recommendations. The application combines image analysis, user preferences, and AI-powered styling to generate magazine-quality fashion content and outfit suggestions.

System Architecture
Frontend Architecture
Framework: React with TypeScript
Styling: Tailwind CSS with custom theming (dark mode with gold accents)
UI Components: Radix UI components with custom shadcn/ui styling
State Management: React Context API for outfit and preferences management
Routing: Wouter for client-side routing
Build Tool: Vite for development and bundling
Backend Architecture
Framework: Express.js with TypeScript
Database: PostgreSQL with Drizzle ORM
Database Provider: Neon Database (serverless PostgreSQL)
File Upload: Multer for image handling with memory storage
Image Processing: Sharp for image optimization
API Design: RESTful endpoints with proper validation
AI Integration
🚀 Primary AI: Replicate + FLUX (Ultra-fast, ultra-cheap image generation)
🤖 Secondary AI: Google Gemini (gemini-1.5-flash) for image analysis
🎯 Fallback AI: OpenAI GPT-4o for content generation and fallback
💰 Cost Optimization: 92.5% cheaper than OpenAI with Replicate FLUX
Hybrid Architecture: Multiple AI providers with intelligent failover support
Services: Dedicated service layer for AI operations with caching
Key Components
Core Services
AI Service Layer: Hybrid AI system using Gemini and OpenAI
Image Service: Upload, optimization, and storage management
Magazine Service: Editorial content generation for fashion layouts
Cache Service: Performance optimization with NodeCache
Security Middleware: Helmet, rate limiting, and XSS protection
Frontend Components
Outfit Context: Global state management for outfits and generation
Preferences Context: User styling preferences and settings
UI Components: Custom gold-themed design system
Image Uploader: Drag-and-drop file handling with preview
Magazine View: Multi-step editorial content creation
Database Schema
Users: Authentication and profile management
User Preferences: Style preferences, occasions, and seasons
Garments: Individual clothing items with metadata
Outfits: Generated outfit combinations
Anna Designs: Curated fashion pieces
Trips & Packing: Travel planning functionality
Data Flow
Image Upload: User uploads garment image → Multer processes → Sharp optimizes → Gemini analyzes
Outfit Generation: Analysis results + user preferences → OpenAI generates outfits → Results cached
Magazine Creation: Selected outfits → AI generates editorial content → PDF export capability
Product Search: Outfit pieces → External API integration for shopping suggestions
External Dependencies
AI Services
Google Generative AI: Primary image analysis and content generation
OpenAI API: Fallback service and specialized content creation
API Keys Required: GEMINI2APIKEY, OPENAI_API_KEY
Database & Storage
Neon Database: Serverless PostgreSQL hosting
Local File Storage: Uploads directory for image management
Third-party Integrations
Stripe: Payment processing for premium features
React Query: Server state management and caching
Font Awesome: Icon library for UI elements
Deployment Strategy
Environment Configuration
Development: Local development with Vite dev server
Production: Built with ESBuild for server, Vite for client
Database: Drizzle migrations with db:push command
Environment Variables: DATABASE_URL, AI API keys
Build Process
Client build: Vite bundles React app to dist/public
Server build: ESBuild compiles TypeScript server to dist
Static assets: Served from uploads directory
Security: Helmet configuration for production headers
Performance Optimizations
Image optimization with Sharp
Response compression middleware
Cache service for AI responses
Rate limiting for API protection
Changelog
Changelog:
- July 04, 2025. Initial setup
User Preferences
Preferred communication style: Simple, everyday language.
