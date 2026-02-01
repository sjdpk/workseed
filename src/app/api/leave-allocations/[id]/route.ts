import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";

const updateAllocationSchema = z.object({
  allocated: z.number().min(0).optional(),
  adjusted: z.number().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ success: false, error: "Invalid allocation ID" }, { status: 400 });
    }

    const allocation = await prisma.leaveAllocation.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        leaveType: true,
      },
    });

    if (!allocation) {
      return NextResponse.json({ success: false, error: "Allocation not found" }, { status: 404 });
    }

    // Only allow viewing own allocation or if HR/Admin
    if (allocation.userId !== currentUser.id && !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const balance =
      allocation.allocated + allocation.carriedOver + allocation.adjusted - allocation.used;

    return NextResponse.json({
      success: true,
      data: { allocation: { ...allocation, balance } },
    });
  } catch (error) {
    logger.error("Get allocation error", { error, endpoint: "GET /api/leave-allocations/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ success: false, error: "Invalid allocation ID" }, { status: 400 });
    }

    const body = await request.json();
    const data = updateAllocationSchema.parse(body);

    const existing = await prisma.leaveAllocation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Allocation not found" }, { status: 404 });
    }

    const allocation = await prisma.leaveAllocation.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        leaveType: true,
      },
    });

    const balance =
      allocation.allocated + allocation.carriedOver + allocation.adjusted - allocation.used;

    return NextResponse.json({
      success: true,
      data: { allocation: { ...allocation, balance } },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update allocation error", {
      error,
      endpoint: "PATCH /api/leave-allocations/[id]",
    });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
