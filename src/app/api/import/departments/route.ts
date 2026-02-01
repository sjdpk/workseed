import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove, createAuditLog, getRequestMeta } from "@/lib";

interface DepartmentImportRow {
  code: string;
  name: string;
  description?: string;
  branchCode?: string;
  headEmployeeId?: string;
  isActive?: string;
}

interface ImportResult {
  success: boolean;
  row: number;
  code?: string;
  name?: string;
  error?: string;
}

function parseCSV(csvText: string): DepartmentImportRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['\"]/g, ""));
  const rows: DepartmentImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^["']|["']$/g, "") || "";
    });

    rows.push({
      code: row.code || row.dept_code || row.department_code || "",
      name: row.name || row.department || row.dept_name || row.department_name || "",
      description: row.description || row.desc || "",
      branchCode: row.branchcode || row.branch_code || row.branch || "",
      headEmployeeId: row.heademployeeid || row.head_employee_id || row.head || row.manager || "",
      isActive: row.isactive || row.is_active || row.active || row.status || "true",
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
    const [branches, users, existingDepts] = await Promise.all([
      prisma.branch.findMany({ select: { id: true, code: true, name: true } }),
      prisma.user.findMany({ select: { id: true, employeeId: true } }),
      prisma.department.findMany({ select: { code: true } }),
    ]);

    const branchMap = new Map<string, string>(
      branches.map((b: { id: string; code: string }) => [b.code.toLowerCase(), b.id])
    );
    const branchNameMap = new Map<string, string>(
      branches.map((b: { id: string; name: string }) => [b.name.toLowerCase(), b.id])
    );
    const userMap = new Map<string, string>(
      users.map((u: { id: string; employeeId: string }) => [u.employeeId.toLowerCase(), u.id])
    );
    const existingCodes = new Set(existingDepts.map((d: { code: string }) => d.code.toLowerCase()));

    const results: ImportResult[] = [];
    const departmentsToCreate: Array<{
      row: number;
      code: string;
      name: string;
      description?: string;
      branchId?: string;
      headId?: string;
      isActive: boolean;
    }> = [];

    // Validate all rows first
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.code) {
        results.push({ success: false, row: rowNum, error: "Department code is required" });
        continue;
      }

      if (!row.name) {
        results.push({
          success: false,
          row: rowNum,
          code: row.code,
          error: "Department name is required",
        });
        continue;
      }

      // Check duplicate code
      if (existingCodes.has(row.code.toLowerCase())) {
        results.push({
          success: false,
          row: rowNum,
          code: row.code,
          error: `Department code ${row.code} already exists`,
        });
        continue;
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
            code: row.code,
            error: `Branch not found: ${row.branchCode}`,
          });
          continue;
        }
      }

      // Lookup head
      let headId: string | undefined;
      if (row.headEmployeeId) {
        headId = userMap.get(row.headEmployeeId.toLowerCase());
        if (!headId) {
          results.push({
            success: false,
            row: rowNum,
            code: row.code,
            error: `Employee not found for head: ${row.headEmployeeId}`,
          });
          continue;
        }
      }

      const isActive =
        !row.isActive || ["true", "1", "yes", "active"].includes(row.isActive.toLowerCase());

      existingCodes.add(row.code.toLowerCase());

      departmentsToCreate.push({
        row: rowNum,
        code: row.code.toUpperCase(),
        name: row.name,
        description: row.description,
        branchId,
        headId,
        isActive,
      });
    }

    // If dry run, return validation results only
    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          total: rows.length,
          valid: departmentsToCreate.length,
          invalid: results.filter((r) => !r.success).length,
          errors: results.filter((r) => !r.success),
          preview: departmentsToCreate.slice(0, 10).map((d) => ({
            row: d.row,
            code: d.code,
            name: d.name,
            branch: d.branchId
              ? branches.find((b: { id: string }) => b.id === d.branchId)?.name
              : undefined,
          })),
        },
      });
    }

    // Actually create departments
    const { ipAddress, userAgent } = getRequestMeta(request.headers);

    for (const dept of departmentsToCreate) {
      try {
        await prisma.department.create({
          data: {
            code: dept.code,
            name: dept.name,
            description: dept.description,
            branchId: dept.branchId,
            headId: dept.headId,
            isActive: dept.isActive,
          },
        });

        results.push({
          success: true,
          row: dept.row,
          code: dept.code,
          name: dept.name,
        });
      } catch (error) {
        results.push({
          success: false,
          row: dept.row,
          code: dept.code,
          error: error instanceof Error ? error.message : "Failed to create department",
        });
      }
    }

    // Audit log
    await createAuditLog({
      userId: currentUser.id,
      action: "IMPORT",
      entity: "DEPARTMENT",
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
    console.error("Import departments error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
