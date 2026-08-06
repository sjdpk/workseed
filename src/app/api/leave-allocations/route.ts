import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { describeFiscalYear } from "@/lib/fiscal-year";
import { getCurrentFiscalYear, getFiscalYearConfig } from "@/lib/fiscal-year-server";
import { getOrgTimeZone } from "@/lib/time-server";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";
import { can } from "@/lib/rbac";

const createAllocationSchema = z.object({
  userId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  year: z.number().int(),
  allocated: z.number().min(0),
  carriedOver: z.number().min(0).default(0),
  adjusted: z.number().default(0),
  notes: z.string().optional(),
});

const updateAllocationSchema = z.object({
  allocated: z.number().min(0).optional(),
  adjusted: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    // allocations are keyed by fiscal year, which is only the calendar year when
    // the company starts its year on 1 January
    const running = await getCurrentFiscalYear();
    const requested = searchParams.get("year");
    const year = requested || String(running.year);
    /* Echo the year that was actually read, not the running one — the balance
       screen labels itself from this. */
    const fiscalYear =
      requested && Number(requested) !== running.year
        ? describeFiscalYear(Number(requested), await getFiscalYearConfig(), await getOrgTimeZone())
        : running;

    // Users can only see their own allocations unless HR/Admin
    const targetUserId =
      (await can(currentUser, "LEAVE_TYPE_EDIT")) && userId ? userId : currentUser.id;

    const allocations = await prisma.leaveAllocation.findMany({
      where: {
        userId: targetUserId,
        year: parseInt(year),
      },
      include: {
        leaveType: true,
      },
      orderBy: { leaveType: { name: "asc" } },
    });

    // Calculate balance for each allocation
    const allocationsWithBalance = allocations.map((a) => ({
      ...a,
      balance: a.allocated + a.carriedOver + a.adjusted - a.used,
    }));

    return NextResponse.json({
      success: true,
      data: {
        allocations: allocationsWithBalance,
        fiscalYear: { year: fiscalYear.year, label: fiscalYear.label },
      },
    });
  } catch (error) {
    logger.error("List leave allocations error", { error, endpoint: "GET /api/leave-allocations" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await can(currentUser, "LEAVE_TYPE_EDIT"))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createAllocationSchema.parse(body);

    // Check if allocation already exists
    const existing = await prisma.leaveAllocation.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId: data.userId,
          leaveTypeId: data.leaveTypeId,
          year: data.year,
        },
      },
    });

    if (existing) {
      // Update existing allocation
      const updated = await prisma.leaveAllocation.update({
        where: { id: existing.id },
        data: {
          allocated: data.allocated,
          carriedOver: data.carriedOver,
          adjusted: data.adjusted,
          notes: data.notes,
        },
        include: { leaveType: true },
      });

      return NextResponse.json({
        success: true,
        data: { allocation: updated },
      });
    }

    const allocation = await prisma.leaveAllocation.create({
      data,
      include: { leaveType: true },
    });

    return NextResponse.json({ success: true, data: { allocation } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Create leave allocation error", {
      error,
      endpoint: "POST /api/leave-allocations",
    });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await can(currentUser, "LEAVE_TYPE_EDIT"))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Allocation ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = updateAllocationSchema.parse(body);

    const allocation = await prisma.leaveAllocation.update({
      where: { id },
      data,
      include: { leaveType: true },
    });

    return NextResponse.json({
      success: true,
      data: { allocation },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update leave allocation error", {
      error,
      endpoint: "PATCH /api/leave-allocations",
    });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
