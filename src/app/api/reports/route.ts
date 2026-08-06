import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { describeFiscalYear } from "@/lib/fiscal-year";
import { getCurrentFiscalYear, getFiscalYearConfig } from "@/lib/fiscal-year-server";
import { addZonedDays, dateOnlyToUtcDate, toDateOnly, todayInZone } from "@/lib/time";
import { can } from "@/lib/rbac";
import { getOrgTimeZone } from "@/lib/time-server";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!(await can(currentUser, "REPORT_VIEW"))) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";

    /* Reports count in the company's own year and timezone: a yearly figure that
       silently used January–December while leave balances reset in August was the
       kind of mismatch nobody notices until an audit. */
    const timeZone = await getOrgTimeZone();
    const config = await getFiscalYearConfig();
    const today = new Date();
    const todayDateOnly = todayInZone(timeZone, today);
    const [tYear, tMonth] = todayDateOnly.split("-").map(Number);
    const startOfMonth = dateOnlyToUtcDate(`${tYear}-${String(tMonth).padStart(2, "0")}-01`);
    const runningFiscalYear = await getCurrentFiscalYear();

    if (type === "overview") {
      // Get counts
      const [
        totalEmployees,
        activeEmployees,
        totalDepartments,
        totalTeams,
        pendingLeaves,
        approvedLeavesThisMonth,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.department.count({ where: { isActive: true } }),
        prisma.team.count({ where: { isActive: true } }),
        prisma.leaveRequest.count({ where: { status: "PENDING" } }),
        prisma.leaveRequest.count({
          where: {
            status: "APPROVED",
            startDate: { gte: startOfMonth },
          },
        }),
      ]);

      // Get employees by role
      const employeesByRole = await prisma.user.groupBy({
        by: ["role"],
        _count: { id: true },
      });

      // Get employees by department
      const employeesByDepartment = await prisma.department.findMany({
        where: { isActive: true },
        select: {
          name: true,
          _count: { select: { users: true } },
        },
      });

      // Get employees by employment type
      const employeesByType = await prisma.user.groupBy({
        by: ["employmentType"],
        _count: { id: true },
      });

      // Get recent hires (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentHires = await prisma.user.count({
        where: {
          joiningDate: { gte: thirtyDaysAgo },
        },
      });

      // Get attendance today, in the company's day
      const attendanceToday = await prisma.attendance.count({
        where: { date: dateOnlyToUtcDate(todayDateOnly) },
      });

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalEmployees,
            activeEmployees,
            inactiveEmployees: totalEmployees - activeEmployees,
            totalDepartments,
            totalTeams,
            pendingLeaves,
            approvedLeavesThisMonth,
            recentHires,
            presentToday: attendanceToday,
          },
          employeesByRole: employeesByRole.map((r) => ({
            role: r.role,
            count: r._count.id,
          })),
          employeesByDepartment: employeesByDepartment.map((d) => ({
            department: d.name,
            count: d._count.users,
          })),
          employeesByType: employeesByType.map((t) => ({
            type: t.employmentType,
            count: t._count.id,
          })),
        },
      });
    }

    if (type === "attendance") {
      // `month` stays 0-based in the query string for backwards compatibility
      const month = parseInt(searchParams.get("month") || String(tMonth - 1)) + 1;
      const year = parseInt(searchParams.get("year") || String(tYear));

      const startDate = dateOnlyToUtcDate(`${year}-${String(month).padStart(2, "0")}-01`);
      const endDate = dateOnlyToUtcDate(
        toDateOnly(
          addZonedDays(
            dateOnlyToUtcDate(
              month === 12
                ? `${year + 1}-01-01`
                : `${year}-${String(month + 1).padStart(2, "0")}-01`
            ),
            -1,
            "UTC"
          ),
          "UTC"
        )
      );

      // Get attendance records for the month
      const records = await prisma.attendance.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
              department: { select: { name: true } },
            },
          },
        },
      });

      // Group by user
      const userAttendance: Record<
        string,
        {
          userId: string;
          name: string;
          employeeId: string;
          department: string;
          presentDays: number;
          totalHours: number;
        }
      > = {};

      records.forEach((r) => {
        if (!userAttendance[r.userId]) {
          userAttendance[r.userId] = {
            userId: r.userId,
            name: `${r.user.firstName} ${r.user.lastName}`,
            employeeId: r.user.employeeId,
            department: r.user.department?.name || "-",
            presentDays: 0,
            totalHours: 0,
          };
        }
        userAttendance[r.userId].presentDays++;
        if (r.checkOut) {
          const hours = (r.checkOut.getTime() - r.checkIn.getTime()) / (1000 * 60 * 60);
          userAttendance[r.userId].totalHours += hours;
        }
      });

      // Get by source
      const bySource = await prisma.attendance.groupBy({
        by: ["source"],
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { id: true },
      });

      return NextResponse.json({
        success: true,
        data: {
          month,
          year,
          totalRecords: records.length,
          userAttendance: Object.values(userAttendance),
          bySource: bySource.map((s) => ({
            source: s.source,
            count: s._count.id,
          })),
        },
      });
    }

    if (type === "leave") {
      const year = parseInt(searchParams.get("year") || String(runningFiscalYear.year));
      const fiscalYear = describeFiscalYear(year, config, timeZone);
      const startOfYear = dateOnlyToUtcDate(toDateOnly(fiscalYear.start, timeZone));
      const endOfYear = dateOnlyToUtcDate(toDateOnly(fiscalYear.end, timeZone));

      // Leave requests by status
      const byStatus = await prisma.leaveRequest.groupBy({
        by: ["status"],
        where: {
          startDate: { gte: startOfYear, lte: endOfYear },
        },
        _count: { id: true },
        _sum: { days: true },
      });

      // Leave by type
      const byType = await prisma.leaveRequest.groupBy({
        by: ["leaveTypeId"],
        where: {
          startDate: { gte: startOfYear, lte: endOfYear },
          status: "APPROVED",
        },
        _count: { id: true },
        _sum: { days: true },
      });

      const leaveTypes = await prisma.leaveType.findMany({
        select: { id: true, name: true, color: true },
      });

      const leaveTypeMap = Object.fromEntries(leaveTypes.map((lt) => [lt.id, lt]));

      return NextResponse.json({
        success: true,
        data: {
          year,
          byStatus: byStatus.map((s) => ({
            status: s.status,
            count: s._count.id,
            days: s._sum.days || 0,
          })),
          byType: byType.map((t) => ({
            leaveType: leaveTypeMap[t.leaveTypeId]?.name || "Unknown",
            color: leaveTypeMap[t.leaveTypeId]?.color || "#3B82F6",
            count: t._count.id,
            days: t._sum.days || 0,
          })),
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invalid report type",
    });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
