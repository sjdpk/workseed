import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { getEmailLogs, getEmailStats } from "@/lib/notifications";
import type { EmailStatus } from "@prisma/client";

// GET /api/notifications/logs - List email logs with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_LOG_VIEW")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") as EmailStatus | null;
    const type = searchParams.get("type");
    const recipientEmail = searchParams.get("recipientEmail");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Check if stats are requested
    if (searchParams.get("stats") === "true") {
      const stats = await getEmailStats();
      return NextResponse.json({ success: true, data: { stats } });
    }

    const result = await getEmailLogs({
      page,
      limit,
      status: status || undefined,
      type: type || undefined,
      recipientEmail: recipientEmail || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    logger.error("Get email logs error", { error });
    return NextResponse.json({ success: false, error: "Failed to fetch email logs" }, { status: 500 });
  }
}
