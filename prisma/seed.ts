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

  // Create default department
  const department = await prisma.department.upsert({
    where: { code: "GEN" },
    update: {},
    create: {
      name: "General",
      code: "GEN",
      description: "General department",
      branchId: branch.id,
    },
  });
  console.log("Created department:", department.name);

  // Create default team
  const team = await prisma.team.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: {
      name: "Default Team",
      code: "DEFAULT",
      description: "Default team",
      departmentId: department.id,
    },
  });
  console.log("Created team:", team.name);

  // Create leave types
  const leaveTypes = [
    {
      name: "Annual Leave",
      code: "AL",
      description: "Paid annual leave",
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
      description: "Paid sick leave",
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
    {
      name: "Maternity Leave",
      code: "ML",
      description: "Maternity leave for expecting mothers",
      defaultDays: 90,
      maxDays: 180,
      carryForward: false,
      isPaid: true,
      minDaysNotice: 30,
      color: "#EC4899",
    },
    {
      name: "Paternity Leave",
      code: "PL",
      description: "Paternity leave for new fathers",
      defaultDays: 5,
      maxDays: 15,
      carryForward: false,
      isPaid: true,
      minDaysNotice: 7,
      color: "#8B5CF6",
    },
    {
      name: "Unpaid Leave",
      code: "UL",
      description: "Leave without pay",
      defaultDays: 0,
      maxDays: 30,
      carryForward: false,
      isPaid: false,
      color: "#6B7280",
    },
    {
      name: "Work From Home",
      code: "WFH",
      description: "Work from home",
      defaultDays: 24,
      maxDays: 52,
      carryForward: false,
      isPaid: true,
      requiresApproval: true,
      color: "#F59E0B",
    },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: lt,
      create: lt,
    });
  }
  console.log("Created leave types:", leaveTypes.length);

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const currentYear = new Date().getFullYear();

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
      employmentType: "FULL_TIME",
      joiningDate: new Date("2024-01-01"),
      branchId: branch.id,
      departmentId: department.id,
    },
  });
  console.log("Created admin user:", admin.email);

  // Allocate leaves for admin
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
  console.log("Allocated leaves for admin");

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
