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
    const canCheckIn = await canUserCheckIn(
      currentUser.id,
      currentUser.departmentId,
      currentUser.teamId
    );

    if (!canCheckIn) {
      return NextResponse.json(
        { success: false, error: "Online check-in is not enabled for you" },
        { status: 403 }
      );
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingRecord = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: currentUser.id,
          date: today,
        },
      },
    });

    if (existingRecord) {
      if (!existingRecord.checkOut) {
        return NextResponse.json(
          { success: false, error: "Already checked in" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Already completed attendance for today" },
        { status: 400 }
      );
    }

    const record = await prisma.attendance.create({
      data: {
        userId: currentUser.id,
        date: today,
        checkIn: now,
        source: "WEB",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        record: {
          id: record.id,
          checkIn: record.checkIn.toISOString(),
          checkOut: null,
          date: record.date.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
