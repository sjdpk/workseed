import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

const ALLOWED_ROLES = ["ADMIN", "HR"];

export async function DELETE(
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

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Delete device using raw query
    await prisma.$executeRaw`DELETE FROM attendance_devices WHERE id = ${id}::uuid`;

    return NextResponse.json({
      success: true,
      message: "Device deleted",
    });
  } catch (error) {
    console.error("Delete device error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
