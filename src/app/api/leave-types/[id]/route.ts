import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";

const updateLeaveTypeSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  defaultDays: z.number().min(0).optional(),
  maxDays: z.number().min(0).optional().nullable(),
  carryForward: z.boolean().optional(),
  maxCarryForward: z.number().min(0).optional().nullable(),
  isPaid: z.boolean().optional(),
  isActive: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  minDaysNotice: z.number().min(0).optional(),
  color: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const leaveType = await prisma.leaveType.findUnique({
      where: { id },
    });

    if (!leaveType) {
      return NextResponse.json({ success: false, error: "Leave type not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { leaveType },
    });
  } catch (error) {
    logger.error("Get leave type error", { error, endpoint: "GET /api/leave-types/[id]" });
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
    const body = await request.json();
    const data = updateLeaveTypeSchema.parse(body);

    const existing = await prisma.leaveType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Leave type not found" }, { status: 404 });
    }

    // Check for duplicate code if changing
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.leaveType.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: "Leave type code already exists" },
          { status: 400 }
        );
      }
    }

    // Check for duplicate name if changing
    if (data.name && data.name !== existing.name) {
      const nameExists = await prisma.leaveType.findUnique({
        where: { name: data.name },
      });
      if (nameExists) {
        return NextResponse.json(
          { success: false, error: "Leave type name already exists" },
          { status: 400 }
        );
      }
    }

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      data: { leaveType },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update leave type error", { error, endpoint: "PATCH /api/leave-types/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Check if leave type has allocations or requests
    const hasData = await prisma.leaveAllocation.findFirst({
      where: { leaveTypeId: id },
    });

    if (hasData) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete leave type with existing allocations. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    await prisma.leaveType.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Leave type deleted" },
    });
  } catch (error) {
    logger.error("Delete leave type error", { error, endpoint: "DELETE /api/leave-types/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
