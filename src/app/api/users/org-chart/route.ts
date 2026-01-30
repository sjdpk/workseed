import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      // Show all users regardless of status for org chart
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
        linkedIn: true,
        role: true,
        designation: true,
        managerId: true,
        department: {
          select: { id: true, name: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { role: "asc" },
        { firstName: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("Get org chart error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
