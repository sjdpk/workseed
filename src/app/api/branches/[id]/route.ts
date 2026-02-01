import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";

const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: { select: { departments: true, users: true } },
      },
    });

    if (!branch) {
      return NextResponse.json({ success: false, error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { branch },
    });
  } catch (error) {
    logger.error("Get branch error", { error, endpoint: "GET /api/branches/[id]" });
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
    const data = updateBranchSchema.parse(body);

    // Check if code is unique (if changing)
    if (data.code) {
      const existing = await prisma.branch.findFirst({
        where: {
          code: data.code,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Branch code already exists" },
          { status: 400 }
        );
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
      },
      include: {
        _count: { select: { departments: true, users: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { branch },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update branch error", { error, endpoint: "PATCH /api/branches/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Check if branch has departments or users
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: { select: { departments: true, users: true } },
      },
    });

    if (!branch) {
      return NextResponse.json({ success: false, error: "Branch not found" }, { status: 404 });
    }

    if (branch._count.departments > 0 || branch._count.users > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete branch with departments or users. Remove them first or deactivate the branch.",
        },
        { status: 400 }
      );
    }

    await prisma.branch.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    logger.error("Delete branch error", { error, endpoint: "DELETE /api/branches/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
