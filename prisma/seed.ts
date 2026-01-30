import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");
  console.log("Database URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));

  // Create default branch
  const branch = await prisma.branch.upsert({
    where: { code: "HQ" },
    update: {},
    create: {
      name: "Headquarters",
      code: "HQ",
      address: "123 Main Street",
      city: "New York",
      state: "NY",
      country: "USA",
      phone: "+1-555-0100",
      email: "hq@company.com",
    },
  });

  console.log("Created branch:", branch.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      employeeId: "EMP00001",
      email: "admin@company.com",
      password: hashedPassword,
      firstName: "System",
      lastName: "Administrator",
      role: "ADMIN",
      status: "ACTIVE",
      branchId: branch.id,
    },
  });

  console.log("Created admin user:", admin.email);
  console.log("\n-----------------------------------");
  console.log("Default Admin Credentials:");
  console.log("Email: admin@company.com");
  console.log("Password: admin123");
  console.log("-----------------------------------\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
