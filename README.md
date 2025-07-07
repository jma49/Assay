# SQL Script Management & Monitoring System

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.15.0-green.svg)](https://www.mongodb.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supported-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache-red.svg)](https://redis.io/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-purple.svg)](https://clerk.com/)

A modern SQL script management and monitoring system built with Next.js, providing a visual interface for managing, executing, and monitoring SQL check scripts with enterprise-grade authentication, real-time notifications, and high-performance caching.

## ✨ Key Features

- **Script Management**: Full CRUD operations with intelligent SQL editor, syntax highlighting, and code formatting
- **Automated Execution**: GitHub Actions and Vercel Cron Jobs integration for scheduled execution
- **Real-time Monitoring**: Live execution progress tracking with detailed history and analytics
- **Enterprise Authentication**: Clerk-based authentication with domain restrictions and invitation-only access
- **High-Performance Caching**: Redis-powered distributed caching for improved performance
- **Security-First**: Read-only enforcement with comprehensive SQL validation and approval workflows
- **Multi-language Support**: Complete internationalization with English/Chinese language switching

## 🚀 Quick Deployment

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- MongoDB instance
- Redis instance (optional but recommended)
- Clerk account for authentication

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database"
MONGODB_URI="mongodb://username:password@host:port/database"

# Redis Cache (Optional)
REDIS_URL="redis://username:password@host:port"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Notifications (Optional)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Security
CRON_SECRET_TOKEN="your-secure-random-token"

# Application
NEXT_PUBLIC_APP_VERSION="1.0.0"
NODE_ENV="production"
```

### Installation & Setup

1. **Clone and Install Dependencies**

   ```bash
   git clone <repository-url>
   cd sql-script-deploy
   npm install
   ```

2. **Database Setup**

   ```bash
   # Ensure your PostgreSQL and MongoDB instances are running
   # The application will automatically create necessary collections
   ```

3. **Development Mode**

   ```bash
   npm run dev
   ```

4. **Production Build**
   ```bash
   npm run build
   npm start
   ```

### Platform-Specific Deployment

#### Vercel Deployment

1. **Connect Repository**

   - Import your repository to Vercel
   - Configure environment variables in Vercel dashboard

2. **Add Vercel Configuration**

   ```json
   // vercel.json
   {
     "crons": [
       {
         "path": "/api/run-scheduled-scripts",
         "schedule": "0 8 * * *"
       }
     ]
   }
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

#### GitHub Actions Setup

Create `.github/workflows/sql-check.yml`:

```yaml
name: SQL Script Execution

on:
  schedule:
    - cron: "0 8 * * *" # Daily at 8:00 UTC
  workflow_dispatch:

jobs:
  run-sql-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Execute SQL Scripts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: npx ts-node scripts/run-all-scripts.ts
```

#### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - mongodb
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: sqlscripts
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:6
    environment:
      MONGO_INITDB_ROOT_USERNAME: user
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass password

volumes:
  postgres_data:
  mongodb_data:
```

## 🔧 Configuration

### Authentication Setup (Clerk)

1. **Create Clerk Application**

   - Sign up at [clerk.com](https://clerk.com)
   - Create a new application
   - Copy API keys to environment variables

2. **Configure Domain Restrictions**

   - Set up email domain restrictions in Clerk dashboard
   - Enable invitation-only mode for enhanced security

3. **Customize Authentication Pages**
   - The system includes pre-configured sign-in/sign-up pages
   - Customize branding and styling as needed

### Database Configuration

#### PostgreSQL

- Ensure the target database allows read-only connections
- Create a dedicated user with SELECT privileges only
- Configure SSL if required for production

#### MongoDB

- Used for script metadata storage and execution history
- Automatic collection creation on first run
- Supports replica sets and sharding

### Redis Cache (Optional)

```bash
# For enhanced performance, configure Redis:
REDIS_URL="redis://localhost:6379"

# With authentication:
REDIS_URL="redis://username:password@host:port"

# SSL connection:
REDIS_URL="rediss://username:password@host:port"
```

### Monitoring & Notifications

#### Slack Integration

```bash
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

#### Health Checks

- `/api/health` - Application health status
- `/api/maintenance/clear-cache` - Cache management
- Automated monitoring for Redis connectivity

## 🔒 Security Features

### SQL Security

- **Read-only enforcement**: Only SELECT, WITH, and EXPLAIN queries allowed
- **Syntax validation**: PostgreSQL syntax checking before execution
- **Timeout protection**: Automatic query timeout based on complexity
- **Input sanitization**: Comprehensive user input validation

### Access Control

- **Domain-based restrictions**: Limit access to specific email domains
- **Invitation-only registration**: Controlled user onboarding
- **Role-based permissions**: Admin approval workflows for sensitive operations
- **Secure API endpoints**: Token-based protection for automation endpoints

### Approval Workflow

- **Script creation**: Immediate access, no approval required
- **Modify others' scripts**: Requires admin approval
- **Script deletion**: Always requires admin approval
- **Audit logging**: Complete operation history tracking

## 📚 API Reference

### Core Endpoints

- `GET /api/scripts` - List all scripts
- `POST /api/scripts` - Create new script
- `PUT /api/scripts/[id]` - Update script
- `DELETE /api/scripts/[id]` - Delete script
- `POST /api/run-check` - Execute single script
- `POST /api/run-all-scripts` - Batch execution

### Monitoring Endpoints

- `GET /api/execution-history` - Execution history
- `GET /api/check-history` - Script check history
- `GET /api/health` - System health status

### Management Endpoints

- `POST /api/maintenance/clear-cache` - Clear system cache
- `GET /api/batch-execution-status` - Batch execution status

## 🛠️ Development

### Local Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint checking
npm run type-check   # TypeScript validation
```

### Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                # Utilities and configurations
├── middleware.ts       # Authentication middleware
└── services/           # Business logic services

scripts/
├── core/               # Core execution scripts
├── maintenance/        # System maintenance scripts
└── scheduler/          # Scheduling utilities
```

## 📞 Support

For deployment assistance or technical support, please refer to the documentation in the `/docs` directory or create an issue in the repository.

## 📄 License

This project is proprietary software. All rights reserved.
