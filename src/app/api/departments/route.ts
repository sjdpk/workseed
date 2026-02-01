import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z.string().min(1, "Department code is required"),
  description: z.string().optional(),
  branchId: z.string().uuid().optional(),
  headId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { users: true, teams: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: { departments },
    });
  } catch (error) {
    logger.error("List departments error", { error, endpoint: "GET /api/departments" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createDepartmentSchema.parse(body);

    const existing = await prisma.department.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Department code already exists" },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data,
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: { department } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Create department error", { error, endpoint: "POST /api/departments" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
