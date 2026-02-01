import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const records = await prisma.attendance.findMany({
      where: { userId: currentUser.id },
      orderBy: { date: "desc" },
      take: 30,
    });

    return NextResponse.json({
      success: true,
      data: {
        records: records.map((record) => ({
          id: record.id,
          checkIn: record.checkIn.toISOString(),
          checkOut: record.checkOut?.toISOString() || null,
          date: record.date.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Get attendance history error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
