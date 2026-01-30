import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check permissions from organization settings
    const orgSettings = await prisma.organizationSettings.findFirst();
    const permissions = (orgSettings?.permissions as Record<string, unknown>) || {};
    const roleAccess = (permissions.roleAccess as Record<string, string[]>) || {};
    const auditLogsAccess = roleAccess.auditLogs || ["ADMIN"];

    if (!auditLogsAccess.includes(currentUser.role)) {
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
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate + "T23:59:59");
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
    const userIds = [...new Set(logs.map((log:any) => log.userId))];
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

    const usersMap = new Map(users.map((u:any) => [u.id, u]));

    const logsWithUsers = logs.map((log:any) => ({
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
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
