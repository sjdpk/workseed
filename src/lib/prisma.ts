// Database connection module
// Uses Prisma ORM with PostgreSQL adapter and connection pooling
// Implements singleton pattern to prevent multiple connections in development

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// Global singleton storage to persist across hot reloads in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

// Create Prisma client with PostgreSQL connection pool
function createPrismaClient() {
  // Reuse existing pool if available
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  const adapter = new PrismaPg(globalForPrisma.pool);
  return new PrismaClient({ adapter });
}

// Export singleton Prisma client instance
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Preserve client across hot reloads in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
