import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

const ALLOWED_ROLES = ["ADMIN", "HR", "MANAGER"];

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

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

      // Get attendance today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const attendanceToday = await prisma.attendance.count({
        where: { date: todayStart },
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
      const month = parseInt(searchParams.get("month") || String(today.getMonth()));
      const year = parseInt(searchParams.get("year") || String(today.getFullYear()));

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

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
      const userAttendance: Record<string, {
        userId: string;
        name: string;
        employeeId: string;
        department: string;
        presentDays: number;
        totalHours: number;
      }> = {};

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
      const year = parseInt(searchParams.get("year") || String(today.getFullYear()));

      // Leave requests by status
      const byStatus = await prisma.leaveRequest.groupBy({
        by: ["status"],
        where: {
          startDate: { gte: startOfYear },
        },
        _count: { id: true },
        _sum: { days: true },
      });

      // Leave by type
      const byType = await prisma.leaveRequest.groupBy({
        by: ["leaveTypeId"],
        where: {
          startDate: { gte: startOfYear },
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
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
