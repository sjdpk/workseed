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
- PostgreSQL 14+ running locally (or a managed database URL)

<details>
<summary>Don't have PostgreSQL? Install it</summary>

```bash
# macOS (Homebrew)
brew install postgresql@14 && brew services start postgresql@14

# Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib && sudo systemctl start postgresql
```
</details>

### Setup

```bash
cp .env.example .env   # defaults work for a local Postgres; edit DB creds if yours differ
npm run setup          # installs deps, generates a JWT, creates the DB, migrates, seeds
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

`npm run setup` is one idempotent command — safe to re-run. It runs:

```bash
npm install
npm run db:generate   # Prisma client
npm run db:deploy     # apply migrations
npm run db:seed       # admin user + leave types
```

### Default Admin Login

- Email: `admin@company.com`
- Password: `admin123`

Override these before seeding by setting `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and
`ADMIN_NAME` in `.env`.

## Scripts

| Command              | Description                |
| -------------------- | -------------------------- |
| `npm run setup`      | First-time setup (deps, DB, migrate, seed) |
| `npm run dev`        | Start development server   |
| `npm run build`      | Build for production       |
| `npm run start`      | Start production server    |
| `npm run db:deploy`  | Apply migrations (production / CI) |
| `npm run db:migrate` | Create + apply a migration (development) |
| `npm run db:seed`    | Create admin user + leave types |
| `npm run db:studio`  | Open Prisma Studio         |
| `npm run lint`       | Run linting checks         |
| `npm run format`     | Format code with Prettier  |

## Environment Variables

All variables are validated at startup (`src/lib/env.ts`) — a missing or invalid
value fails fast with a clear message instead of a random runtime crash. See
`.env.example` for the full list with comments.

**Database** — set the discrete parts (assembled into a connection string for you):

```env
DB_HOST=localhost
DB_PORT=5432          # custom port supported
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=workseed
DB_SCHEMA=public
DB_SSL=false          # "true" for managed DBs requiring TLS
```

Or, for a managed provider (Neon/RDS/Supabase), set a full URL that **overrides**
the parts above:

```env
DATABASE_URL=postgresql://user:password@host:5432/workseed?schema=public
```

**Other key vars:**

```env
PORT=3000             # port the app runs on
JWT_SECRET=           # required, >=32 chars (openssl rand -base64 32)
NEXT_PUBLIC_APP_URL=http://localhost:3000   # used for links in emails
APP_NAME=Workseed
# ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME  — optional seed admin overrides
# SMTP_* — optional; dev falls back to an Ethereal test account
```
