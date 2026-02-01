import { NextRequest, NextResponse } from "next/server";
import {
  prisma,
  hashPassword,
  getCurrentUser,
  isHROrAbove,
  createAuditLog,
  getRequestMeta,
} from "@/lib";

interface UserImportRow {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  phone?: string;
  role?: string;
  status?: string;
  designation?: string;
  employmentType?: string;
  joiningDate?: string;
  departmentCode?: string;
  teamCode?: string;
  branchCode?: string;
}

interface ImportResult {
  success: boolean;
  row: number;
  email?: string;
  employeeId?: string;
  error?: string;
}

async function _generateEmployeeId(): Promise<string> {
  const count = await prisma.user.count();
  const paddedNumber = String(count + 1).padStart(5, "0");
  return `EMP${paddedNumber}`;
}

async function allocateDefaultLeaves(userId: string) {
  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });

  const currentYear = new Date().getFullYear();

  for (const leaveType of leaveTypes) {
    await prisma.leaveAllocation.create({
      data: {
        userId,
        leaveTypeId: leaveType.id,
        year: currentYear,
        allocated: leaveType.defaultDays,
      },
    });
  }
}

function parseCSV(csvText: string): UserImportRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: UserImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^["']|["']$/g, "") || "";
    });

    rows.push({
      email: row.email || row.e_mail || row["e-mail"] || "",
      password: row.password || row.pwd || "Welcome@123",
      firstName:
        row.firstname || row["first name"] || row.first_name || row.name?.split(" ")[0] || "",
      lastName:
        row.lastname ||
        row["last name"] ||
        row.last_name ||
        row.name?.split(" ").slice(1).join(" ") ||
        "",
      employeeId:
        row.employeeid || row["employee id"] || row.employee_id || row.empid || row.emp_id || "",
      phone: row.phone || row.mobile || row.contact || "",
      role: row.role || "EMPLOYEE",
      status: row.status || "ACTIVE",
      designation: row.designation || row.title || row.position || "",
      employmentType:
        row.employmenttype ||
        row["employment type"] ||
        row.employment_type ||
        row.type ||
        "FULL_TIME",
      joiningDate:
        row.joiningdate || row["joining date"] || row.joining_date || row.joindate || row.doj || "",
      departmentCode:
        row.departmentcode || row["department code"] || row.department || row.dept || "",
      teamCode: row.teamcode || row["team code"] || row.team || "",
      branchCode: row.branchcode || row["branch code"] || row.branch || "",
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const VALID_ROLES = ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"];
const VALID_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const VALID_EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { csvData, dryRun = false } = body;

    if (!csvData) {
      return NextResponse.json({ success: false, error: "CSV data is required" }, { status: 400 });
    }

    const rows = parseCSV(csvData);
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid data found in CSV" },
        { status: 400 }
      );
    }

    // Fetch lookup data
    const [departments, teams, branches, existingEmails, existingEmployeeIds] = await Promise.all([
      prisma.department.findMany({ select: { id: true, code: true, name: true } }),
      prisma.team.findMany({ select: { id: true, code: true, name: true } }),
      prisma.branch.findMany({ select: { id: true, code: true, name: true } }),
      prisma.user.findMany({ select: { email: true } }),
      prisma.user.findMany({ select: { employeeId: true } }),
    ]);

    const deptMap = new Map(departments.map((d) => [d.code.toLowerCase(), d.id]));
    const deptNameMap = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
    const teamMap = new Map(teams.map((t) => [t.code.toLowerCase(), t.id]));
    const teamNameMap = new Map(teams.map((t) => [t.name.toLowerCase(), t.id]));
    const branchMap = new Map(branches.map((b) => [b.code.toLowerCase(), b.id]));
    const branchNameMap = new Map(branches.map((b) => [b.name.toLowerCase(), b.id]));
    const emailSet = new Set(existingEmails.map((u) => u.email.toLowerCase()));
    const empIdSet = new Set(existingEmployeeIds.map((u) => u.employeeId.toLowerCase()));

    const results: ImportResult[] = [];
    const usersToCreate: Array<{
      row: number;
      data: UserImportRow;
      departmentId?: string;
      teamId?: string;
      branchId?: string;
      employeeId: string;
    }> = [];

    // Validate all rows first
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, and we're 0-indexed

      // Required field validation
      if (!row.email) {
        results.push({ success: false, row: rowNum, error: "Email is required" });
        continue;
      }

      if (!row.firstName) {
        results.push({
          success: false,
          row: rowNum,
          email: row.email,
          error: "First name is required",
        });
        continue;
      }

      if (!row.lastName) {
        results.push({
          success: false,
          row: rowNum,
          email: row.email,
          error: "Last name is required",
        });
        continue;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        results.push({
          success: false,
          row: rowNum,
          email: row.email,
          error: "Invalid email format",
        });
        continue;
      }

      // Check duplicate email
      if (emailSet.has(row.email.toLowerCase())) {
        results.push({
          success: false,
          row: rowNum,
          email: row.email,
          error: "Email already exists",
        });
        continue;
      }

      // Check duplicate employee ID
      let employeeId = row.employeeId || "";
      if (employeeId && empIdSet.has(employeeId.toLowerCase())) {
        results.push({
          success: false,
          row: rowNum,
          email: row.email,
          error: `Employee ID ${employeeId} already exists`,
        });
        continue;
      }

      // Validate role
      const role = row.role?.toUpperCase() || "EMPLOYEE";
      if (!VALID_ROLES.includes(role)) {
        results.push({
          success: false,
          row: rowNum,
          email: row.email,
          error: `Invalid role: ${row.role}`,
        });
        continue;
      }

      // HR cannot create ADMIN/HR users
      if ((role === "ADMIN" || role === "HR") && currentUser.role !== "ADMIN") {
        results.push({
          success: false,
          row: rowNum,
          email: row.email,
          error: "Only Admin can create Admin/HR users",
        });
        continue;
      }

      // Validate status
      const status = row.status?.toUpperCase() || "ACTIVE";
      if (!VALID_STATUSES.includes(status)) {
        results.push({
          success: false,
          row: rowNum,
          email: row.email,
          error: `Invalid status: ${row.status}`,
        });
        continue;
      }

      // Validate employment type
      const employmentType = row.employmentType?.toUpperCase().replace(" ", "_") || "FULL_TIME";
      if (!VALID_EMPLOYMENT_TYPES.includes(employmentType)) {
        results.push({
          success: false,
          row: rowNum,
          email: row.email,
          error: `Invalid employment type: ${row.employmentType}`,
        });
        continue;
      }

      // Lookup department
      let departmentId: string | undefined;
      if (row.departmentCode) {
        departmentId =
          deptMap.get(row.departmentCode.toLowerCase()) ||
          deptNameMap.get(row.departmentCode.toLowerCase());
        if (!departmentId) {
          results.push({
            success: false,
            row: rowNum,
            email: row.email,
            error: `Department not found: ${row.departmentCode}`,
          });
          continue;
        }
      }

      // Lookup team
      let teamId: string | undefined;
      if (row.teamCode) {
        teamId =
          teamMap.get(row.teamCode.toLowerCase()) || teamNameMap.get(row.teamCode.toLowerCase());
        if (!teamId) {
          results.push({
            success: false,
            row: rowNum,
            email: row.email,
            error: `Team not found: ${row.teamCode}`,
          });
          continue;
        }
      }

      // Lookup branch
      let branchId: string | undefined;
      if (row.branchCode) {
        branchId =
          branchMap.get(row.branchCode.toLowerCase()) ||
          branchNameMap.get(row.branchCode.toLowerCase());
        if (!branchId) {
          results.push({
            success: false,
            row: rowNum,
            email: row.email,
            error: `Branch not found: ${row.branchCode}`,
          });
          continue;
        }
      }

      // Generate employee ID if not provided
      if (!employeeId) {
        const count = await prisma.user.count();
        employeeId = `EMP${String(count + usersToCreate.length + 1).padStart(5, "0")}`;
      }

      // Add to email/empId sets to prevent duplicates within the same import
      emailSet.add(row.email.toLowerCase());
      empIdSet.add(employeeId.toLowerCase());

      usersToCreate.push({
        row: rowNum,
        data: row,
        departmentId,
        teamId,
        branchId,
        employeeId,
      });
    }

    // If dry run, return validation results only
    if (dryRun) {
      const validCount = usersToCreate.length;
      const invalidCount = results.filter((r) => !r.success).length;

      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          total: rows.length,
          valid: validCount,
          invalid: invalidCount,
          errors: results.filter((r) => !r.success),
          preview: usersToCreate.slice(0, 10).map((u) => ({
            row: u.row,
            email: u.data.email,
            employeeId: u.employeeId,
            name: `${u.data.firstName} ${u.data.lastName}`,
            role: u.data.role?.toUpperCase() || "EMPLOYEE",
            department: u.departmentId
              ? departments.find((d) => d.id === u.departmentId)?.name
              : undefined,
          })),
        },
      });
    }

    // Actually create users
    const { ipAddress, userAgent } = getRequestMeta(request.headers);

    for (const userToCreate of usersToCreate) {
      try {
        const hashedPassword = await hashPassword(userToCreate.data.password || "Welcome@123");

        const user = await prisma.user.create({
          data: {
            employeeId: userToCreate.employeeId,
            email: userToCreate.data.email,
            password: hashedPassword,
            firstName: userToCreate.data.firstName,
            lastName: userToCreate.data.lastName,
            phone: userToCreate.data.phone || null,
            role: (userToCreate.data.role?.toUpperCase() || "EMPLOYEE") as
              | "ADMIN"
              | "HR"
              | "MANAGER"
              | "TEAM_LEAD"
              | "EMPLOYEE",
            status: (userToCreate.data.status?.toUpperCase() || "ACTIVE") as
              | "ACTIVE"
              | "INACTIVE"
              | "SUSPENDED",
            designation: userToCreate.data.designation || null,
            employmentType: (userToCreate.data.employmentType?.toUpperCase().replace(" ", "_") ||
              "FULL_TIME") as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN",
            joiningDate: userToCreate.data.joiningDate
              ? new Date(userToCreate.data.joiningDate)
              : null,
            departmentId: userToCreate.departmentId || null,
            teamId: userToCreate.teamId || null,
            branchId: userToCreate.branchId || null,
            createdBy: currentUser.id,
          },
        });

        // Allocate default leaves
        await allocateDefaultLeaves(user.id);

        results.push({
          success: true,
          row: userToCreate.row,
          email: user.email,
          employeeId: user.employeeId,
        });
      } catch (error) {
        results.push({
          success: false,
          row: userToCreate.row,
          email: userToCreate.data.email,
          error: error instanceof Error ? error.message : "Failed to create user",
        });
      }
    }

    // Audit log
    await createAuditLog({
      userId: currentUser.id,
      action: "IMPORT",
      entity: "USER",
      entityId: "bulk",
      details: {
        total: rows.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        total: rows.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      },
    });
  } catch (error) {
    console.error("Import users error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
