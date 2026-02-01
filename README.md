# Workseed

A comprehensive Human Resource Management system built with Next.js, React, and PostgreSQL.

## Features

- **User Management**: Complete employee lifecycle management with roles and permissions
- **Leave Management**: Leave types, allocations, requests, and approval workflows
- **Attendance Tracking**: Check-in/check-out with device integration support
- **Organization Structure**: Branches, departments, and teams hierarchy
- **Asset Management**: Track and assign company assets to employees
- **Self-Service Portal**: Employee requests and profile management
- **Audit Logging**: Complete audit trail for compliance
- **Email Notifications**: Automated notifications for leave requests and announcements

## Technology Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with HTTP-only cookies
- **Validation**: Zod schema validation
- **Email**: Nodemailer for SMTP integration

## Prerequisites

- Node.js 20.x or later
- PostgreSQL 14.x or later
- npm or yarn package manager

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd thesystem
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure your `.env` file with the required variables (see Environment Variables section).

5. Generate Prisma client:

```bash
npm run db:generate
```

6. Run database migrations:

```bash
npm run db:migrate
```

7. Seed the database (optional):

```bash
npm run db:seed
```

8. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Environment Variables

### Required

| Variable       | Description                                    |
| -------------- | ---------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                   |
| `JWT_SECRET`   | Secret key for JWT signing (min 32 characters) |

### Optional - Email (SMTP)

| Variable        | Description          | Default           |
| --------------- | -------------------- | ----------------- |
| `SMTP_HOST`     | SMTP server hostname | smtp.gmail.com    |
| `SMTP_PORT`     | SMTP server port     | 587               |
| `SMTP_SECURE`   | Use TLS              | false             |
| `SMTP_USER`     | SMTP username        | -                 |
| `SMTP_PASSWORD` | SMTP password        | -                 |
| `SMTP_FROM`     | From email address   | noreply@hrm.local |

### Optional - Application

| Variable              | Description                                  | Default                   |
| --------------------- | -------------------------------------------- | ------------------------- |
| `APP_NAME`            | Application name for emails                  | Workseed                  |
| `NEXT_PUBLIC_APP_URL` | Public application URL                       | http://localhost:3000     |
| `LOG_LEVEL`           | Minimum log level (DEBUG, INFO, WARN, ERROR) | DEBUG (dev) / INFO (prod) |

## Available Scripts

| Command                | Description               |
| ---------------------- | ------------------------- |
| `npm run dev`          | Start development server  |
| `npm run build`        | Build for production      |
| `npm run start`        | Start production server   |
| `npm run lint`         | Run ESLint                |
| `npm run lint:fix`     | Fix ESLint errors         |
| `npm run format`       | Format code with Prettier |
| `npm run format:check` | Check code formatting     |
| `npm run db:generate`  | Generate Prisma client    |
| `npm run db:migrate`   | Run database migrations   |
| `npm run db:push`      | Push schema to database   |
| `npm run db:seed`      | Seed the database         |
| `npm run db:studio`    | Open Prisma Studio        |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── users/         # User management
│   │   ├── attendance/    # Attendance tracking
│   │   ├── leave-*/       # Leave management
│   │   ├── assets/        # Asset management
│   │   └── ...            # Other API routes
│   ├── (auth)/            # Auth pages (login)
│   └── (dashboard)/       # Dashboard pages
├── components/            # React components
├── lib/                   # Core utilities
│   ├── auth.ts           # Authentication helpers
│   ├── permissions.ts    # Role-based access control
│   ├── prisma.ts         # Database connection
│   ├── audit.ts          # Audit logging
│   ├── email.ts          # Email service
│   ├── logger.ts         # Structured logging
│   ├── validation.ts     # Zod schemas
│   └── api-response.ts   # Response utilities
├── types/                 # TypeScript definitions
├── hooks/                 # Custom React hooks
├── services/              # API client services
└── utils/                 # Utility functions
```

## Role Hierarchy

The system uses a hierarchical role-based access control:

| Role      | Level | Description                |
| --------- | ----- | -------------------------- |
| ADMIN     | 4     | Full system access         |
| HR        | 3     | Human resources management |
| MANAGER   | 2     | Department/team management |
| TEAM_LEAD | 1     | Team oversight             |
| EMPLOYEE  | 0     | Basic employee access      |

## API Overview

All API endpoints are RESTful and follow consistent patterns:

- Success responses: `{ success: true, data: { ... } }`
- Error responses: `{ success: false, error: "message" }`
- Authentication via `auth-token` HTTP-only cookie

See `/docs/API.md` for complete endpoint documentation.

## Database Setup

### Development

```bash
# Create migrations
npm run db:migrate

# Apply schema changes without migration
npm run db:push

# Open database GUI
npm run db:studio
```

### Production

```bash
# Deploy migrations
npx prisma migrate deploy
```

## Production Deployment

1. Build the application:

```bash
npm run build
```

2. Set production environment variables.

3. Run database migrations:

```bash
npx prisma migrate deploy
```

4. Start the server:

```bash
npm run start
```

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correctly formatted
- Ensure PostgreSQL is running and accessible
- Check firewall rules for database port

### Authentication Issues

- Ensure `JWT_SECRET` is set and consistent across restarts
- Clear browser cookies and re-login
- Check token expiration (24 hours default)

### Email Not Sending

- Verify SMTP credentials are correct
- Check if SMTP_USER and SMTP_PASSWORD are set
- Review email logs for detailed error messages

## License

Proprietary - All rights reserved
