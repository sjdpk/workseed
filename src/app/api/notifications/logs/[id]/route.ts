import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { retryEmail, getEmailLog } from "@/lib/notifications";

// GET /api/notifications/logs/[id] - Get a specific email log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_LOG_VIEW")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const log = await getEmailLog(id);

    if (!log) {
      return NextResponse.json({ success: false, error: "Email log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { log } });
  } catch (error) {
    logger.error("Get email log error", { error });
    return NextResponse.json({ success: false, error: "Failed to fetch email log" }, { status: 500 });
  }
}

// POST /api/notifications/logs/[id] - Retry a failed email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_QUEUE_MANAGE")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const success = await retryEmail(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to retry email. It may not exist or is not in FAILED status." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "Email queued for retry" },
    });
  } catch (error) {
    logger.error("Retry email error", { error });
    return NextResponse.json({ success: false, error: "Failed to retry email" }, { status: 500 });
  }
}
