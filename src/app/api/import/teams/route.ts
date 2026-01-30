import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove, createAuditLog, getRequestMeta } from "@/lib";

interface TeamImportRow {
  code: string;
  name: string;
  description?: string;
  departmentCode?: string;
  leadEmployeeId?: string;
  isActive?: string;
}

interface ImportResult {
  success: boolean;
  row: number;
  code?: string;
  name?: string;
  error?: string;
}

function parseCSV(csvText: string): TeamImportRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['\"]/g, ""));
  const rows: TeamImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^["']|["']$/g, "") || "";
    });

    rows.push({
      code: row.code || row.team_code || "",
      name: row.name || row.team || row.team_name || "",
      description: row.description || row.desc || "",
      departmentCode: row.departmentcode || row.department_code || row.department || row.dept || "",
      leadEmployeeId: row.leademployeeid || row.lead_employee_id || row.lead || row.teamlead || row.team_lead || "",
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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { csvData, dryRun = false } = body;

    if (!csvData) {
      return NextResponse.json(
        { success: false, error: "CSV data is required" },
        { status: 400 }
      );
    }

    const rows = parseCSV(csvData);
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid data found in CSV" },
        { status: 400 }
      );
    }

    // Fetch lookup data
    const [departments, users, existingTeams] = await Promise.all([
      prisma.department.findMany({ select: { id: true, code: true, name: true } }),
      prisma.user.findMany({ select: { id: true, employeeId: true } }),
      prisma.team.findMany({ select: { code: true } }),
    ]);

    const deptMap = new Map<string, string>(departments.map((d: { id: string; code: string }) => [d.code.toLowerCase(), d.id]));
    const deptNameMap = new Map<string, string>(departments.map((d: { id: string; name: string }) => [d.name.toLowerCase(), d.id]));
    const userMap = new Map<string, string>(users.map((u: { id: string; employeeId: string }) => [u.employeeId.toLowerCase(), u.id]));
    const existingCodes = new Set(existingTeams.map((t: { code: string }) => t.code.toLowerCase()));

    const results: ImportResult[] = [];
    const teamsToCreate: Array<{
      row: number;
      code: string;
      name: string;
      description?: string;
      departmentId: string;
      leadId?: string;
      isActive: boolean;
    }> = [];

    // Validate all rows first
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.code) {
        results.push({ success: false, row: rowNum, error: "Team code is required" });
        continue;
      }

      if (!row.name) {
        results.push({ success: false, row: rowNum, code: row.code, error: "Team name is required" });
        continue;
      }

      if (!row.departmentCode) {
        results.push({ success: false, row: rowNum, code: row.code, error: "Department is required" });
        continue;
      }

      // Check duplicate code
      if (existingCodes.has(row.code.toLowerCase())) {
        results.push({ success: false, row: rowNum, code: row.code, error: `Team code ${row.code} already exists` });
        continue;
      }

      // Lookup department
      const departmentId = deptMap.get(row.departmentCode.toLowerCase()) || deptNameMap.get(row.departmentCode.toLowerCase());
      if (!departmentId) {
        results.push({ success: false, row: rowNum, code: row.code, error: `Department not found: ${row.departmentCode}` });
        continue;
      }

      // Lookup lead
      let leadId: string | undefined;
      if (row.leadEmployeeId) {
        leadId = userMap.get(row.leadEmployeeId.toLowerCase());
        if (!leadId) {
          results.push({ success: false, row: rowNum, code: row.code, error: `Employee not found for lead: ${row.leadEmployeeId}` });
          continue;
        }
      }

      const isActive = !row.isActive || ["true", "1", "yes", "active"].includes(row.isActive.toLowerCase());

      existingCodes.add(row.code.toLowerCase());

      teamsToCreate.push({
        row: rowNum,
        code: row.code.toUpperCase(),
        name: row.name,
        description: row.description,
        departmentId,
        leadId,
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
          valid: teamsToCreate.length,
          invalid: results.filter((r) => !r.success).length,
          errors: results.filter((r) => !r.success),
          preview: teamsToCreate.slice(0, 10).map((t) => ({
            row: t.row,
            code: t.code,
            name: t.name,
            department: departments.find((d: { id: string }) => d.id === t.departmentId)?.name,
          })),
        },
      });
    }

    // Actually create teams
    const { ipAddress, userAgent } = getRequestMeta(request.headers);

    for (const team of teamsToCreate) {
      try {
        await prisma.team.create({
          data: {
            code: team.code,
            name: team.name,
            description: team.description,
            departmentId: team.departmentId,
            leadId: team.leadId,
            isActive: team.isActive,
          },
        });

        results.push({
          success: true,
          row: team.row,
          code: team.code,
          name: team.name,
        });
      } catch (error) {
        results.push({
          success: false,
          row: team.row,
          code: team.code,
          error: error instanceof Error ? error.message : "Failed to create team",
        });
      }
    }

    // Audit log
    await createAuditLog({
      userId: currentUser.id,
      action: "IMPORT",
      entity: "TEAM",
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
    console.error("Import teams error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
