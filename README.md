# Workseed

Human Resource Management System built with Next.js and PostgreSQL.

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

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
| `npm run db:seed`    | Create admin user (basic)  |
| `npm run db:seed-demo` | Add demo data            |
| `npm run db:studio`  | Open Prisma Studio         |

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/workseed"
JWT_SECRET="your-secret-key-min-32-chars"
APP_NAME="Workseed"
```

## License

Proprietary - All rights reserved
