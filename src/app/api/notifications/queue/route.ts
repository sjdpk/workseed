import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  processQueue,
  getEmailStats,
  getPendingCount,
  testEmailConfiguration,
  isSmtpConfigured,
} from "@/lib/notifications";

// GET /api/notifications/queue - Get queue status
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_LOG_VIEW")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const [stats, pendingCount] = await Promise.all([
      getEmailStats(),
      getPendingCount(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        smtpConfigured: isSmtpConfigured(),
        pendingCount,
        stats,
      },
    });
  } catch (error) {
    logger.error("Get queue status error", { error });
    return NextResponse.json({ success: false, error: "Failed to get queue status" }, { status: 500 });
  }
}

// POST /api/notifications/queue - Process queue or test email
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_QUEUE_MANAGE")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "process";

    // Test email configuration
    if (action === "test") {
      const body = await request.json();
      const testEmail = body.email;

      if (!testEmail) {
        return NextResponse.json(
          { success: false, error: "Test email address is required" },
          { status: 400 }
        );
      }

      const result = await testEmailConfiguration(testEmail);

      return NextResponse.json({
        success: result.success,
        data: { message: result.message },
      });
    }

    // Process queue
    if (action === "process") {
      const batchSize = parseInt(searchParams.get("batchSize") || "50");

      const result = await processQueue(batchSize);

      logger.info("Queue processed via API", { result, userId: user.id });

      return NextResponse.json({
        success: true,
        data: {
          processed: result.processed,
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Queue action error", { error });
    return NextResponse.json({ success: false, error: "Failed to process queue" }, { status: 500 });
  }
}
