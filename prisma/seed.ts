/* eslint-disable no-console -- CLI seed script uses console for output */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma adapter typing workaround
const prisma: any = new PrismaClient({ adapter });

async function main() {
  console.log("Setting up basic database configuration...\n");

  const hashedPassword = await bcrypt.hash("admin123", 12);

  // ============================================
  // ADMIN USER
  // ============================================
  console.log("Creating admin user...");
  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      employeeId: "ADMIN001",
      email: "admin@company.com",
      password: hashedPassword,
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
      employmentType: "FULL_TIME",
      designation: "System Administrator",
      joiningDate: new Date(),
    },
  });
  console.log("  Created admin user");

  // ============================================
  // ORGANIZATION SETTINGS
  // ============================================
  console.log("Creating organization settings...");
  await prisma.organizationSettings.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Workseed",
      fiscalYearStart: 1,
      workingDaysPerWeek: 5,
    },
  });
  console.log("  Created organization settings");

  // ============================================
  // BASIC LEAVE TYPES
  // ============================================
  console.log("Creating basic leave types...");
  const leaveTypes = [
    {
      name: "Annual Leave",
      code: "AL",
      description: "Paid annual leave for vacation and personal time",
      defaultDays: 20,
      maxDays: 30,
      carryForward: true,
      maxCarryForward: 5,
      isPaid: true,
      color: "#3B82F6",
    },
    {
      name: "Sick Leave",
      code: "SL",
      description: "Paid sick leave for illness or medical appointments",
      defaultDays: 10,
      maxDays: 15,
      carryForward: false,
      isPaid: true,
      color: "#EF4444",
    },
    {
      name: "Casual Leave",
      code: "CL",
      description: "Casual leave for personal matters",
      defaultDays: 5,
      maxDays: 10,
      carryForward: false,
      isPaid: true,
      color: "#10B981",
    },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: lt,
      create: lt,
    });
  }
  console.log(`  Created ${leaveTypes.length} leave types`);

  // ============================================
  // ALLOCATE LEAVES TO ADMIN
  // ============================================
  console.log("Allocating leaves to admin...");
  const currentYear = new Date().getFullYear();
  const allLeaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });

  for (const lt of allLeaveTypes) {
    await prisma.leaveAllocation.upsert({
      where: {
        userId_leaveTypeId_year: {
          userId: admin.id,
          leaveTypeId: lt.id,
          year: currentYear,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        leaveTypeId: lt.id,
        year: currentYear,
        allocated: lt.defaultDays,
      },
    });
  }
  console.log("  Allocated leaves to admin");

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n===========================================");
  console.log("       BASIC SETUP COMPLETED               ");
  console.log("===========================================\n");
  console.log("Created:");
  console.log("  - 1 Admin User");
  console.log("  - Organization Settings");
  console.log(`  - ${leaveTypes.length} Leave Types`);
  console.log("\n-------------------------------------------");
  console.log("Admin Login Credentials:");
  console.log("-------------------------------------------");
  console.log("Email:    admin@company.com");
  console.log("Password: admin123");
  console.log("-------------------------------------------");
  console.log("\nTo add demo data, run: npm run db:seed-demo");
  console.log("-------------------------------------------\n");
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
