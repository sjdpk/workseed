import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { dateOnlyToUtcDate } from "@/lib/time";
import { getOrgToday } from "@/lib/time-server";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const today = dateOnlyToUtcDate(await getOrgToday());

    const todayRecord = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: currentUser.id,
          date: today,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isCheckedIn: todayRecord ? !todayRecord.checkOut : false,
        todayRecord: todayRecord
          ? {
              id: todayRecord.id,
              checkIn: todayRecord.checkIn.toISOString(),
              checkOut: todayRecord.checkOut?.toISOString() || null,
              date: todayRecord.date.toISOString(),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get attendance status error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
