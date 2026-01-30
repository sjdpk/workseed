import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove, createAuditLog, getRequestMeta } from "@/lib";

interface AllocationImportRow {
  employeeId: string;
  leaveTypeCode: string;
  year: string;
  allocated: string;
  carriedOver?: string;
  adjusted?: string;
  notes?: string;
}

interface ImportResult {
  success: boolean;
  row: number;
  employeeId?: string;
  leaveType?: string;
  error?: string;
}

function parseCSV(csvText: string): AllocationImportRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: AllocationImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^["']|["']$/g, "") || "";
    });

    rows.push({
      employeeId: row.employeeid || row["employee id"] || row.employee_id || row.empid || "",
      leaveTypeCode: row.leavetypecode || row["leave type code"] || row.leavetype || row["leave type"] || row.type || "",
      year: row.year || new Date().getFullYear().toString(),
      allocated: row.allocated || row.days || row.balance || "0",
      carriedOver: row.carriedover || row["carried over"] || row.carried || "0",
      adjusted: row.adjusted || row.adjustment || "0",
      notes: row.notes || row.note || row.remarks || "",
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
    const [users, leaveTypes] = await Promise.all([
      prisma.user.findMany({ select: { id: true, employeeId: true } }),
      prisma.leaveType.findMany({ select: { id: true, code: true, name: true } }),
    ]);

    const userMap = new Map<string, string>(users.map((u: { id: string; employeeId: string }) => [u.employeeId.toLowerCase(), u.id]));
    const leaveTypeMap = new Map<string, string>(leaveTypes.map((lt: { id: string; code: string; name: string }) => [lt.code.toLowerCase(), lt.id]));
    const leaveTypeNameMap = new Map<string, string>(leaveTypes.map((lt: { id: string; code: string; name: string }) => [lt.name.toLowerCase(), lt.id]));

    const results: ImportResult[] = [];
    const allocationsToCreate: Array<{
      row: number;
      userId: string;
      leaveTypeId: string;
      year: number;
      allocated: number;
      carriedOver: number;
      adjusted: number;
      notes?: string;
      employeeId: string;
      leaveTypeName: string;
    }> = [];

    // Validate all rows first
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      // Required field validation
      if (!row.employeeId) {
        results.push({ success: false, row: rowNum, error: "Employee ID is required" });
        continue;
      }

      if (!row.leaveTypeCode) {
        results.push({ success: false, row: rowNum, employeeId: row.employeeId, error: "Leave type is required" });
        continue;
      }

      // Lookup user
      const userId = userMap.get(row.employeeId.toLowerCase());
      if (!userId) {
        results.push({ success: false, row: rowNum, employeeId: row.employeeId, error: `Employee not found: ${row.employeeId}` });
        continue;
      }

      // Lookup leave type
      const leaveTypeId = leaveTypeMap.get(row.leaveTypeCode.toLowerCase()) || leaveTypeNameMap.get(row.leaveTypeCode.toLowerCase());
      if (!leaveTypeId) {
        results.push({ success: false, row: rowNum, employeeId: row.employeeId, error: `Leave type not found: ${row.leaveTypeCode}` });
        continue;
      }

      // Validate year
      const year = parseInt(row.year);
      if (isNaN(year) || year < 2000 || year > 2100) {
        results.push({ success: false, row: rowNum, employeeId: row.employeeId, error: `Invalid year: ${row.year}` });
        continue;
      }

      // Validate numbers
      const allocated = parseFloat(row.allocated);
      if (isNaN(allocated) || allocated < 0) {
        results.push({ success: false, row: rowNum, employeeId: row.employeeId, error: `Invalid allocated days: ${row.allocated}` });
        continue;
      }

      const carriedOver = parseFloat(row.carriedOver || "0");
      if (isNaN(carriedOver) || carriedOver < 0) {
        results.push({ success: false, row: rowNum, employeeId: row.employeeId, error: `Invalid carried over days: ${row.carriedOver}` });
        continue;
      }

      const adjusted = parseFloat(row.adjusted || "0");
      if (isNaN(adjusted)) {
        results.push({ success: false, row: rowNum, employeeId: row.employeeId, error: `Invalid adjusted days: ${row.adjusted}` });
        continue;
      }

      const leaveType = leaveTypes.find((lt: { id: string; code: string; name: string }) => lt.id === leaveTypeId);

      allocationsToCreate.push({
        row: rowNum,
        userId,
        leaveTypeId,
        year,
        allocated,
        carriedOver,
        adjusted,
        notes: row.notes,
        employeeId: row.employeeId,
        leaveTypeName: leaveType?.name || row.leaveTypeCode,
      });
    }

    // If dry run, return validation results only
    if (dryRun) {
      const validCount = allocationsToCreate.length;
      const invalidCount = results.filter((r) => !r.success).length;

      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          total: rows.length,
          valid: validCount,
          invalid: invalidCount,
          errors: results.filter((r) => !r.success),
          preview: allocationsToCreate.slice(0, 10).map((a) => ({
            row: a.row,
            employeeId: a.employeeId,
            leaveType: a.leaveTypeName,
            year: a.year,
            allocated: a.allocated,
            carriedOver: a.carriedOver,
            adjusted: a.adjusted,
          })),
        },
      });
    }

    // Actually create/update allocations
    const { ipAddress, userAgent } = getRequestMeta(request.headers);

    for (const alloc of allocationsToCreate) {
      try {
        // Check if allocation already exists
        const existing = await prisma.leaveAllocation.findFirst({
          where: {
            userId: alloc.userId,
            leaveTypeId: alloc.leaveTypeId,
            year: alloc.year,
          },
        });

        if (existing) {
          // Update existing allocation
          await prisma.leaveAllocation.update({
            where: { id: existing.id },
            data: {
              allocated: alloc.allocated,
              carriedOver: alloc.carriedOver,
              adjusted: alloc.adjusted,
              notes: alloc.notes || existing.notes,
            },
          });
        } else {
          // Create new allocation
          await prisma.leaveAllocation.create({
            data: {
              userId: alloc.userId,
              leaveTypeId: alloc.leaveTypeId,
              year: alloc.year,
              allocated: alloc.allocated,
              carriedOver: alloc.carriedOver,
              adjusted: alloc.adjusted,
              notes: alloc.notes,
            },
          });
        }

        results.push({
          success: true,
          row: alloc.row,
          employeeId: alloc.employeeId,
          leaveType: alloc.leaveTypeName,
        });
      } catch (error) {
        results.push({
          success: false,
          row: alloc.row,
          employeeId: alloc.employeeId,
          error: error instanceof Error ? error.message : "Failed to create allocation",
        });
      }
    }

    // Audit log
    await createAuditLog({
      userId: currentUser.id,
      action: "IMPORT",
      entity: "LEAVE_ALLOCATION",
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
    console.error("Import leave allocations error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
