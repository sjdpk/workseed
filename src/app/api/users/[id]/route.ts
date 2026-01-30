import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove, hashPassword } from "@/lib";
import { z } from "zod/v4";

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  branchId: z.string().uuid().optional().nullable(),
  password: z.string().min(8).optional(),
});

// GET - Get single user
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        branchId: true,
        branch: {
          select: { id: true, name: true },
        },
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Users can only view their own profile unless they're HR or above
    if (user.id !== currentUser.id && !isHROrAbove(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update user
export async function PATCH(
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
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    // Get the user to be updated
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const isSelf = currentUser.id === id;
    const isHRAdmin = isHROrAbove(currentUser.role);

    // Check permissions
    if (!isSelf && !isHRAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Self can only update: firstName, lastName, phone, password
    // HR/Admin can update: all fields
    // Only ADMIN can change role to ADMIN/HR or change status
    const updateData: Record<string, unknown> = {};

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.password) updateData.password = await hashPassword(data.password);

    // HR/Admin only fields
    if (isHRAdmin) {
      if (data.branchId !== undefined) updateData.branchId = data.branchId;

      // Only ADMIN can change roles
      if (data.role && currentUser.role === "ADMIN") {
        updateData.role = data.role;
      } else if (data.role && currentUser.role === "HR") {
        // HR can only assign MANAGER, TEAM_LEAD, EMPLOYEE
        if (!["ADMIN", "HR"].includes(data.role)) {
          updateData.role = data.role;
        }
      }

      // Only ADMIN can change status
      if (data.status && currentUser.role === "ADMIN") {
        updateData.status = data.status;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        branch: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
