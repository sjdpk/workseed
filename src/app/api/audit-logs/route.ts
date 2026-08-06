import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { can } from "@/lib/rbac";
import { isDateOnly, zonedDayRange } from "@/lib/time";
import { getOrgTimeZone } from "@/lib/time-server";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // one enforcement path: the role's own permissions
    if (!(await can(currentUser, "AUDIT_LOG_VIEW"))) {
      return NextResponse.json(
        { success: false, error: "Not authorized to view audit logs" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const entity = searchParams.get("entity");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (entity) {
      where.entity = entity;
    }
    if (action) {
      where.action = action;
    }
    if (userId) {
      where.userId = userId;
    }
    if (startDate || endDate) {
      /* Both bounds are company-timezone days. Previously the lower bound was UTC
         midnight and the upper bound server-local end-of-day, so the same filter
         covered a different span depending on where the app ran. */
      const timeZone = await getOrgTimeZone();
      where.createdAt = {};
      if (startDate && isDateOnly(startDate)) {
        (where.createdAt as Record<string, Date>).gte = zonedDayRange(
          new Date(`${startDate}T12:00:00Z`),
          timeZone
        ).start;
      }
      if (endDate && isDateOnly(endDate)) {
        // exclusive upper bound: everything before the next day begins
        (where.createdAt as Record<string, Date>).lt = zonedDayRange(
          new Date(`${endDate}T12:00:00Z`),
          timeZone
        ).end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get user details for the logs
    const userIds = [...new Set(logs.map((log) => log.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeId: true,
      },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    const logsWithUsers = logs.map((log) => ({
      ...log,
      user: usersMap.get(log.userId) || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: logsWithUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
