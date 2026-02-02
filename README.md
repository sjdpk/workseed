# Workseed

HRM for startups to all-size companies to manage resources and operations perfectly. A self-hosted solution featuring only what a company needs—no unnecessary extras.

## Demo

<div align="center">
  <img src="docs/workseed-demo.gif" alt="Workseed Demo" width="100%">
  <p>You can download the demo video from <a href="docs/workseed-demo.mp4">here</a>.</p>
</div>

## Key Features

- **Employee Management**: Comprehensive directory and profile management.
- **Attendance System**: Real-time check-in/out with history tracking and status monitoring.
- **Leave Management**: Automated leave requests, approvals, and allocations.
- **Organization Structure**: Manage branches, departments, and teams with ease.
- **Asset Tracking**: Keep track of company assets and their assignments.
- **Announcements & Notices**: Keep your team updated with company-wide notifications.
- **Reports & Analytics**: Generate detailed reports for attendance and resource distribution.
- **Audit Logs**: Complete tracking of system activities for security and compliance.
- **Self-Hosted**: Full control over your data with a simple, focused feature set.

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### Database Setup

Before starting, ensure you have PostgreSQL installed and running. 

#### 1. Install PostgreSQL (if not installed)

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### 2. Create Database

Create a new database named `workseed`:

```bash
# Using psql (CLI)
psql -U postgres -c "CREATE DATABASE workseed;"

# Or using the psql shell
psql -U postgres
postgres=# CREATE DATABASE workseed;
postgres=# \q
```

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Set up database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Admin Login

- Email: `admin@company.com`
- Password: `admin123`

## Scripts

| Command              | Description                |
| -------------------- | -------------------------- |
| `npm run dev`        | Start development server   |
| `npm run build`      | Build for production       |
| `npm run start`      | Start production server    |
| `npm run db:seed`    | Create admin user (basic)  |
| `npm run db:seed-demo` | Add demo data            |
| `npm run db:studio`  | Open Prisma Studio         |
| `npm run lint`       | Run linting checks         |
| `npm run format`     | Format code with Prettier  |

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/workseed"
JWT_SECRET="your-secret-key-min-32-chars"
APP_NAME="Workseed"
```
