import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { syncDeviceToDb } from "@/lib/attendance/sync";
import { logger } from "@/lib/logger";
import { can } from "@/lib/rbac";

/**
 * Backfill: import ALL punches stored on a LAN-direct device, ignoring the
 * sync watermark, so historical logs land as attendance for employees who were
 * mapped/linked after the last sync. Safe to re-run — attendance is upserted
 * per user/day (earliest = check-in, latest = check-out). Advances the
 * watermark to the newest punch when done.
 *
 * POST /api/attendance/devices/:id/backfill
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await can(currentUser, "ATTENDANCE_MANAGE"))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const device = await prisma.attendanceDevice.findUnique({ where: { id } });
    if (!device) {
      return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
    }
    if (device.syncMode !== "LAN_DIRECT") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Backfill pulls from the device — only LAN-direct devices support it. Cloud-agent devices must re-push history to /api/attendance/ingest.",
        },
        { status: 400 }
      );
    }
    if (!device.ipAddress) {
      return NextResponse.json(
        { success: false, error: "This device has no IP address configured." },
        { status: 400 }
      );
    }

    const result = await syncDeviceToDb(device, { ignoreWatermark: true });
    return NextResponse.json({ success: !result.error, data: result });
  } catch (error) {
    logger.error("Device backfill error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
