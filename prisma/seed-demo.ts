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
const prisma: any = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database with demo data...\n");

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
  // ADDITIONAL LEAVE TYPES
  // ============================================
  console.log("Creating additional leave types...");
  const additionalLeaveTypes = [
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

  for (const lt of additionalLeaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: lt,
      create: lt,
    });
  }
  console.log(`  Created ${additionalLeaveTypes.length} additional leave types`);

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
  // DEMO USERS
  // ============================================
  console.log("Creating demo users...");

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
  ]);

  const allDemoUsers = [hrManager, engManager, frontendLead, backendLead, ...employees];
  console.log(`  Created ${allDemoUsers.length} demo users`);

  // ============================================
  // LEAVE ALLOCATIONS
  // ============================================
  console.log("Allocating leaves to demo users...");
  const allLeaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });

  for (const user of allDemoUsers) {
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
  console.log(`  Allocated leaves for ${allDemoUsers.length} users`);

  // ============================================
  // LEAVE REQUESTS
  // ============================================
  console.log("Creating leave requests...");
  const annualLeave = allLeaveTypes.find((lt: any) => lt.code === "AL");
  const sickLeave = allLeaveTypes.find((lt: any) => lt.code === "SL");

  const leaveRequests = [];

  if (annualLeave && sickLeave) {
    leaveRequests.push(
      prisma.leaveRequest.create({
        data: {
          userId: employees[0].id,
          leaveTypeId: annualLeave.id,
          startDate: new Date(`${currentYear}-03-10`),
          endDate: new Date(`${currentYear}-03-14`),
          days: 5,
          reason: "Family vacation",
          status: "PENDING",
        },
      }),
      prisma.leaveRequest.create({
        data: {
          userId: employees[1].id,
          leaveTypeId: sickLeave.id,
          startDate: new Date(`${currentYear}-02-20`),
          endDate: new Date(`${currentYear}-02-21`),
          days: 2,
          reason: "Not feeling well",
          status: "APPROVED",
          approverId: frontendLead.id,
          approvedAt: new Date(`${currentYear}-02-19`),
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
      })
    );

    await Promise.all(leaveRequests);
  }
  console.log(`  Created ${leaveRequests.length} leave requests`);

  // ============================================
  // NOTICES
  // ============================================
  console.log("Creating notices...");
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  await Promise.all([
    prisma.notice.create({
      data: {
        title: "Welcome to Workseed",
        content:
          "We are excited to announce the launch of our new Human Resource Management System. This system will help streamline leave management, attendance tracking, and employee information management.",
        type: "GENERAL",
        isActive: true,
        publishedAt: new Date(`${currentYear}-01-01`),
        expiresAt: new Date(`${currentYear}-12-31`),
        createdById: admin?.id || hrManager.id,
      },
    }),
    prisma.notice.create({
      data: {
        title: "Q1 Town Hall Meeting",
        content:
          "Please join us for our Q1 Town Hall meeting. We will be discussing company performance and upcoming projects.",
        type: "IMPORTANT",
        isActive: true,
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdById: hrManager.id,
      },
    }),
  ]);
  console.log("  Created 2 notices");

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
<div class="info-row"><span class="info-label">Leave Type:</span><span class="info-value">{{leaveType}}</span></div>
<div class="info-row"><span class="info-label">Duration:</span><span class="info-value">{{startDate}} to {{endDate}} ({{days}} days)</span></div>`,
      variables: {
        leaveType: "Type of leave",
        startDate: "Start date",
        endDate: "End date",
        days: "Number of days",
      },
      isSystem: true,
    },
    {
      name: "leave_request_approved",
      displayName: "Leave Request Approved",
      type: "LEAVE_REQUEST_APPROVED" as const,
      subject: "Leave Request Approved - {{leaveType}}",
      htmlBody: `<h2 class="title">Leave Request Approved</h2>
<p class="content">Your leave request has been approved.</p>
<div class="info-row"><span class="info-label">Leave Type:</span><span class="info-value">{{leaveType}}</span></div>
<div class="info-row"><span class="info-label">Duration:</span><span class="info-value">{{startDate}} to {{endDate}}</span></div>`,
      variables: {
        leaveType: "Type of leave",
        startDate: "Start date",
        endDate: "End date",
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
<p class="content">Your leave request has been rejected.</p>
<div class="info-row"><span class="info-label">Reason:</span><span class="info-value">{{rejectionReason}}</span></div>`,
      variables: {
        leaveType: "Type of leave",
        rejectionReason: "Reason for rejection",
      },
      isSystem: true,
    },
  ];

  for (const template of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: {},
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
        notifyHR: true,
      },
    },
    {
      type: "LEAVE_REQUEST_APPROVED" as const,
      name: "Leave Request Approved",
      description: "When a leave request is approved",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
      },
    },
    {
      type: "LEAVE_REQUEST_REJECTED" as const,
      name: "Leave Request Rejected",
      description: "When a leave request is rejected",
      isActive: true,
      recipientConfig: {
        notifyRequester: true,
      },
    },
  ];

  for (const rule of notificationRules) {
    await prisma.notificationRule.upsert({
      where: { type: rule.type },
      update: {},
      create: rule,
    });
  }
  console.log(`  Created ${notificationRules.length} notification rules`);

  // ============================================
  // UPDATE ORG SETTINGS FOR DEMO
  // ============================================
  await prisma.organizationSettings.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {
      name: "TechCorp Inc.",
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "TechCorp Inc.",
      fiscalYearStart: 1,
      workingDaysPerWeek: 5,
    },
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n===========================================");
  console.log("       DEMO DATA SEEDED SUCCESSFULLY       ");
  console.log("===========================================\n");
  console.log("Demo Data Created:");
  console.log(`  - ${branches.length} Branches`);
  console.log(`  - ${departments.length} Departments`);
  console.log(`  - ${teams.length} Teams`);
  console.log(`  - ${allDemoUsers.length} Demo Users`);
  console.log(`  - ${additionalLeaveTypes.length} Additional Leave Types`);
  console.log(`  - ${holidays.length} Holidays`);
  console.log(`  - ${leaveRequests.length} Leave Requests`);
  console.log("  - 2 Notices");
  console.log(`  - ${emailTemplates.length} Email Templates`);
  console.log(`  - ${notificationRules.length} Notification Rules`);
  console.log("\n-------------------------------------------");
  console.log("Demo Login Credentials (password: password123):");
  console.log("-------------------------------------------");
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
