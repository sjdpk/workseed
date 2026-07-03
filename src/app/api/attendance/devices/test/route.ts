import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { probeDevice } from "@/lib/attendance/readers";
import { logger } from "@/lib/logger";

const ALLOWED_ROLES = ["ADMIN", "HR"];

/**
 * Test connectivity to a LAN-direct attendance device without persisting
 * anything (no punches read, no watermark advanced).
 *
 * Body — one of:
 *   { "id": "<device uuid>" }                          // test a saved device
 *   { "ipAddress": "192.168.1.50", "port": 4370,       // ad-hoc test before saving
 *     "protocol": "zkteco" }
 *
 * Response: { success: <reachable>, data: { reachable, latencyMs, info?, error? } }
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    let host = typeof body.ipAddress === "string" ? body.ipAddress.trim() : "";
    let port = body.port != null ? Number(body.port) : 4370;
    let protocol = typeof body.protocol === "string" && body.protocol ? body.protocol : "zkteco";

    // Testing a saved device: pull its connection details from the DB.
    if (body.id) {
      const device = await prisma.attendanceDevice.findUnique({ where: { id: String(body.id) } });
      if (!device) {
        return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
      }
      if (device.syncMode === "CLOUD_AGENT") {
        return NextResponse.json(
          {
            success: false,
            error:
              "This is a cloud-agent device — it pushes punches to the API, so the server has nothing to connect to. Send a test batch to /api/attendance/ingest instead.",
          },
          { status: 400 }
        );
      }
      host = device.ipAddress ?? "";
      port = device.port ?? 4370;
      protocol = device.protocol || "zkteco";
    }

    if (!host) {
      return NextResponse.json(
        { success: false, error: "IP address is required to test the connection." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return NextResponse.json(
        { success: false, error: "Port must be a whole number between 1 and 65535." },
        { status: 400 }
      );
    }

    const result = await probeDevice({ host, port, protocol });
    return NextResponse.json({ success: result.reachable, data: result });
  } catch (error) {
    logger.error("Device connection test error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
