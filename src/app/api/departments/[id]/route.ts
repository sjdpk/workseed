import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { z } from "zod/v4";

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  branchId: z.string().uuid().nullable().optional(),
  headId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        head: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { users: true, teams: true } },
      },
    });

    if (!department) {
      return NextResponse.json(
        { success: false, error: "Department not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { department },
    });
  } catch (error) {
    console.error("Get department error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateDepartmentSchema.parse(body);

    // Check if code is unique (if changing)
    if (data.code) {
      const existing = await prisma.department.findFirst({
        where: {
          code: data.code,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Department code already exists" },
          { status: 400 }
        );
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true } },
        head: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { users: true, teams: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { department },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update department error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if department has users or teams
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, teams: true } },
      },
    });

    if (!department) {
      return NextResponse.json(
        { success: false, error: "Department not found" },
        { status: 404 }
      );
    }

    if (department._count.users > 0 || department._count.teams > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete department with users or teams. Remove them first or deactivate the department." },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete department error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
