import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isHROrAbove = ["ADMIN", "HR"].includes(currentUser.role);
    const isManagerOrAbove = ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"].includes(currentUser.role);

    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Pending leave requests (for managers and above)
    if (isManagerOrAbove) {
      const pendingLeaves = await prisma.leaveRequest.count({
        where: {
          status: "PENDING",
        },
      });
      count += pendingLeaves;
    }

    // 2. Upcoming birthdays (next 7 days)
    if (isHROrAbove) {
      const users = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          dateOfBirth: { not: null },
        },
        select: { dateOfBirth: true },
      });

      const upcomingBirthdays = users.filter((u) => {
        if (!u.dateOfBirth) return false;
        const dob = new Date(u.dateOfBirth);
        const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (thisYearBday < today) {
          thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
        }
        const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 7;
      });
      count += upcomingBirthdays.length;

      // 3. Upcoming work anniversaries (next 7 days)
      const usersWithJoining = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          joiningDate: { not: null },
        },
        select: { joiningDate: true },
      });

      const upcomingAnniversaries = usersWithJoining.filter((u) => {
        if (!u.joiningDate) return false;
        const joinDate = new Date(u.joiningDate);
        if (joinDate.getFullYear() === today.getFullYear()) return false; // No anniversary in first year
        const thisYearAnniv = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate());
        if (thisYearAnniv < today) {
          thisYearAnniv.setFullYear(thisYearAnniv.getFullYear() + 1);
        }
        const daysUntil = Math.ceil((thisYearAnniv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 7;
      });
      count += upcomingAnniversaries.length;
    }

    return NextResponse.json({
      success: true,
      data: { count },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
