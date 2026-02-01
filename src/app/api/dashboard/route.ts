import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isHROrAdmin = ["ADMIN", "HR"].includes(currentUser.role);
    const isManager = ["MANAGER", "TEAM_LEAD"].includes(currentUser.role);

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Basic stats for everyone
    const basicData: Record<string, unknown> = {};

    // Get upcoming birthdays and work anniversaries (for all users)
    const now = new Date();
    const _currentMonth = now.getMonth() + 1;
    const _currentDay = now.getDate();

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
        const dob = new Date(u.dateOfBirth!);
        const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (thisYearBday < now) {
          thisYearBday.setFullYear(now.getFullYear() + 1);
        }
        const daysUntil = Math.ceil(
          (thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
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
        const jd = new Date(u.joiningDate!);
        const thisYearAnniv = new Date(now.getFullYear(), jd.getMonth(), jd.getDate());
        if (thisYearAnniv < now) {
          thisYearAnniv.setFullYear(now.getFullYear() + 1);
        }
        const years = thisYearAnniv.getFullYear() - jd.getFullYear();
        const daysUntil = Math.ceil(
          (thisYearAnniv.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
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

    // Get upcoming holidays (next 30 days)
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingHolidays = await prisma.holiday.findMany({
      where: {
        isActive: true,
        date: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      orderBy: { date: "asc" },
      take: 5,
    });

    basicData.upcomingHolidays = upcomingHolidays.map((h) => {
      const holidayDate = new Date(h.date);
      const daysUntil = Math.ceil((holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: h.id,
        name: h.name,
        date: h.date.toISOString(),
        type: h.type,
        daysUntil,
      };
    });

    if (isHROrAdmin) {
      // Get counts
      const [totalEmployees, activeEmployees, totalDepartments, totalTeams, pendingLeaves] =
        await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { status: "ACTIVE" } }),
          prisma.department.count({ where: { isActive: true } }),
          prisma.team.count({ where: { isActive: true } }),
          prisma.leaveRequest.count({ where: { status: "PENDING" } }),
        ]);

      // Employees by department
      const employeesByDepartment = await prisma.department.findMany({
        where: { isActive: true },
        select: {
          name: true,
          _count: { select: { users: true } },
        },
        orderBy: { name: "asc" },
      });

      // Employees by role
      const employeesByRole = await prisma.user.groupBy({
        by: ["role"],
        _count: { id: true },
      });

      // Leave requests by status this month
      const leavesByStatus = await prisma.leaveRequest.groupBy({
        by: ["status"],
        where: {
          createdAt: { gte: startOfMonth },
        },
        _count: { id: true },
      });

      // Get weekly attendance data (last 7 days)
      const weeklyAttendance = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const count = await prisma.attendance.count({
          where: {
            date: date,
          },
        });

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        weeklyAttendance.push({
          day: dayNames[date.getDay()],
          date: date.toISOString().split("T")[0],
          count,
        });
      }

      // Recent activity (last 5 leaves and hires)
      const recentLeaves = await prisma.leaveRequest.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { firstName: true, lastName: true } },
          leaveType: { select: { name: true, color: true } },
        },
      });

      const recentHires = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          joiningDate: true,
          department: { select: { name: true } },
        },
      });

      // Today's attendance
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const presentToday = await prisma.attendance.count({
        where: { date: todayStart },
      });

      basicData.stats = {
        totalEmployees,
        activeEmployees,
        totalDepartments,
        totalTeams,
        pendingLeaves,
        presentToday,
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
        where: { status: "PENDING" },
      });

      basicData.stats = {
        pendingLeaves,
      };
    } else {
      // Regular employee - basic info
      const userLeaves = await prisma.leaveRequest.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: "desc" },
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

    return NextResponse.json({
      success: true,
      data: basicData,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
