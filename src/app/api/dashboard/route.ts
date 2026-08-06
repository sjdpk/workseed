import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { describeFiscalYear } from "@/lib/fiscal-year";
import { getCurrentFiscalYear, getFiscalYearConfig } from "@/lib/fiscal-year-server";
import { addZonedDays, dateOnlyToUtcDate, toDateOnly, todayInZone } from "@/lib/time";
import { getOrgTimeZone } from "@/lib/time-server";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isHROrAdmin = ["ADMIN", "HR"].includes(currentUser.role);
    const isManager = ["MANAGER", "TEAM_LEAD"].includes(currentUser.role);

    /* Every window below is anchored to the company timezone, so "this month" and
       "today" mean the same thing here as they do on the employee's screen. */
    const timeZone = await getOrgTimeZone();
    const running = await getCurrentFiscalYear();
    /* The dashboard can be read for any fiscal year, so a figure like "leave taken"
       always states which year it belongs to. Live widgets (today, this week) only
       apply to the running year and are omitted otherwise. */
    const requestedYear = Number(new URL(request.url).searchParams.get("year"));
    const fiscalYear =
      requestedYear && requestedYear !== running.year
        ? describeFiscalYear(requestedYear, await getFiscalYearConfig(), timeZone)
        : running;
    const isCurrentYear = fiscalYear.year === running.year;
    const yearRange = {
      gte: dateOnlyToUtcDate(toDateOnly(fiscalYear.start, timeZone)),
      lte: dateOnlyToUtcDate(toDateOnly(fiscalYear.end, timeZone)),
    };
    const today = new Date();
    const todayDateOnly = todayInZone(timeZone, today);
    const [tYear, tMonth] = todayDateOnly.split("-").map(Number);
    const startOfMonth = dateOnlyToUtcDate(`${tYear}-${String(tMonth).padStart(2, "0")}-01`);
    const todayAsDate = dateOnlyToUtcDate(todayDateOnly);

    // Basic stats for everyone
    const basicData: Record<string, unknown> = {};

    /* Birthdays and anniversaries come from DATE columns (UTC midnight), so the
       next occurrence is computed on the UTC calendar and compared against the
       company's today — never against locally-built dates. */
    const nextOccurrence = (stored: Date) => {
      const month = stored.getUTCMonth();
      const day = stored.getUTCDate();
      let next = new Date(Date.UTC(todayAsDate.getUTCFullYear(), month, day));
      if (next < todayAsDate)
        next = new Date(Date.UTC(todayAsDate.getUTCFullYear() + 1, month, day));
      return next;
    };
    const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

    const allUsers = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        joiningDate: true,
        department: { select: { name: true } },
      },
    });

    // Find upcoming birthdays (next 7 days)
    const upcomingBirthdays = allUsers
      .filter((u) => u.dateOfBirth)
      .map((u) => {
        const thisYearBday = nextOccurrence(u.dateOfBirth!);
        const daysUntil = daysBetween(todayAsDate, thisYearBday);
        return {
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          department: u.department?.name || "-",
          date: thisYearBday.toISOString(),
          daysUntil,
        };
      })
      .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    // Find upcoming work anniversaries (next 7 days)
    const upcomingAnniversaries = allUsers
      .filter((u) => u.joiningDate)
      .map((u) => {
        const thisYearAnniv = nextOccurrence(u.joiningDate!);
        const years = thisYearAnniv.getUTCFullYear() - u.joiningDate!.getUTCFullYear();
        const daysUntil = daysBetween(todayAsDate, thisYearAnniv);
        return {
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          department: u.department?.name || "-",
          years,
          date: thisYearAnniv.toISOString(),
          daysUntil,
        };
      })
      .filter((a) => a.daysUntil >= 0 && a.daysUntil <= 7 && a.years > 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    basicData.upcomingBirthdays = upcomingBirthdays;
    basicData.upcomingAnniversaries = upcomingAnniversaries;

    // Get upcoming holidays (next 30 days) — DATE column, so calendar-day bounds
    const thirtyDaysFromNow = dateOnlyToUtcDate(
      toDateOnly(addZonedDays(today, 30, timeZone), timeZone)
    );

    const upcomingHolidays = await prisma.holiday.findMany({
      where: {
        isActive: true,
        date: {
          gte: todayAsDate,
          lte: thirtyDaysFromNow,
        },
      },
      orderBy: { date: "asc" },
      take: 5,
    });

    basicData.upcomingHolidays = upcomingHolidays.map((h) => {
      const daysUntil = Math.round(
        (h.date.getTime() - todayAsDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: h.id,
        name: h.name,
        date: h.date.toISOString(),
        type: h.type,
        daysUntil,
      };
    });

    if (isHROrAdmin) {
      /* Headcount for the selected year, from the two dates the schema actually
         records: somebody counts if they had joined by the year's end and had not
         left before it. Rows with no joining date are counted — they predate the
         field rather than being future hires. For the running year the cut-off is
         today, so the figure still reads as "now". */
      const asAt = isCurrentYear ? todayAsDate : yearRange.lte;
      const employedInYear = {
        AND: [
          { OR: [{ joiningDate: null }, { joiningDate: { lte: asAt } }] },
          { OR: [{ lastWorkingDate: null }, { lastWorkingDate: { gte: yearRange.gte } }] },
        ],
      };

      const [
        totalEmployees,
        activeEmployees,
        joinedInYear,
        totalDepartments,
        totalTeams,
        pendingLeaves,
      ] = await Promise.all([
        prisma.user.count({ where: employedInYear }),
        prisma.user.count({ where: { ...employedInYear, status: "ACTIVE" } }),
        prisma.user.count({ where: { joiningDate: yearRange } }),
        // departments and teams that existed by then
        prisma.department.count({
          where: isCurrentYear ? { isActive: true } : { createdAt: { lte: fiscalYear.end } },
        }),
        prisma.team.count({
          where: isCurrentYear ? { isActive: true } : { createdAt: { lte: fiscalYear.end } },
        }),
        prisma.leaveRequest.count({
          where: { status: "PENDING", startDate: yearRange },
        }),
      ]);

      // Employees by department
      const departmentsInYear = await prisma.department.findMany({
        where: isCurrentYear ? { isActive: true } : { createdAt: { lte: fiscalYear.end } },
        select: { name: true, users: { where: employedInYear, select: { id: true } } },
        orderBy: { name: "asc" },
      });
      const employeesByDepartment = departmentsInYear.map((d) => ({
        name: d.name,
        _count: { users: d.users.length },
      }));

      // Employees by role
      const employeesByRole = await prisma.user.groupBy({
        by: ["role"],
        where: employedInYear,
        _count: { id: true },
      });

      // Leave requests by status, for the selected fiscal year
      const leavesByStatus = await prisma.leaveRequest.groupBy({
        by: ["status"],
        where: { startDate: yearRange },
        _count: { id: true },
      });

      /* Last 7 company-timezone days. The label and the queried day come from the
         same value, so they can no longer disagree by one. */
      const weeklyAttendance = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = isCurrentYear ? 6 : -1; i >= 0; i--) {
        const dayOnly = toDateOnly(addZonedDays(today, -i, timeZone), timeZone);
        const date = dateOnlyToUtcDate(dayOnly);
        const count = await prisma.attendance.count({ where: { date } });
        weeklyAttendance.push({ day: dayNames[date.getUTCDay()], date: dayOnly, count });
      }

      // Recent activity (last 5 leaves and hires)
      const recentLeaves = await prisma.leaveRequest.findMany({
        take: 5,
        where: { startDate: yearRange },
        orderBy: { startDate: "desc" },
        include: {
          user: { select: { firstName: true, lastName: true } },
          leaveType: { select: { name: true, color: true } },
        },
      });

      const recentHires = await prisma.user.findMany({
        take: 5,
        where: { joiningDate: yearRange },
        orderBy: { joiningDate: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          joiningDate: true,
          department: { select: { name: true } },
        },
      });

      /* "Present today" only means something in the running year; for a past year
         the honest equivalent is how many attendance days it holds. */
      const presentToday = isCurrentYear
        ? await prisma.attendance.count({ where: { date: todayAsDate } })
        : await prisma.attendance.count({ where: { date: yearRange } });

      basicData.stats = {
        totalEmployees,
        activeEmployees,
        totalDepartments,
        totalTeams,
        pendingLeaves,
        presentToday,
        presentTodayIsLive: isCurrentYear,
        joinedInYear,
      };

      basicData.employeesByDepartment = employeesByDepartment.map((d) => ({
        name: d.name,
        count: d._count.users,
      }));

      basicData.employeesByRole = employeesByRole.map((r) => ({
        name: r.role.replace("_", " "),
        count: r._count.id,
      }));

      basicData.leavesByStatus = leavesByStatus.map((l) => ({
        name: l.status,
        count: l._count.id,
      }));

      basicData.weeklyAttendance = weeklyAttendance;

      basicData.recentLeaves = recentLeaves.map((l) => ({
        id: l.id,
        user: `${l.user.firstName} ${l.user.lastName}`,
        type: l.leaveType.name,
        color: l.leaveType.color,
        status: l.status,
        days: l.days,
        createdAt: l.createdAt.toISOString(),
      }));

      basicData.recentHires = recentHires.map((h) => ({
        id: h.id,
        name: `${h.firstName} ${h.lastName}`,
        department: h.department?.name || "-",
        joiningDate: h.joiningDate?.toISOString() || null,
      }));
    } else if (isManager) {
      // Manager sees their team's data
      const pendingLeaves = await prisma.leaveRequest.count({
        where: { status: "PENDING", startDate: yearRange },
      });

      basicData.stats = {
        pendingLeaves,
      };
    } else {
      // Regular employee - basic info
      const userLeaves = await prisma.leaveRequest.findMany({
        where: { userId: currentUser.id, startDate: yearRange },
        orderBy: { startDate: "desc" },
        take: 5,
        include: {
          leaveType: { select: { name: true, color: true } },
        },
      });

      basicData.myRecentLeaves = userLeaves.map((l) => ({
        id: l.id,
        type: l.leaveType.name,
        color: l.leaveType.color,
        status: l.status,
        days: l.days,
        startDate: l.startDate.toISOString(),
      }));
    }

    /* The dashboard shows which year the company is currently counting in, so the
       widget does not have to fetch organization settings separately. */
    basicData.timezone = timeZone;
    basicData.isCurrentFiscalYear = isCurrentYear;
    basicData.today = todayDateOnly;
    basicData.fiscalYear = {
      year: fiscalYear.year,
      label: fiscalYear.label,
      start: fiscalYear.start,
      end: fiscalYear.end,
      resetsOn: fiscalYear.resetsOn,
    };

    return NextResponse.json({
      success: true,
      data: basicData,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
