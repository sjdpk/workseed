import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { readDevice } from "@/lib/attendance/readers";
import { logger } from "@/lib/logger";

const ALLOWED_ROLES = ["ADMIN", "HR"];
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

/**
 * List raw punch logs stored on a LAN-direct device (live, read-only — nothing
 * is persisted and the sync watermark is not touched). Most recent first,
 * capped to `limit`. Each punch is annotated with the matched employee, if any.
 *
 * GET /api/attendance/devices/:id/logs?limit=200
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const device = await prisma.attendanceDevice.findUnique({ where: { id } });
    if (!device) {
      return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
    }
    if (device.syncMode === "CLOUD_AGENT") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This is a cloud-agent device — the server can't reach it to read logs. The on-prem agent pushes punches to /api/attendance/ingest.",
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

    const limitParam = Number(new URL(request.url).searchParams.get("limit"));
    const limit =
      Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;

    let punches;
    try {
      punches = await readDevice({
        host: device.ipAddress,
        port: device.port,
        protocol: device.protocol,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to read logs from device";
      logger.error("Device log read failed", { device: device.name, error });
      return NextResponse.json({ success: false, error }, { status: 502 });
    }

    const totalOnDevice = punches.length;
    // Most recent first, then cap for display.
    const recent = punches
      .filter((p) => !isNaN(p.time.getTime()))
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, limit);

    // Annotate matched employees in one query.
    const pins = [...new Set(recent.map((p) => p.pin).filter(Boolean))];
    const mapped = pins.length
      ? await prisma.user.findMany({
          where: { deviceUserId: { in: pins } },
          select: { deviceUserId: true, firstName: true, lastName: true, employeeId: true },
        })
      : [];
    const byPin = new Map(mapped.map((m) => [m.deviceUserId, m]));

    const logs = recent.map((p) => {
      const emp = byPin.get(p.pin);
      return {
        pin: p.pin,
        time: p.time.toISOString(),
        state: p.state ?? null,
        employee: emp
          ? { name: `${emp.firstName} ${emp.lastName}`, employeeId: emp.employeeId }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalOnDevice,
        returned: logs.length,
        limit,
        logs,
      },
    });
  } catch (error) {
    logger.error("Device logs endpoint error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
