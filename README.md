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

## Role-Based Access Control (RBAC)

- **Employee**: Self-service focus. Manage personal profile, submit leave requests, track own attendance history, and view assigned assets.
- **Team Lead & Manager**: Team synchronization. View team member directory, monitor team-specific attendance dashboards, and approve or reject leave requests for their team.
- **HR**: Organizational management. Manage all users, branches, departments, and teams. Handle leave types, company-wide leave requests, asset assignments, and access full analytics.
- **Admin**: System control. Full administrative access including global system settings, data deletion permissions, and oversight of system-wide audit logs and notification queues.

## Granular Permission Control

Workseed provides a powerful **Permissions Management** panel for Admins to fine-tune exactly what each role and team can see and do:

- **Visibility Management**: Control if employees can view all company members, only their department, or just their immediate team.
- **Feature Toggles**: Enable or disable self-service features like profile editing, document viewing, and asset visibility.
- **Approval Workflows**: Configure who has the authority to approve leaves—ranging from Team Leads and Managers to HR.
- **Attendance Scope**: Set the boundaries for online attendance tracking (company-wide, department-specific, or team-level).
- **Module Control**: Toggle access to specific sections of the dashboard based on organizational needs.

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
