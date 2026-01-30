import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { z } from "zod/v4";

const createLeaveTypeSchema = z.object({
  name: z.string().min(1, "Leave type name is required"),
  code: z.string().min(1, "Leave type code is required"),
  description: z.string().optional(),
  defaultDays: z.number().min(0).default(0),
  maxDays: z.number().min(0).optional(),
  carryForward: z.boolean().default(false),
  maxCarryForward: z.number().min(0).optional(),
  isPaid: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  minDaysNotice: z.number().min(0).default(0),
  color: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("all") === "true";

    // Only HR and above can see inactive leave types
    const showAll = includeInactive && isHROrAbove(currentUser.role);

    const leaveTypes = await prisma.leaveType.findMany({
      where: showAll ? {} : { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: { leaveTypes },
    });
  } catch (error) {
    console.error("List leave types error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
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
    const data = createLeaveTypeSchema.parse(body);

    const existing = await prisma.leaveType.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Leave type code already exists" },
        { status: 400 }
      );
    }

    const leaveType = await prisma.leaveType.create({
      data,
    });

    return NextResponse.json(
      { success: true, data: { leaveType } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create leave type error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
