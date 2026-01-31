import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

async function canUserCheckIn(userId: string, userDeptId?: string | null, userTeamId?: string | null) {
  const orgSettings = await prisma.organizationSettings.findFirst();
  const permissions = (orgSettings?.permissions as Record<string, unknown>) || {};
  const attendance = (permissions.onlineAttendance as Record<string, unknown>) || {};

  if (!attendance.enabled) return false;

  const scope = attendance.scope as string;
  if (scope === "all") return true;

  if (scope === "department" && userDeptId) {
    const deptIds = (attendance.departmentIds as string[]) || [];
    return deptIds.includes(userDeptId);
  }

  if (scope === "team" && userTeamId) {
    const teamIds = (attendance.teamIds as string[]) || [];
    return teamIds.includes(userTeamId);
  }

  if (scope === "specific") {
    const userIds = (attendance.userIds as string[]) || [];
    return userIds.includes(userId);
  }

  return false;
}

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission
    const canCheckOut = await canUserCheckIn(
      currentUser.id,
      currentUser.departmentId,
      currentUser.teamId
    );

    if (!canCheckOut) {
      return NextResponse.json(
        { success: false, error: "Online check-out is not enabled for you" },
        { status: 403 }
      );
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's record
    const existingRecord = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: currentUser.id,
          date: today,
        },
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: "Not checked in today" },
        { status: 400 }
      );
    }

    if (existingRecord.checkOut) {
      return NextResponse.json(
        { success: false, error: "Already checked out" },
        { status: 400 }
      );
    }

    const record = await prisma.attendance.update({
      where: { id: existingRecord.id },
      data: { checkOut: now },
    });

    return NextResponse.json({
      success: true,
      data: {
        record: {
          id: record.id,
          checkIn: record.checkIn.toISOString(),
          checkOut: record.checkOut?.toISOString() || null,
          date: record.date.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Check-out error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
