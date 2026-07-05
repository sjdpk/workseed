import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

const ALLOWED_ROLES = ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"];

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    // Date range: `from`/`to` (inclusive). Falls back to the legacy single
    // `date` param, and finally to today, so old callers keep working.
    const fromParam = searchParams.get("from") ?? searchParams.get("date");
    const toParam = searchParams.get("to") ?? searchParams.get("date");
    const departmentId = searchParams.get("departmentId");
    const teamId = searchParams.get("teamId");
    const source = searchParams.get("source");
    const deviceId = searchParams.get("deviceId");

    const fromDate = fromParam ? new Date(fromParam) : new Date();
    fromDate.setHours(0, 0, 0, 0);
    const toDate = toParam ? new Date(toParam) : new Date();
    toDate.setHours(0, 0, 0, 0);
    const isRange = fromDate.getTime() !== toDate.getTime();

    // Build where clause based on role and filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { date: { gte: fromDate, lte: toDate } };

    // Role-based filtering
    if (currentUser.role === "MANAGER" && currentUser.departmentId) {
      where.user = { departmentId: currentUser.departmentId };
    } else if (currentUser.role === "TEAM_LEAD" && currentUser.teamId) {
      where.user = { teamId: currentUser.teamId };
    }

    // Additional filters
    if (departmentId && (currentUser.role === "ADMIN" || currentUser.role === "HR")) {
      where.user = { ...where.user, departmentId };
    }
    if (teamId) {
      where.user = { ...where.user, teamId };
    }
    if (source) {
      where.source = source;
    }
    // Filter by the device serial that produced the punch (attendance.deviceId
    // stores the device serial, e.g. "BIO-001").
    if (deviceId) {
      where.deviceId = deviceId;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { name: true } },
            team: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { checkIn: "desc" }],
    });

    // Get total employees count for the filtered scope
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employeeWhere: any = { status: "ACTIVE" };
    if (currentUser.role === "MANAGER" && currentUser.departmentId) {
      employeeWhere.departmentId = currentUser.departmentId;
    } else if (currentUser.role === "TEAM_LEAD" && currentUser.teamId) {
      employeeWhere.teamId = currentUser.teamId;
    } else if (departmentId) {
      employeeWhere.departmentId = departmentId;
    } else if (teamId) {
      employeeWhere.teamId = teamId;
    }

    const totalEmployees = await prisma.user.count({ where: employeeWhere });

    return NextResponse.json({
      success: true,
      data: {
        records: records.map((r) => ({
          id: r.id,
          userId: r.userId,
          userName: `${r.user.firstName} ${r.user.lastName}`,
          employeeId: r.user.employeeId,
          department: r.user.department?.name || null,
          team: r.user.team?.name || null,
          date: r.date.toISOString(),
          checkIn: r.checkIn.toISOString(),
          checkOut: r.checkOut?.toISOString() || null,
          source: r.source,
          deviceId: r.deviceId,
          location: r.location,
        })),
        summary: {
          total: totalEmployees,
          // Distinct employees seen in the range (a user may punch on several
          // days). For a single day this equals records.length.
          present: new Set(records.map((r) => r.userId)).size,
          absent: totalEmployees - new Set(records.map((r) => r.userId)).size,
        },
        isRange,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get attendance records error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
