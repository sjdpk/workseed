import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { logger } from "@/lib/logger";
import { syncDeviceToDb, syncAllLanDevices } from "@/lib/attendance/sync";

// Pull attendance from LAN-direct ZKTeco devices on demand.
// POST /api/attendance/sync            -> all active LAN devices
// POST /api/attendance/sync?deviceId=  -> one device
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const deviceId = new URL(request.url).searchParams.get("deviceId");

    if (deviceId) {
      const device = await prisma.attendanceDevice.findUnique({ where: { id: deviceId } });
      if (!device) {
        return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
      }
      if (device.syncMode !== "LAN_DIRECT") {
        return NextResponse.json(
          { success: false, error: "Device is cloud-agent mode; it pushes via the webhook" },
          { status: 400 }
        );
      }
      const result = await syncDeviceToDb(device);
      return NextResponse.json({ success: !result.error, data: result });
    }

    const results = await syncAllLanDevices();
    return NextResponse.json({ success: true, data: { devices: results.length, results } });
  } catch (error) {
    logger.error("Attendance sync error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
