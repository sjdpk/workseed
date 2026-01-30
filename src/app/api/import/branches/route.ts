import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove, createAuditLog, getRequestMeta } from "@/lib";

interface BranchImportRow {
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive?: string;
}

interface ImportResult {
  success: boolean;
  row: number;
  code?: string;
  name?: string;
  error?: string;
}

function parseCSV(csvText: string): BranchImportRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['\"]/g, ""));
  const rows: BranchImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^["']|["']$/g, "") || "";
    });

    rows.push({
      code: row.code || row.branch_code || "",
      name: row.name || row.branch || row.branch_name || "",
      address: row.address || "",
      city: row.city || "",
      state: row.state || row.province || "",
      country: row.country || "",
      phone: row.phone || row.telephone || row.contact || "",
      email: row.email || "",
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

    // Fetch existing branches
    const existingBranches = await prisma.branch.findMany({ select: { code: true } });
    const existingCodes = new Set(existingBranches.map((b: { code: string }) => b.code.toLowerCase()));

    const results: ImportResult[] = [];
    const branchesToCreate: Array<{
      row: number;
      code: string;
      name: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      phone?: string;
      email?: string;
      isActive: boolean;
    }> = [];

    // Validate all rows first
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.code) {
        results.push({ success: false, row: rowNum, error: "Branch code is required" });
        continue;
      }

      if (!row.name) {
        results.push({ success: false, row: rowNum, code: row.code, error: "Branch name is required" });
        continue;
      }

      // Check duplicate code
      if (existingCodes.has(row.code.toLowerCase())) {
        results.push({ success: false, row: rowNum, code: row.code, error: `Branch code ${row.code} already exists` });
        continue;
      }

      // Validate email if provided
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        results.push({ success: false, row: rowNum, code: row.code, error: `Invalid email format: ${row.email}` });
        continue;
      }

      const isActive = !row.isActive || ["true", "1", "yes", "active"].includes(row.isActive.toLowerCase());

      existingCodes.add(row.code.toLowerCase());

      branchesToCreate.push({
        row: rowNum,
        code: row.code.toUpperCase(),
        name: row.name,
        address: row.address,
        city: row.city,
        state: row.state,
        country: row.country,
        phone: row.phone,
        email: row.email,
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
          valid: branchesToCreate.length,
          invalid: results.filter((r) => !r.success).length,
          errors: results.filter((r) => !r.success),
          preview: branchesToCreate.slice(0, 10).map((b) => ({
            row: b.row,
            code: b.code,
            name: b.name,
            city: b.city,
            country: b.country,
          })),
        },
      });
    }

    // Actually create branches
    const { ipAddress, userAgent } = getRequestMeta(request.headers);

    for (const branch of branchesToCreate) {
      try {
        await prisma.branch.create({
          data: {
            code: branch.code,
            name: branch.name,
            address: branch.address,
            city: branch.city,
            state: branch.state,
            country: branch.country,
            phone: branch.phone,
            email: branch.email,
            isActive: branch.isActive,
          },
        });

        results.push({
          success: true,
          row: branch.row,
          code: branch.code,
          name: branch.name,
        });
      } catch (error) {
        results.push({
          success: false,
          row: branch.row,
          code: branch.code,
          error: error instanceof Error ? error.message : "Failed to create branch",
        });
      }
    }

    // Audit log
    await createAuditLog({
      userId: currentUser.id,
      action: "IMPORT",
      entity: "BRANCH",
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
    console.error("Import branches error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
