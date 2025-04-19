# SQL Script Deployment System

A robust system for managing, executing, and monitoring SQL check scripts. This application runs SQL queries against your database, saves execution results, and sends notifications via Slack.

## Features

- **Manual Script Execution**: Trigger SQL checks directly from the UI
- **Scheduled Execution**: Automated checks via GitHub Actions
- **Result History**: View past execution results with search and filtering
- **Slack Notifications**: Real-time alerts for successful and failed checks
- **Security Restrictions**: Prevents data-modifying operations

## Architecture

The system consists of:

1. **Web Dashboard**: Next.js application for monitoring and manual triggering
2. **API Routes**:
   - `/api/run-check`: For manual script execution
   - `/api/check-history`: For retrieving execution history
   - `/api/list-scripts`: For fetching available scripts
3. **Core Execution Engine**: `scripts/run-sql.ts` for running SQL scripts
4. **MongoDB Integration**: Stores execution results and metadata
5. **PostgreSQL Connectivity**: Executes SQL queries against your database

## Project Structure

```
.
├── scripts/
│   ├── run-sql.ts           # Core script execution engine
│   └── sql_scripts/         # SQL script files
│       └── check-order-duplicates.sql
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/
│   │   │   ├── check-history/
│   │   │   ├── list-scripts/
│   │   │   └── run-check/    # Direct script execution API
│   │   ├── page.tsx         # Dashboard page
│   │   └── layout.tsx
│   ├── components/          # React components
│   │   └── dashboard/       # Dashboard UI components
│   └── lib/                 # Utility libraries
│       ├── db.ts            # PostgreSQL connection
│       ├── mongodb.ts       # MongoDB connection
│       └── script-executor.ts # API execution wrapper
```

## Setup and Configuration

### Environment Variables

Create a `.env.local` file with:

```
# PostgreSQL Database
DATABASE_URL="postgresql://user:password@host:port/database"

# MongoDB Database
MONGODB_URI="mongodb+srv://..."

# Slack Notifications
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

# GitHub (for scheduled tasks)
GITHUB_PAT="..."
GITHUB_OWNER="..."
GITHUB_REPO="..."
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Manually run a script
npm run sql:run check-order-duplicates
```

## Adding New SQL Scripts

1. Create a `.sql` file in `scripts/sql_scripts/` directory
2. Ensure it includes metadata comments:

```sql
-- NAME: your-script-name
-- CN_NAME: 中文名称
-- DESCRIPTION: What this script does
-- CN_DESCRIPTION: 中文描述
```

3. Write your SQL queries (data-modifying operations are forbidden)
4. The script will be automatically available in the UI

## Key File Descriptions

- **run-sql.ts**: Core script execution engine - handles SQL parsing, execution, result saving, and notifications
- **script-executor.ts**: Bridge between API routes and execution engine
- **db.ts**: Database connection manager for PostgreSQL
- **mongodb.ts**: MongoDB client for storing execution results

## Running in Production

Build and start the application:

```bash
npm run build
npm run start
```

For scheduled execution, use the GitHub Actions workflow in `.github/workflows/`.

## Changelog

### 2023-06-18 Unification Update

- **Naming Conventions**:

  - Unified file naming to kebab-case (e.g., `run-sql.ts` instead of `run_sql.ts`)
  - Renamed SQL script files to follow the same pattern
  - Updated all import paths to match new naming convention

- **Internationalization**:

  - Changed all user-facing messages to English
  - Updated Slack notifications to use English exclusively
  - Modified console logs to use English for better international support

- **Documentation**:
  - Created comprehensive README with setup instructions
  - Added detailed project structure documentation
  - Included instructions for adding new SQL scripts
