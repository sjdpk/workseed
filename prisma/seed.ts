/* eslint-disable no-console -- CLI seed script uses console for output */
/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma adapter typing workaround */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AssetCondition } from "@prisma/client";
import bcrypt from "bcryptjs";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
// Using 'any' to work around PrismaPg adapter typing limitations
const prisma: any = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database with sample data...\n");

  const hashedPassword = await bcrypt.hash("password123", 12);
  const currentYear = new Date().getFullYear();

  // ============================================
  // BRANCHES
  // ============================================
  console.log("Creating branches...");
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { code: "HQ" },
      update: {},
      create: {
        name: "Headquarters",
        code: "HQ",
        address: "123 Tech Park, Silicon Valley",
        city: "San Francisco",
        state: "California",
        country: "USA",
        phone: "+1-555-0100",
        email: "hq@techcorp.com",
      },
    }),
    prisma.branch.upsert({
      where: { code: "NYC" },
      update: {},
      create: {
        name: "New York Office",
        code: "NYC",
        address: "456 Manhattan Ave",
        city: "New York",
        state: "New York",
        country: "USA",
        phone: "+1-555-0200",
        email: "nyc@techcorp.com",
      },
    }),
    prisma.branch.upsert({
      where: { code: "LON" },
      update: {},
      create: {
        name: "London Office",
        code: "LON",
        address: "789 Thames Street",
        city: "London",
        state: "England",
        country: "UK",
        phone: "+44-20-7123-4567",
        email: "london@techcorp.com",
      },
    }),
  ]);
  console.log(`  Created ${branches.length} branches`);

  // ============================================
  // DEPARTMENTS
  // ============================================
  console.log("Creating departments...");
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: "ENG" },
      update: {},
      create: {
        name: "Engineering",
        code: "ENG",
        description: "Software development and engineering team",
        branchId: branches[0].id,
      },
    }),
    prisma.department.upsert({
      where: { code: "HR" },
      update: {},
      create: {
        name: "Human Resources",
        code: "HR",
        description: "Human resources and people operations",
        branchId: branches[0].id,
      },
    }),
    prisma.department.upsert({
      where: { code: "SALES" },
      update: {},
      create: {
        name: "Sales",
        code: "SALES",
        description: "Sales and business development",
        branchId: branches[1].id,
      },
    }),
    prisma.department.upsert({
      where: { code: "MKT" },
      update: {},
      create: {
        name: "Marketing",
        code: "MKT",
        description: "Marketing and brand management",
        branchId: branches[1].id,
      },
    }),
    prisma.department.upsert({
      where: { code: "FIN" },
      update: {},
      create: {
        name: "Finance",
        code: "FIN",
        description: "Finance and accounting",
        branchId: branches[0].id,
      },
    }),
    prisma.department.upsert({
      where: { code: "OPS" },
      update: {},
      create: {
        name: "Operations",
        code: "OPS",
        description: "Business operations and support",
        branchId: branches[2].id,
      },
    }),
  ]);
  console.log(`  Created ${departments.length} departments`);

  // ============================================
  // TEAMS
  // ============================================
  console.log("Creating teams...");
  const teams = await Promise.all([
    prisma.team.upsert({
      where: { code: "FRONTEND" },
      update: {},
      create: {
        name: "Frontend Team",
        code: "FRONTEND",
        description: "UI/UX and frontend development",
        departmentId: departments[0].id,
      },
    }),
    prisma.team.upsert({
      where: { code: "BACKEND" },
      update: {},
      create: {
        name: "Backend Team",
        code: "BACKEND",
        description: "Backend services and APIs",
        departmentId: departments[0].id,
      },
    }),
    prisma.team.upsert({
      where: { code: "DEVOPS" },
      update: {},
      create: {
        name: "DevOps Team",
        code: "DEVOPS",
        description: "Infrastructure and deployment",
        departmentId: departments[0].id,
      },
    }),
    prisma.team.upsert({
      where: { code: "RECRUIT" },
      update: {},
      create: {
        name: "Recruitment",
        code: "RECRUIT",
        description: "Talent acquisition team",
        departmentId: departments[1].id,
      },
    }),
    prisma.team.upsert({
      where: { code: "SALESNA" },
      update: {},
      create: {
        name: "North America Sales",
        code: "SALESNA",
        description: "North America sales team",
        departmentId: departments[2].id,
      },
    }),
    prisma.team.upsert({
      where: { code: "DIGITAL" },
      update: {},
      create: {
        name: "Digital Marketing",
        code: "DIGITAL",
        description: "Digital marketing and SEO",
        departmentId: departments[3].id,
      },
    }),
  ]);
  console.log(`  Created ${teams.length} teams`);

  // ============================================
  // LEAVE TYPES
  // ============================================
  console.log("Creating leave types...");
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
      description: "Work from home days",
      defaultDays: 24,
      maxDays: 52,
      carryForward: false,
      isPaid: true,
      requiresApproval: true,
      color: "#F59E0B",
    },
    {
      name: "Compensatory Off",
      code: "COMP",
      description: "Compensatory leave for extra work",
      defaultDays: 0,
      maxDays: 10,
      carryForward: true,
      maxCarryForward: 5,
      isPaid: true,
      color: "#06B6D4",
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
  // HOLIDAYS
  // ============================================
  console.log("Creating holidays...");
  const holidays = [
    { name: "New Year's Day", date: new Date(`${currentYear}-01-01`), type: "PUBLIC" },
    { name: "Martin Luther King Jr. Day", date: new Date(`${currentYear}-01-15`), type: "PUBLIC" },
    { name: "Presidents Day", date: new Date(`${currentYear}-02-19`), type: "PUBLIC" },
    { name: "Memorial Day", date: new Date(`${currentYear}-05-27`), type: "PUBLIC" },
    { name: "Independence Day", date: new Date(`${currentYear}-07-04`), type: "PUBLIC" },
    { name: "Labor Day", date: new Date(`${currentYear}-09-02`), type: "PUBLIC" },
    { name: "Thanksgiving", date: new Date(`${currentYear}-11-28`), type: "PUBLIC" },
    { name: "Day After Thanksgiving", date: new Date(`${currentYear}-11-29`), type: "OPTIONAL" },
    { name: "Christmas Eve", date: new Date(`${currentYear}-12-24`), type: "OPTIONAL" },
    { name: "Christmas Day", date: new Date(`${currentYear}-12-25`), type: "PUBLIC" },
    { name: "New Year's Eve", date: new Date(`${currentYear}-12-31`), type: "OPTIONAL" },
  ];

  for (const holiday of holidays) {
    await prisma.holiday.upsert({
      where: {
        date_name: {
          date: holiday.date,
          name: holiday.name,
        },
      },
      update: {},
      create: holiday,
    });
  }
  console.log(`  Created ${holidays.length} holidays`);

  // ============================================
  // USERS
  // ============================================
  console.log("Creating users...");

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@techcorp.com" },
    update: {},
    create: {
      employeeId: "EMP001",
      email: "admin@techcorp.com",
      password: hashedPassword,
      firstName: "James",
      lastName: "Wilson",
      phone: "+1-555-1001",
      role: "ADMIN",
      status: "ACTIVE",
      employmentType: "FULL_TIME",
      designation: "System Administrator",
      joiningDate: new Date("2020-01-15"),
      dateOfBirth: new Date("1985-03-20"),
      gender: "MALE",
      address: "100 Admin Lane",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      branchId: branches[0].id,
      departmentId: departments[0].id,
    },
  });

  // HR Manager
  const hrManager = await prisma.user.upsert({
    where: { email: "sarah.johnson@techcorp.com" },
    update: {},
    create: {
      employeeId: "EMP002",
      email: "sarah.johnson@techcorp.com",
      password: hashedPassword,
      firstName: "Sarah",
      lastName: "Johnson",
      phone: "+1-555-1002",
      role: "HR",
      status: "ACTIVE",
      employmentType: "FULL_TIME",
      designation: "HR Manager",
      joiningDate: new Date("2021-03-01"),
      dateOfBirth: new Date("1988-07-12"),
      gender: "FEMALE",
      address: "200 HR Street",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      branchId: branches[0].id,
      departmentId: departments[1].id,
      teamId: teams[3].id,
    },
  });

  // Engineering Manager
  const engManager = await prisma.user.upsert({
    where: { email: "michael.chen@techcorp.com" },
    update: {},
    create: {
      employeeId: "EMP003",
      email: "michael.chen@techcorp.com",
      password: hashedPassword,
      firstName: "Michael",
      lastName: "Chen",
      phone: "+1-555-1003",
      role: "MANAGER",
      status: "ACTIVE",
      employmentType: "FULL_TIME",
      designation: "Engineering Manager",
      joiningDate: new Date("2020-06-15"),
      dateOfBirth: new Date("1982-11-05"),
      gender: "MALE",
      address: "300 Tech Blvd",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      branchId: branches[0].id,
      departmentId: departments[0].id,
    },
  });

  // Team Leads
  const frontendLead = await prisma.user.upsert({
    where: { email: "emily.davis@techcorp.com" },
    update: {},
    create: {
      employeeId: "EMP004",
      email: "emily.davis@techcorp.com",
      password: hashedPassword,
      firstName: "Emily",
      lastName: "Davis",
      phone: "+1-555-1004",
      role: "TEAM_LEAD",
      status: "ACTIVE",
      employmentType: "FULL_TIME",
      designation: "Frontend Team Lead",
      joiningDate: new Date("2021-01-10"),
      dateOfBirth: new Date("1990-04-18"),
      gender: "FEMALE",
      address: "400 Dev Lane",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      branchId: branches[0].id,
      departmentId: departments[0].id,
      teamId: teams[0].id,
      managerId: engManager.id,
    },
  });

  const backendLead = await prisma.user.upsert({
    where: { email: "david.kumar@techcorp.com" },
    update: {},
    create: {
      employeeId: "EMP005",
      email: "david.kumar@techcorp.com",
      password: hashedPassword,
      firstName: "David",
      lastName: "Kumar",
      phone: "+1-555-1005",
      role: "TEAM_LEAD",
      status: "ACTIVE",
      employmentType: "FULL_TIME",
      designation: "Backend Team Lead",
      joiningDate: new Date("2020-09-01"),
      dateOfBirth: new Date("1987-09-25"),
      gender: "MALE",
      address: "500 Server St",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      branchId: branches[0].id,
      departmentId: departments[0].id,
      teamId: teams[1].id,
      managerId: engManager.id,
    },
  });

  // Update teams with leads
  await prisma.team.update({
    where: { id: teams[0].id },
    data: { leadId: frontendLead.id },
  });
  await prisma.team.update({
    where: { id: teams[1].id },
    data: { leadId: backendLead.id },
  });

  // Employees
  const employees = await Promise.all([
    prisma.user.upsert({
      where: { email: "alex.thompson@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP006",
        email: "alex.thompson@techcorp.com",
        password: hashedPassword,
        firstName: "Alex",
        lastName: "Thompson",
        phone: "+1-555-1006",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        designation: "Senior Frontend Developer",
        joiningDate: new Date("2022-02-14"),
        dateOfBirth: new Date("1992-06-30"),
        gender: "MALE",
        branchId: branches[0].id,
        departmentId: departments[0].id,
        teamId: teams[0].id,
        managerId: frontendLead.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "jessica.martinez@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP007",
        email: "jessica.martinez@techcorp.com",
        password: hashedPassword,
        firstName: "Jessica",
        lastName: "Martinez",
        phone: "+1-555-1007",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        designation: "Frontend Developer",
        joiningDate: new Date("2023-01-09"),
        dateOfBirth: new Date("1995-02-14"),
        gender: "FEMALE",
        branchId: branches[0].id,
        departmentId: departments[0].id,
        teamId: teams[0].id,
        managerId: frontendLead.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "ryan.lee@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP008",
        email: "ryan.lee@techcorp.com",
        password: hashedPassword,
        firstName: "Ryan",
        lastName: "Lee",
        phone: "+1-555-1008",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        designation: "Senior Backend Developer",
        joiningDate: new Date("2021-08-23"),
        dateOfBirth: new Date("1989-12-08"),
        gender: "MALE",
        branchId: branches[0].id,
        departmentId: departments[0].id,
        teamId: teams[1].id,
        managerId: backendLead.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "amanda.white@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP009",
        email: "amanda.white@techcorp.com",
        password: hashedPassword,
        firstName: "Amanda",
        lastName: "White",
        phone: "+1-555-1009",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        designation: "Backend Developer",
        joiningDate: new Date("2023-04-17"),
        dateOfBirth: new Date("1994-08-22"),
        gender: "FEMALE",
        branchId: branches[0].id,
        departmentId: departments[0].id,
        teamId: teams[1].id,
        managerId: backendLead.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "chris.brown@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP010",
        email: "chris.brown@techcorp.com",
        password: hashedPassword,
        firstName: "Chris",
        lastName: "Brown",
        phone: "+1-555-1010",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        designation: "DevOps Engineer",
        joiningDate: new Date("2022-07-11"),
        dateOfBirth: new Date("1991-01-15"),
        gender: "MALE",
        branchId: branches[0].id,
        departmentId: departments[0].id,
        teamId: teams[2].id,
        managerId: engManager.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "lisa.anderson@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP011",
        email: "lisa.anderson@techcorp.com",
        password: hashedPassword,
        firstName: "Lisa",
        lastName: "Anderson",
        phone: "+1-555-1011",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        designation: "HR Specialist",
        joiningDate: new Date("2022-05-02"),
        dateOfBirth: new Date("1993-05-28"),
        gender: "FEMALE",
        branchId: branches[0].id,
        departmentId: departments[1].id,
        teamId: teams[3].id,
        managerId: hrManager.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "mark.taylor@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP012",
        email: "mark.taylor@techcorp.com",
        password: hashedPassword,
        firstName: "Mark",
        lastName: "Taylor",
        phone: "+1-555-1012",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        designation: "Sales Representative",
        joiningDate: new Date("2023-02-20"),
        dateOfBirth: new Date("1990-10-03"),
        gender: "MALE",
        branchId: branches[1].id,
        departmentId: departments[2].id,
        teamId: teams[4].id,
      },
    }),
    prisma.user.upsert({
      where: { email: "nicole.garcia@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP013",
        email: "nicole.garcia@techcorp.com",
        password: hashedPassword,
        firstName: "Nicole",
        lastName: "Garcia",
        phone: "+1-555-1013",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        designation: "Marketing Specialist",
        joiningDate: new Date("2022-11-14"),
        dateOfBirth: new Date("1994-03-17"),
        gender: "FEMALE",
        branchId: branches[1].id,
        departmentId: departments[3].id,
        teamId: teams[5].id,
      },
    }),
    prisma.user.upsert({
      where: { email: "kevin.wilson@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP014",
        email: "kevin.wilson@techcorp.com",
        password: hashedPassword,
        firstName: "Kevin",
        lastName: "Wilson",
        phone: "+44-20-7123-0014",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        designation: "Operations Analyst",
        joiningDate: new Date("2023-06-05"),
        dateOfBirth: new Date("1996-07-21"),
        gender: "MALE",
        branchId: branches[2].id,
        departmentId: departments[5].id,
      },
    }),
    prisma.user.upsert({
      where: { email: "intern.smith@techcorp.com" },
      update: {},
      create: {
        employeeId: "EMP015",
        email: "intern.smith@techcorp.com",
        password: hashedPassword,
        firstName: "Tom",
        lastName: "Smith",
        phone: "+1-555-1015",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employmentType: "INTERN",
        designation: "Software Engineering Intern",
        joiningDate: new Date("2024-06-01"),
        dateOfBirth: new Date("2002-04-10"),
        gender: "MALE",
        branchId: branches[0].id,
        departmentId: departments[0].id,
        teamId: teams[0].id,
        managerId: frontendLead.id,
      },
    }),
  ]);

  const allUsers = [admin, hrManager, engManager, frontendLead, backendLead, ...employees];
  console.log(`  Created ${allUsers.length} users`);

  // ============================================
  // LEAVE ALLOCATIONS
  // ============================================
  console.log("Allocating leaves...");
  const allLeaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });

  for (const user of allUsers) {
    for (const lt of allLeaveTypes) {
      await prisma.leaveAllocation.upsert({
        where: {
          userId_leaveTypeId_year: {
            userId: user.id,
            leaveTypeId: lt.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          userId: user.id,
          leaveTypeId: lt.id,
          year: currentYear,
          allocated: lt.defaultDays,
        },
      });
    }
  }
  console.log(`  Allocated leaves for ${allUsers.length} users`);

  // ============================================
  // LEAVE REQUESTS
  // ============================================
  console.log("Creating leave requests...");
  const annualLeave = allLeaveTypes.find((lt: any) => lt.code === "AL");
  const sickLeave = allLeaveTypes.find((lt: any) => lt.code === "SL");
  const casualLeave = allLeaveTypes.find((lt: any) => lt.code === "CL");
  const wfh = allLeaveTypes.find((lt: any) => lt.code === "WFH");

  const leaveRequests = [];

  if (annualLeave && sickLeave && casualLeave && wfh) {
    // Alex Thompson leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[0].id,
          leaveTypeId: annualLeave.id,
          startDate: new Date(`${currentYear}-02-10`),
          endDate: new Date(`${currentYear}-02-14`),
          days: 5,
          reason: "Family vacation to Hawaii",
          status: "APPROVED",
          approverId: frontendLead.id,
          approvedAt: new Date(`${currentYear}-01-25`),
        },
      }),
      prisma.leaveRequest.create({
        data: {
          userId: employees[0].id,
          leaveTypeId: sickLeave.id,
          startDate: new Date(`${currentYear}-01-08`),
          endDate: new Date(`${currentYear}-01-08`),
          days: 1,
          reason: "Doctor appointment",
          status: "APPROVED",
          approverId: frontendLead.id,
          approvedAt: new Date(`${currentYear}-01-07`),
        },
      }),
      prisma.leaveRequest.create({
        data: {
          userId: employees[0].id,
          leaveTypeId: wfh.id,
          startDate: new Date(`${currentYear}-02-20`),
          endDate: new Date(`${currentYear}-02-21`),
          days: 2,
          reason: "Home repairs scheduled",
          status: "APPROVED",
          approverId: frontendLead.id,
          approvedAt: new Date(`${currentYear}-02-18`),
        },
      })
    );

    // Jessica Martinez leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[1].id,
          leaveTypeId: annualLeave.id,
          startDate: new Date(`${currentYear}-03-18`),
          endDate: new Date(`${currentYear}-03-22`),
          days: 5,
          reason: "Attending a wedding",
          status: "PENDING",
        },
      }),
      prisma.leaveRequest.create({
        data: {
          userId: employees[1].id,
          leaveTypeId: casualLeave.id,
          startDate: new Date(`${currentYear}-01-20`),
          endDate: new Date(`${currentYear}-01-20`),
          days: 1,
          reason: "Personal errands",
          status: "APPROVED",
          approverId: frontendLead.id,
          approvedAt: new Date(`${currentYear}-01-18`),
        },
      })
    );

    // Ryan Lee leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[2].id,
          leaveTypeId: sickLeave.id,
          startDate: new Date(`${currentYear}-01-15`),
          endDate: new Date(`${currentYear}-01-16`),
          days: 2,
          reason: "Flu symptoms",
          status: "APPROVED",
          approverId: backendLead.id,
          approvedAt: new Date(`${currentYear}-01-15`),
        },
      }),
      prisma.leaveRequest.create({
        data: {
          userId: employees[2].id,
          leaveTypeId: annualLeave.id,
          startDate: new Date(`${currentYear}-04-01`),
          endDate: new Date(`${currentYear}-04-05`),
          days: 5,
          reason: "Spring break trip",
          status: "PENDING",
        },
      }),
      prisma.leaveRequest.create({
        data: {
          userId: employees[2].id,
          leaveTypeId: wfh.id,
          startDate: new Date(`${currentYear}-01-25`),
          endDate: new Date(`${currentYear}-01-26`),
          days: 2,
          reason: "Internet installation at new apartment",
          status: "APPROVED",
          approverId: backendLead.id,
          approvedAt: new Date(`${currentYear}-01-23`),
        },
      })
    );

    // Amanda White leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[3].id,
          leaveTypeId: wfh.id,
          startDate: new Date(`${currentYear}-02-05`),
          endDate: new Date(`${currentYear}-02-05`),
          days: 1,
          reason: "Waiting for furniture delivery",
          status: "APPROVED",
          approverId: backendLead.id,
          approvedAt: new Date(`${currentYear}-02-03`),
        },
      }),
      prisma.leaveRequest.create({
        data: {
          userId: employees[3].id,
          leaveTypeId: annualLeave.id,
          startDate: new Date(`${currentYear}-05-15`),
          endDate: new Date(`${currentYear}-05-19`),
          days: 5,
          reason: "Family reunion",
          status: "PENDING",
        },
      })
    );

    // Chris Brown leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[4].id,
          leaveTypeId: annualLeave.id,
          startDate: new Date(`${currentYear}-01-02`),
          endDate: new Date(`${currentYear}-01-05`),
          days: 4,
          reason: "Extended new year break",
          status: "REJECTED",
          approverId: engManager.id,
          approvedAt: new Date(`${currentYear - 1}-12-28`),
          rejectionReason: "Critical deployment scheduled during this period",
        },
      }),
      prisma.leaveRequest.create({
        data: {
          userId: employees[4].id,
          leaveTypeId: sickLeave.id,
          startDate: new Date(`${currentYear}-02-01`),
          endDate: new Date(`${currentYear}-02-02`),
          days: 2,
          reason: "Food poisoning",
          status: "APPROVED",
          approverId: engManager.id,
          approvedAt: new Date(`${currentYear}-02-01`),
        },
      })
    );

    // Lisa Anderson (HR) leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[5].id,
          leaveTypeId: annualLeave.id,
          startDate: new Date(`${currentYear}-03-01`),
          endDate: new Date(`${currentYear}-03-03`),
          days: 3,
          reason: "Long weekend getaway",
          status: "APPROVED",
          approverId: hrManager.id,
          approvedAt: new Date(`${currentYear}-02-25`),
        },
      })
    );

    // Mark Taylor (Sales) leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[6].id,
          leaveTypeId: annualLeave.id,
          startDate: new Date(`${currentYear}-04-10`),
          endDate: new Date(`${currentYear}-04-14`),
          days: 5,
          reason: "Conference attendance in Las Vegas",
          status: "PENDING",
        },
      })
    );

    // Nicole Garcia (Marketing) leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[7].id,
          leaveTypeId: casualLeave.id,
          startDate: new Date(`${currentYear}-02-14`),
          endDate: new Date(`${currentYear}-02-14`),
          days: 1,
          reason: "Valentine's day plans",
          status: "APPROVED",
          approverId: hrManager.id,
          approvedAt: new Date(`${currentYear}-02-10`),
        },
      }),
      prisma.leaveRequest.create({
        data: {
          userId: employees[7].id,
          leaveTypeId: wfh.id,
          startDate: new Date(`${currentYear}-02-28`),
          endDate: new Date(`${currentYear}-02-28`),
          days: 1,
          reason: "Plumber visit",
          status: "APPROVED",
          approverId: hrManager.id,
          approvedAt: new Date(`${currentYear}-02-26`),
        },
      })
    );

    // Kevin Wilson (London) leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[8].id,
          leaveTypeId: annualLeave.id,
          startDate: new Date(`${currentYear}-06-01`),
          endDate: new Date(`${currentYear}-06-07`),
          days: 5,
          reason: "Summer holiday to Spain",
          status: "PENDING",
        },
      })
    );

    // Tom Smith (Intern) leaves
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[9].id,
          leaveTypeId: casualLeave.id,
          startDate: new Date(`${currentYear}-07-04`),
          endDate: new Date(`${currentYear}-07-05`),
          days: 2,
          reason: "Independence day celebration with family",
          status: "PENDING",
        },
      })
    );

    await Promise.all(leaveRequests);
  }
  console.log(`  Created ${leaveRequests.length} leave requests`);

  // ============================================
  // NOTICES / ANNOUNCEMENTS
  // ============================================
  console.log("Creating notices...");
  await Promise.all([
    prisma.notice.create({
      data: {
        title: "Welcome to the New HRM System",
        content:
          "We are excited to announce the launch of our new Human Resource Management System. This system will help streamline leave management, attendance tracking, and employee information management. Please take some time to explore the features and let us know if you have any questions.",
        type: "GENERAL",
        isActive: true,
        publishedAt: new Date(`${currentYear}-01-01`),
        expiresAt: new Date(`${currentYear}-12-31`),
        createdById: admin.id,
      },
    }),
    prisma.notice.create({
      data: {
        title: "Q1 Town Hall Meeting",
        content:
          "Please join us for our Q1 Town Hall meeting on March 15th at 2:00 PM PST. We will be discussing company performance, upcoming projects, and answering your questions. The meeting will be held in the main conference room and also available via Zoom for remote employees.",
        type: "IMPORTANT",
        isActive: true,
        publishedAt: new Date(`${currentYear}-02-25`),
        expiresAt: new Date(`${currentYear}-03-16`),
        createdById: hrManager.id,
      },
    }),
    prisma.notice.create({
      data: {
        title: "Office Closure - Presidents Day",
        content:
          "Please note that the office will be closed on Presidents Day, February 19th. This is a company-wide holiday. Regular operations will resume on February 20th.",
        type: "URGENT",
        isActive: true,
        publishedAt: new Date(`${currentYear}-02-12`),
        expiresAt: new Date(`${currentYear}-02-20`),
        createdById: hrManager.id,
      },
    }),
    prisma.notice.create({
      data: {
        title: "New Health Insurance Benefits",
        content:
          "We are pleased to announce enhanced health insurance benefits starting April 1st. The new plan includes improved dental coverage, mental health support, and a wellness program. More details will be shared in the upcoming HR newsletter.",
        type: "IMPORTANT",
        isActive: true,
        publishedAt: new Date(`${currentYear}-03-01`),
        expiresAt: new Date(`${currentYear}-04-30`),
        createdById: hrManager.id,
      },
    }),
    prisma.notice.create({
      data: {
        title: "IT Maintenance Window",
        content:
          "Scheduled maintenance will be performed on our systems this Saturday from 10 PM to 2 AM PST. During this time, some services may be temporarily unavailable. Please save your work and log out before the maintenance window.",
        type: "GENERAL",
        isActive: true,
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdById: admin.id,
      },
    }),
  ]);
  console.log("  Created 5 notices");

  // ============================================
  // ASSETS
  // ============================================
  console.log("Creating assets...");
  const assets = await Promise.all([
    // Laptops
    prisma.asset.upsert({
      where: { assetTag: "LAP-001" },
      update: {},
      create: {
        name: 'MacBook Pro 14"',
        assetTag: "LAP-001",
        category: "LAPTOP",
        brand: "Apple",
        model: "MacBook Pro M3 Pro",
        serialNumber: "C02XL0QQJGH5",
        purchaseDate: new Date("2024-01-15"),
        purchasePrice: 2499.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        notes: "16GB RAM, 512GB SSD",
        assignedToId: employees[0].id,
        assignedAt: new Date("2024-01-20"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "LAP-002" },
      update: {},
      create: {
        name: 'ThinkPad X1 Carbon 14"',
        assetTag: "LAP-002",
        category: "LAPTOP",
        brand: "Lenovo",
        model: "ThinkPad X1 Carbon Gen 11",
        serialNumber: "PF-3NWXYZ",
        purchaseDate: new Date("2023-09-10"),
        purchasePrice: 1899.0,
        status: "ASSIGNED",
        condition: "GOOD",
        notes: "32GB RAM, 1TB SSD",
        assignedToId: employees[1].id,
        assignedAt: new Date("2023-09-15"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "LAP-003" },
      update: {},
      create: {
        name: 'MacBook Air 13"',
        assetTag: "LAP-003",
        category: "LAPTOP",
        brand: "Apple",
        model: "MacBook Air M2",
        serialNumber: "C02ABC123DEF",
        purchaseDate: new Date("2023-03-15"),
        purchasePrice: 1299.0,
        status: "MAINTENANCE",
        condition: "FAIR",
        notes: "Battery replacement needed",
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "LAP-004" },
      update: {},
      create: {
        name: 'MacBook Pro 16"',
        assetTag: "LAP-004",
        category: "LAPTOP",
        brand: "Apple",
        model: "MacBook Pro M3 Max",
        serialNumber: "C02XL0QQJGH6",
        purchaseDate: new Date("2024-01-20"),
        purchasePrice: 3499.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        notes: "64GB RAM, 1TB SSD - For video editing",
        assignedToId: employees[2].id,
        assignedAt: new Date("2024-01-25"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "LAP-005" },
      update: {},
      create: {
        name: "Dell XPS 15",
        assetTag: "LAP-005",
        category: "LAPTOP",
        brand: "Dell",
        model: "XPS 15 9530",
        serialNumber: "DELLXPS001",
        purchaseDate: new Date("2023-11-01"),
        purchasePrice: 1799.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        notes: "32GB RAM, 512GB SSD",
        assignedToId: employees[3].id,
        assignedAt: new Date("2023-11-05"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "LAP-006" },
      update: {},
      create: {
        name: 'HP EliteBook 840"',
        assetTag: "LAP-006",
        category: "LAPTOP",
        brand: "HP",
        model: "EliteBook 840 G10",
        serialNumber: "HPELITE001",
        purchaseDate: new Date("2023-08-15"),
        purchasePrice: 1599.0,
        status: "ASSIGNED",
        condition: "GOOD",
        assignedToId: employees[4].id,
        assignedAt: new Date("2023-08-20"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "LAP-007" },
      update: {},
      create: {
        name: "ThinkPad T14s",
        assetTag: "LAP-007",
        category: "LAPTOP",
        brand: "Lenovo",
        model: "ThinkPad T14s Gen 4",
        serialNumber: "LENOVOT14S001",
        purchaseDate: new Date("2024-02-01"),
        purchasePrice: 1499.0,
        status: "AVAILABLE",
        condition: "NEW",
        notes: "Ready for new employee",
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "LAP-008" },
      update: {},
      create: {
        name: 'MacBook Pro 14" (2023)',
        assetTag: "LAP-008",
        category: "LAPTOP",
        brand: "Apple",
        model: "MacBook Pro M2 Pro",
        serialNumber: "C02OLDMAC001",
        purchaseDate: new Date("2023-02-01"),
        purchasePrice: 2199.0,
        status: "RETIRED",
        condition: "POOR",
        notes: "Replaced due to screen damage",
      },
    }),
    // Monitors
    prisma.asset.upsert({
      where: { assetTag: "MON-001" },
      update: {},
      create: {
        name: 'Dell UltraSharp 27"',
        assetTag: "MON-001",
        category: "MONITOR",
        brand: "Dell",
        model: "U2723QE",
        serialNumber: "CN-0WXYZ-12345",
        purchaseDate: new Date("2024-01-15"),
        purchasePrice: 799.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        assignedToId: employees[0].id,
        assignedAt: new Date("2024-01-20"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "MON-002" },
      update: {},
      create: {
        name: 'Dell UltraSharp 27" #2',
        assetTag: "MON-002",
        category: "MONITOR",
        brand: "Dell",
        model: "U2723QE",
        serialNumber: "CN-0WXYZ-12346",
        purchaseDate: new Date("2024-01-15"),
        purchasePrice: 799.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        assignedToId: employees[1].id,
        assignedAt: new Date("2024-01-20"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "MON-003" },
      update: {},
      create: {
        name: 'LG UltraFine 32"',
        assetTag: "MON-003",
        category: "MONITOR",
        brand: "LG",
        model: "32UN880-B",
        serialNumber: "LG32UN001",
        purchaseDate: new Date("2023-06-01"),
        purchasePrice: 699.0,
        status: "ASSIGNED",
        condition: "GOOD",
        assignedToId: employees[2].id,
        assignedAt: new Date("2023-06-05"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "MON-004" },
      update: {},
      create: {
        name: 'Samsung 34" Curved',
        assetTag: "MON-004",
        category: "MONITOR",
        brand: "Samsung",
        model: "S34J550",
        serialNumber: "SAMS34001",
        purchaseDate: new Date("2023-04-15"),
        purchasePrice: 449.0,
        status: "AVAILABLE",
        condition: "GOOD",
      },
    }),
    // Mobile Devices
    prisma.asset.upsert({
      where: { assetTag: "MOB-001" },
      update: {},
      create: {
        name: "iPhone 15 Pro",
        assetTag: "MOB-001",
        category: "MOBILE",
        brand: "Apple",
        model: "iPhone 15 Pro",
        serialNumber: "DNPXYZ123456",
        purchaseDate: new Date("2024-02-01"),
        purchasePrice: 999.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        assignedToId: engManager.id,
        assignedAt: new Date("2024-02-05"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "MOB-002" },
      update: {},
      create: {
        name: "iPhone 14 Pro",
        assetTag: "MOB-002",
        category: "MOBILE",
        brand: "Apple",
        model: "iPhone 14 Pro",
        serialNumber: "DNPXYZ123457",
        purchaseDate: new Date("2023-01-15"),
        purchasePrice: 899.0,
        status: "ASSIGNED",
        condition: "GOOD",
        assignedToId: hrManager.id,
        assignedAt: new Date("2023-01-20"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "MOB-003" },
      update: {},
      create: {
        name: "Samsung Galaxy S24",
        assetTag: "MOB-003",
        category: "MOBILE",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        serialNumber: "SAMS24001",
        purchaseDate: new Date("2024-01-25"),
        purchasePrice: 1199.0,
        status: "AVAILABLE",
        condition: "NEW",
      },
    }),
    // Tablets
    prisma.asset.upsert({
      where: { assetTag: "TAB-001" },
      update: {},
      create: {
        name: 'iPad Pro 12.9"',
        assetTag: "TAB-001",
        category: "TABLET",
        brand: "Apple",
        model: "iPad Pro 12.9 M2",
        serialNumber: "IPADPRO001",
        purchaseDate: new Date("2023-05-01"),
        purchasePrice: 1299.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        assignedToId: admin.id,
        assignedAt: new Date("2023-05-05"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "TAB-002" },
      update: {},
      create: {
        name: 'iPad Air 10.9"',
        assetTag: "TAB-002",
        category: "TABLET",
        brand: "Apple",
        model: "iPad Air 5th Gen",
        serialNumber: "IPADAIR001",
        purchaseDate: new Date("2023-07-15"),
        purchasePrice: 799.0,
        status: "AVAILABLE",
        condition: "GOOD",
      },
    }),
    // Keyboards
    prisma.asset.upsert({
      where: { assetTag: "KEY-001" },
      update: {},
      create: {
        name: "Logitech MX Keys",
        assetTag: "KEY-001",
        category: "KEYBOARD",
        brand: "Logitech",
        model: "MX Keys",
        serialNumber: "2143-8765-9012",
        purchaseDate: new Date("2023-06-20"),
        purchasePrice: 99.0,
        status: "ASSIGNED",
        condition: "GOOD",
        assignedToId: employees[0].id,
        assignedAt: new Date("2024-01-20"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "KEY-002" },
      update: {},
      create: {
        name: "Apple Magic Keyboard",
        assetTag: "KEY-002",
        category: "KEYBOARD",
        brand: "Apple",
        model: "Magic Keyboard with Touch ID",
        serialNumber: "APPLEKEY001",
        purchaseDate: new Date("2024-01-15"),
        purchasePrice: 199.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        assignedToId: employees[2].id,
        assignedAt: new Date("2024-01-25"),
      },
    }),
    // Mouse devices
    prisma.asset.upsert({
      where: { assetTag: "MOU-001" },
      update: {},
      create: {
        name: "Logitech MX Master 3S",
        assetTag: "MOU-001",
        category: "MOUSE",
        brand: "Logitech",
        model: "MX Master 3S",
        serialNumber: "LOGIMX3S001",
        purchaseDate: new Date("2024-01-15"),
        purchasePrice: 99.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        assignedToId: employees[0].id,
        assignedAt: new Date("2024-01-20"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "MOU-002" },
      update: {},
      create: {
        name: "Apple Magic Mouse",
        assetTag: "MOU-002",
        category: "MOUSE",
        brand: "Apple",
        model: "Magic Mouse 2",
        serialNumber: "APPLEMOUSE001",
        purchaseDate: new Date("2024-01-15"),
        purchasePrice: 99.0,
        status: "AVAILABLE",
        condition: "NEW",
      },
    }),
    // Headsets
    prisma.asset.upsert({
      where: { assetTag: "HED-001" },
      update: {},
      create: {
        name: "Sony WH-1000XM5",
        assetTag: "HED-001",
        category: "HEADSET",
        brand: "Sony",
        model: "WH-1000XM5",
        serialNumber: "SONYXM5001",
        purchaseDate: new Date("2023-12-01"),
        purchasePrice: 349.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        assignedToId: employees[4].id,
        assignedAt: new Date("2023-12-05"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "HED-002" },
      update: {},
      create: {
        name: "Jabra Evolve2 75",
        assetTag: "HED-002",
        category: "HEADSET",
        brand: "Jabra",
        model: "Evolve2 75",
        serialNumber: "JABRA75001",
        purchaseDate: new Date("2023-10-15"),
        purchasePrice: 299.0,
        status: "ASSIGNED",
        condition: "GOOD",
        assignedToId: employees[5].id,
        assignedAt: new Date("2023-10-20"),
      },
    }),
    // Software Licenses
    prisma.asset.upsert({
      where: { assetTag: "SW-001" },
      update: {},
      create: {
        name: "Microsoft 365 Business",
        assetTag: "SW-001",
        category: "SOFTWARE_LICENSE",
        brand: "Microsoft",
        model: "365 Business Premium",
        purchaseDate: new Date("2024-01-01"),
        purchasePrice: 22.0,
        warrantyExpiry: new Date("2025-01-01"),
        status: "ASSIGNED",
        condition: "NEW",
        notes: "Annual subscription - 50 licenses",
        assignedToId: admin.id,
        assignedAt: new Date("2024-01-01"),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: "SW-002" },
      update: {},
      create: {
        name: "Adobe Creative Cloud",
        assetTag: "SW-002",
        category: "SOFTWARE_LICENSE",
        brand: "Adobe",
        model: "Creative Cloud All Apps",
        purchaseDate: new Date("2024-01-01"),
        purchasePrice: 54.99,
        warrantyExpiry: new Date("2025-01-01"),
        status: "ASSIGNED",
        condition: "NEW",
        notes: "Annual subscription - 10 licenses",
        assignedToId: employees[7].id,
        assignedAt: new Date("2024-01-05"),
      },
    }),
    // ID Cards
    prisma.asset.upsert({
      where: { assetTag: "ID-001" },
      update: {},
      create: {
        name: "Employee ID Card - Alex",
        assetTag: "ID-001",
        category: "ID_CARD",
        brand: "HID",
        model: "iCLASS SE",
        serialNumber: "HID001",
        purchaseDate: new Date("2024-01-20"),
        purchasePrice: 15.0,
        status: "ASSIGNED",
        condition: "NEW",
        assignedToId: employees[0].id,
        assignedAt: new Date("2024-01-20"),
      },
    }),
    // Access Cards
    prisma.asset.upsert({
      where: { assetTag: "ACC-001" },
      update: {},
      create: {
        name: "Building Access Card - Jessica",
        assetTag: "ACC-001",
        category: "ACCESS_CARD",
        brand: "HID",
        model: "ProxCard II",
        serialNumber: "PROX001",
        purchaseDate: new Date("2023-01-09"),
        purchasePrice: 10.0,
        status: "ASSIGNED",
        condition: "GOOD",
        assignedToId: employees[1].id,
        assignedAt: new Date("2023-01-09"),
      },
    }),
    // Desktops
    prisma.asset.upsert({
      where: { assetTag: "DES-001" },
      update: {},
      create: {
        name: "Mac Studio",
        assetTag: "DES-001",
        category: "DESKTOP",
        brand: "Apple",
        model: "Mac Studio M2 Ultra",
        serialNumber: "MACSTUDIO001",
        purchaseDate: new Date("2023-08-01"),
        purchasePrice: 3999.0,
        status: "ASSIGNED",
        condition: "EXCELLENT",
        notes: "For video/3D rendering workstation",
        assignedToId: employees[7].id,
        assignedAt: new Date("2023-08-05"),
      },
    }),
  ]);
  console.log(`  Created ${assets.length} assets`);

  // ============================================
  // ASSET ASSIGNMENTS HISTORY
  // ============================================
  console.log("Creating asset assignment history...");

  // Helper to create assignment if not exists
  const createAssignmentIfNotExists = async (data: {
    assetId: string;
    userId: string;
    assignedById: string;
    assignedAt: Date;
    condition: AssetCondition;
    notes: string;
    returnedAt?: Date;
    returnedById?: string;
    returnCondition?: AssetCondition;
    returnNotes?: string;
  }) => {
    const existing = await prisma.assetAssignment.findFirst({
      where: {
        assetId: data.assetId,
        userId: data.userId,
        assignedAt: data.assignedAt,
      },
    });
    if (!existing) {
      return prisma.assetAssignment.create({ data });
    }
    return existing;
  };

  const assetAssignments = await Promise.all([
    // Alex's laptop assignment
    createAssignmentIfNotExists({
      assetId: assets[0].id,
      userId: employees[0].id,
      assignedById: admin.id,
      assignedAt: new Date("2024-01-20"),
      condition: "EXCELLENT",
      notes: "New hire equipment",
    }),
    // Alex's monitor assignment
    createAssignmentIfNotExists({
      assetId: assets[8].id,
      userId: employees[0].id,
      assignedById: admin.id,
      assignedAt: new Date("2024-01-20"),
      condition: "EXCELLENT",
      notes: "New hire equipment",
    }),
    // Jessica's laptop assignment
    createAssignmentIfNotExists({
      assetId: assets[1].id,
      userId: employees[1].id,
      assignedById: admin.id,
      assignedAt: new Date("2023-09-15"),
      condition: "NEW",
      notes: "New hire equipment",
    }),
    // Ryan's laptop assignment
    createAssignmentIfNotExists({
      assetId: assets[3].id,
      userId: employees[2].id,
      assignedById: admin.id,
      assignedAt: new Date("2024-01-25"),
      condition: "EXCELLENT",
      notes: "Upgraded from MacBook Air",
    }),
    // Ryan's previous laptop (returned)
    createAssignmentIfNotExists({
      assetId: assets[2].id,
      userId: employees[2].id,
      assignedById: admin.id,
      assignedAt: new Date("2021-08-23"),
      returnedAt: new Date("2024-01-25"),
      returnedById: admin.id,
      condition: "EXCELLENT",
      returnCondition: "FAIR",
      notes: "Initial assignment",
      returnNotes: "Battery issues - sent for maintenance",
    }),
    // Engineering Manager's phone
    createAssignmentIfNotExists({
      assetId: assets[12].id,
      userId: engManager.id,
      assignedById: admin.id,
      assignedAt: new Date("2024-02-05"),
      condition: "EXCELLENT",
      notes: "Work phone for on-call duties",
    }),
    // HR Manager's phone
    createAssignmentIfNotExists({
      assetId: assets[13].id,
      userId: hrManager.id,
      assignedById: admin.id,
      assignedAt: new Date("2023-01-20"),
      condition: "NEW",
      notes: "Work phone",
    }),
    // Admin's tablet
    createAssignmentIfNotExists({
      assetId: assets[15].id,
      userId: admin.id,
      assignedById: admin.id,
      assignedAt: new Date("2023-05-05"),
      condition: "EXCELLENT",
      notes: "For presentations and meetings",
    }),
  ]);
  console.log(`  Created ${assetAssignments.length} asset assignment records`);

  // ============================================
  // ATTENDANCE RECORDS
  // ============================================
  console.log("Creating attendance records...");
  const today = new Date();
  let attendanceCount = 0;

  // Create attendance for last 30 days for all employees
  for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // All users except intern (who joined recently)
    const attendanceUsers = [
      admin,
      hrManager,
      engManager,
      frontendLead,
      backendLead,
      ...employees.slice(0, 9),
    ];

    for (const user of attendanceUsers) {
      // Random chance of absence (10%)
      if (Math.random() < 0.1) continue;

      // Varied check-in times (7:30 AM to 10:00 AM)
      const checkInHour = 7 + Math.floor(Math.random() * 3);
      const checkInMin = Math.floor(Math.random() * 60);
      const checkIn = new Date(date);
      checkIn.setHours(checkInHour, checkInMin, 0, 0);

      // Varied check-out times (5:00 PM to 8:00 PM)
      const checkOutHour = 17 + Math.floor(Math.random() * 3);
      const checkOutMin = Math.floor(Math.random() * 60);
      const checkOut = new Date(date);
      checkOut.setHours(checkOutHour, checkOutMin, 0, 0);

      // Varied sources
      const sources = ["WEB", "MOBILE", "BIOMETRIC"] as const;
      const source = sources[Math.floor(Math.random() * sources.length)];

      try {
        await prisma.attendance.create({
          data: {
            userId: user.id,
            date: date,
            checkIn: checkIn,
            checkOut: checkOut,
            source: source,
            notes:
              checkInHour >= 10
                ? "Late arrival - approved"
                : checkOutHour >= 19
                  ? "Extended hours for project deadline"
                  : undefined,
          },
        });
        attendanceCount++;
      } catch {
        // Skip if attendance record already exists
      }
    }
  }

  // Add today's check-ins (no check-out yet for some)
  const todayUsers = [admin, hrManager, engManager, frontendLead, backendLead, ...employees.slice(0, 5)];
  for (const user of todayUsers) {
    const checkIn = new Date(today);
    checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

    // 50% have checked out already
    const hasCheckedOut = Math.random() > 0.5;
    const checkOut = hasCheckedOut ? new Date(today) : undefined;
    if (checkOut) {
      checkOut.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
    }

    try {
      await prisma.attendance.create({
        data: {
          userId: user.id,
          date: today,
          checkIn: checkIn,
          checkOut: checkOut,
          source: "WEB",
        },
      });
      attendanceCount++;
    } catch {
      // Skip if attendance record already exists
    }
  }

  console.log(`  Created ${attendanceCount} attendance records`);

  // ============================================
  // EMAIL TEMPLATES
  // ============================================
  console.log("Creating email templates...");
  const emailTemplates = [
    {
      name: "leave_request_submitted",
      displayName: "Leave Request Submitted",
      type: "LEAVE_REQUEST_SUBMITTED" as const,
      subject: "Leave Request Submitted - {{leaveType}}",
      htmlBody: `<h2 class="title">Leave Request Submitted</h2>
<p class="content">Your leave request has been submitted successfully and is pending approval.</p>
<div class="info-row"><span class="info-label">Employee:</span><span class="info-value">{{employeeName}}</span></div>
<div class="info-row"><span class="info-label">Leave Type:</span><span class="info-value">{{leaveType}}</span></div>
<div class="info-row"><span class="info-label">Duration:</span><span class="info-value">{{startDate}} to {{endDate}} ({{days}} days)</span></div>
<div class="info-row"><span class="info-label">Reason:</span><span class="info-value">{{reason}}</span></div>
<p class="content">You will be notified once your request has been reviewed.</p>`,
      variables: {
        employeeName: "Employee full name",
        leaveType: "Type of leave",
        startDate: "Start date",
        endDate: "End date",
        days: "Number of days",
        reason: "Reason for leave",
      },
      isSystem: true,
    },
    {
      name: "leave_request_approved",
      displayName: "Leave Request Approved",
      type: "LEAVE_REQUEST_APPROVED" as const,
      subject: "Leave Request Approved - {{leaveType}}",
      htmlBody: `<h2 class="title">Leave Request Approved</h2>
<p class="content">Great news! Your leave request has been approved.</p>
<div class="info-row"><span class="info-label">Leave Type:</span><span class="info-value">{{leaveType}}</span></div>
<div class="info-row"><span class="info-label">Duration:</span><span class="info-value">{{startDate}} to {{endDate}} ({{days}} days)</span></div>
<div class="info-row"><span class="info-label">Approved By:</span><span class="info-value">{{approverName}}</span></div>
<p class="content">Enjoy your time off!</p>`,
      variables: {
        employeeName: "Employee full name",
        leaveType: "Type of leave",
        startDate: "Start date",
        endDate: "End date",
        days: "Number of days",
        approverName: "Approver name",
      },
      isSystem: true,
    },
    {
      name: "leave_request_rejected",
      displayName: "Leave Request Rejected",
      type: "LEAVE_REQUEST_REJECTED" as const,
      subject: "Leave Request Rejected - {{leaveType}}",
      htmlBody: `<h2 class="title">Leave Request Rejected</h2>
<p class="content">Unfortunately, your leave request has been rejected.</p>
<div class="info-row"><span class="info-label">Leave Type:</span><span class="info-value">{{leaveType}}</span></div>
<div class="info-row"><span class="info-label">Duration:</span><span class="info-value">{{startDate}} to {{endDate}} ({{days}} days)</span></div>
<div class="info-row"><span class="info-label">Rejected By:</span><span class="info-value">{{approverName}}</span></div>
<div class="info-row"><span class="info-label">Reason:</span><span class="info-value">{{rejectionReason}}</span></div>
<p class="content">Please contact HR if you have any questions.</p>`,
      variables: {
        employeeName: "Employee full name",
        leaveType: "Type of leave",
        startDate: "Start date",
        endDate: "End date",
        days: "Number of days",
        approverName: "Approver name",
        rejectionReason: "Reason for rejection",
      },
      isSystem: true,
    },
    {
      name: "leave_pending_approval",
      displayName: "Leave Pending Approval",
      type: "LEAVE_PENDING_APPROVAL" as const,
      subject: "Leave Request Pending Your Approval - {{employeeName}}",
      htmlBody: `<h2 class="title">Leave Request Pending Approval</h2>
<p class="content">A new leave request requires your attention.</p>
<div class="info-row"><span class="info-label">Employee:</span><span class="info-value">{{employeeName}}</span></div>
<div class="info-row"><span class="info-label">Leave Type:</span><span class="info-value">{{leaveType}}</span></div>
<div class="info-row"><span class="info-label">Duration:</span><span class="info-value">{{startDate}} to {{endDate}} ({{days}} days)</span></div>
<div class="info-row"><span class="info-label">Reason:</span><span class="info-value">{{reason}}</span></div>
<p class="content">Please review and take action on this request.</p>`,
      variables: {
        employeeName: "Employee full name",
        leaveType: "Type of leave",
        startDate: "Start date",
        endDate: "End date",
        days: "Number of days",
        reason: "Reason for leave",
      },
      isSystem: true,
    },
    {
      name: "request_approved",
      displayName: "Request Approved",
      type: "REQUEST_APPROVED" as const,
      subject: "Request Approved - {{subject}}",
      htmlBody: `<h2 class="title">Request Approved</h2>
<p class="content">Your request has been approved.</p>
<div class="info-row"><span class="info-label">Request Type:</span><span class="info-value">{{requestType}}</span></div>
<div class="info-row"><span class="info-label">Subject:</span><span class="info-value">{{subject}}</span></div>
<div class="info-row"><span class="info-label">Approved By:</span><span class="info-value">{{approverName}}</span></div>
<div class="info-row"><span class="info-label">Response:</span><span class="info-value">{{response}}</span></div>`,
      variables: {
        employeeName: "Employee full name",
        requestType: "Type of request",
        subject: "Request subject",
        approverName: "Approver name",
        response: "Approver response",
      },
      isSystem: true,
    },
    {
      name: "request_rejected",
      displayName: "Request Rejected",
      type: "REQUEST_REJECTED" as const,
      subject: "Request Rejected - {{subject}}",
      htmlBody: `<h2 class="title">Request Rejected</h2>
<p class="content">Unfortunately, your request has been rejected.</p>
<div class="info-row"><span class="info-label">Request Type:</span><span class="info-value">{{requestType}}</span></div>
<div class="info-row"><span class="info-label">Subject:</span><span class="info-value">{{subject}}</span></div>
<div class="info-row"><span class="info-label">Rejected By:</span><span class="info-value">{{approverName}}</span></div>
<div class="info-row"><span class="info-label">Response:</span><span class="info-value">{{response}}</span></div>`,
      variables: {
        employeeName: "Employee full name",
        requestType: "Type of request",
        subject: "Request subject",
        approverName: "Approver name",
        response: "Approver response",
      },
      isSystem: true,
    },
    {
      name: "announcement_published",
      displayName: "Announcement Published",
      type: "ANNOUNCEMENT_PUBLISHED" as const,
      subject: "{{type}} Announcement: {{title}}",
      htmlBody: `<h2 class="title">{{title}}</h2>
<span class="badge">{{type}}</span>
<div class="content">{{content}}</div>
<p class="subtitle">Published by {{publishedBy}}</p>`,
      variables: {
        title: "Announcement title",
        content: "Announcement content",
        type: "Announcement type (GENERAL, IMPORTANT, URGENT)",
        publishedBy: "Publisher name",
        recipientName: "Recipient first name",
      },
      isSystem: true,
    },
    {
      name: "welcome_email",
      displayName: "Welcome Email",
      type: "WELCOME_EMAIL" as const,
      subject: "Welcome to {{appName}}, {{employeeName}}!",
      htmlBody: `<h2 class="title">Welcome to the Team!</h2>
<p class="content">Hello {{employeeName}},</p>
<p class="content">We're thrilled to have you join us! Your account has been created and is ready to use.</p>
<div class="info-row"><span class="info-label">Employee ID:</span><span class="info-value">{{employeeId}}</span></div>
<div class="info-row"><span class="info-label">Department:</span><span class="info-value">{{department}}</span></div>
<div class="info-row"><span class="info-label">Designation:</span><span class="info-value">{{designation}}</span></div>
<p class="content">Please log in to access the HR system and complete your onboarding tasks.</p>`,
      variables: {
        employeeName: "Employee full name",
        employeeId: "Employee ID",
        department: "Department name",
        designation: "Job designation",
        appName: "Application name",
      },
      isSystem: true,
    },
    {
      name: "appreciation",
      displayName: "Appreciation",
      type: "APPRECIATION" as const,
      subject: "You've Received Recognition! {{badge}}",
      htmlBody: `<h2 class="title">You've Been Recognized!</h2>
<p class="content">Congratulations {{recipientName}}!</p>
<p class="content">You've received the <strong>{{badge}}</strong> badge from {{senderName}}.</p>
<div class="content" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; font-style: italic;">"{{message}}"</div>
<p class="content">Keep up the great work!</p>`,
      variables: {
        recipientName: "Recipient name",
        badge: "Badge name",
        senderName: "Sender name",
        message: "Appreciation message",
      },
      isSystem: true,
    },
    {
      name: "asset_assigned",
      displayName: "Asset Assigned",
      type: "ASSET_ASSIGNED" as const,
      subject: "Asset Assigned: {{assetName}}",
      htmlBody: `<h2 class="title">Asset Assigned to You</h2>
<p class="content">The following asset has been assigned to you:</p>
<div class="info-row"><span class="info-label">Asset:</span><span class="info-value">{{assetName}}</span></div>
<div class="info-row"><span class="info-label">Asset Tag:</span><span class="info-value">{{assetTag}}</span></div>
<div class="info-row"><span class="info-label">Category:</span><span class="info-value">{{category}}</span></div>
<div class="info-row"><span class="info-label">Assigned By:</span><span class="info-value">{{assignedBy}}</span></div>
<p class="content">Please take good care of this equipment.</p>`,
      variables: {
        employeeName: "Employee name",
        assetName: "Asset name",
        assetTag: "Asset tag",
        category: "Asset category",
        assignedBy: "Person who assigned",
      },
      isSystem: true,
    },
  ];

  for (const template of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: {
        displayName: template.displayName,
        subject: template.subject,
        htmlBody: template.htmlBody,
        variables: template.variables,
      },
      create: template,
    });
  }
  console.log(`  Created ${emailTemplates.length} email templates`);

  // ============================================
  // NOTIFICATION RULES
  // ============================================
  console.log("Creating notification rules...");
  const notificationRules = [
    {
      type: "LEAVE_REQUEST_SUBMITTED" as const,
      name: "Leave Request Submitted",
      description: "When an employee submits a leave request",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
        notifyManager: false,
        notifyTeamLead: false,
        notifyDepartmentHead: false,
        notifyHR: true,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
    {
      type: "LEAVE_REQUEST_APPROVED" as const,
      name: "Leave Request Approved",
      description: "When a leave request is approved",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
        notifyManager: false,
        notifyTeamLead: false,
        notifyDepartmentHead: false,
        notifyHR: false,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
    {
      type: "LEAVE_REQUEST_REJECTED" as const,
      name: "Leave Request Rejected",
      description: "When a leave request is rejected",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
        notifyManager: false,
        notifyTeamLead: false,
        notifyDepartmentHead: false,
        notifyHR: false,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
    {
      type: "LEAVE_PENDING_APPROVAL" as const,
      name: "Leave Pending Approval",
      description: "Reminder for pending leave approvals",
      isActive: true,
      recipientConfig: {
        notifyRequester: false,
        notifyManager: true,
        notifyTeamLead: true,
        notifyDepartmentHead: false,
        notifyHR: true,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
    {
      type: "REQUEST_APPROVED" as const,
      name: "Request Approved",
      description: "When a request is approved",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
        notifyManager: false,
        notifyTeamLead: false,
        notifyDepartmentHead: false,
        notifyHR: false,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
    {
      type: "REQUEST_REJECTED" as const,
      name: "Request Rejected",
      description: "When a request is rejected",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
        notifyManager: false,
        notifyTeamLead: false,
        notifyDepartmentHead: false,
        notifyHR: false,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
    {
      type: "ANNOUNCEMENT_PUBLISHED" as const,
      name: "Announcement Published",
      description: "When a new announcement is published",
      isActive: true,
      recipientConfig: {
        notifyRequester: false,
        notifyManager: false,
        notifyTeamLead: false,
        notifyDepartmentHead: false,
        notifyHR: false,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
    {
      type: "WELCOME_EMAIL" as const,
      name: "Welcome Email",
      description: "Welcome email for new employees",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
        notifyManager: false,
        notifyTeamLead: false,
        notifyDepartmentHead: false,
        notifyHR: false,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
    {
      type: "APPRECIATION" as const,
      name: "Appreciation",
      description: "Appreciation/recognition emails",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
        notifyManager: false,
        notifyTeamLead: false,
        notifyDepartmentHead: false,
        notifyHR: false,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
    {
      type: "ASSET_ASSIGNED" as const,
      name: "Asset Assigned",
      description: "When an asset is assigned to an employee",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
        notifyManager: false,
        notifyTeamLead: false,
        notifyDepartmentHead: false,
        notifyHR: false,
        notifyAdmin: false,
        customRecipients: [],
      },
    },
  ];

  for (const rule of notificationRules) {
    await prisma.notificationRule.upsert({
      where: { type: rule.type },
      update: {
        name: rule.name,
        description: rule.description,
        recipientConfig: rule.recipientConfig,
      },
      create: rule,
    });
  }
  console.log(`  Created ${notificationRules.length} notification rules`);

  // ============================================
  // ORGANIZATION SETTINGS
  // ============================================
  console.log("Creating organization settings...");
  await prisma.organizationSettings.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "TechCorp Inc.",
      fiscalYearStart: 1,
      workingDaysPerWeek: 5,
    },
  });
  console.log("  Created organization settings");

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n===========================================");
  console.log("          SEED COMPLETED SUCCESSFULLY      ");
  console.log("===========================================\n");
  console.log("Sample Data Created:");
  console.log(`  - ${branches.length} Branches`);
  console.log(`  - ${departments.length} Departments`);
  console.log(`  - ${teams.length} Teams`);
  console.log(`  - ${allUsers.length} Users`);
  console.log(`  - ${leaveTypes.length} Leave Types`);
  console.log(`  - ${holidays.length} Holidays`);
  console.log(`  - ${leaveRequests.length} Leave Requests`);
  console.log("  - 5 Notices");
  console.log(`  - ${assets.length} Assets`);
  console.log(`  - ${assetAssignments.length} Asset Assignments`);
  console.log(`  - ${attendanceCount} Attendance Records`);
  console.log(`  - ${emailTemplates.length} Email Templates`);
  console.log(`  - ${notificationRules.length} Notification Rules`);
  console.log("\n-------------------------------------------");
  console.log("Login Credentials (all use same password):");
  console.log("-------------------------------------------");
  console.log("Password for all users: password123\n");
  console.log("Admin:      admin@techcorp.com");
  console.log("HR Manager: sarah.johnson@techcorp.com");
  console.log("Manager:    michael.chen@techcorp.com");
  console.log("Team Lead:  emily.davis@techcorp.com");
  console.log("Employee:   alex.thompson@techcorp.com");
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
