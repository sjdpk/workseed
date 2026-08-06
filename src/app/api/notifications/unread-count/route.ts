import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { dateOnlyToUtcDate, todayInZone } from "@/lib/time";
import { getOrgTimeZone } from "@/lib/time-server";
import { can } from "@/lib/rbac";

/** Days until the next occurrence of a DATE column's month/day, counted on the
 *  UTC calendar because that is how DATE values are stored. `0` means today. */
function daysUntilAnniversary(stored: Date, todayUtc: Date): number {
  const month = stored.getUTCMonth();
  const day = stored.getUTCDate();
  let next = new Date(Date.UTC(todayUtc.getUTCFullYear(), month, day));
  if (next < todayUtc) next = new Date(Date.UTC(todayUtc.getUTCFullYear() + 1, month, day));
  return Math.round((next.getTime() - todayUtc.getTime()) / 86_400_000);
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isHROrAbove = await can(currentUser, "USER_VIEW_ALL");
    const isManagerOrAbove = ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"].includes(currentUser.role);

    let count = 0;
    // birthdays and anniversaries are calendar facts, judged in the company's day
    const timeZone = await getOrgTimeZone();
    const today = dateOnlyToUtcDate(todayInZone(timeZone));

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
        const daysUntil = daysUntilAnniversary(u.dateOfBirth, today);
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
        // no anniversary in the first year
        if (u.joiningDate.getUTCFullYear() === today.getUTCFullYear()) return false;
        const daysUntil = daysUntilAnniversary(u.joiningDate, today);
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
