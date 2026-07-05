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
          select: { id: true, deviceUserId: true, firstName: true, lastName: true, employeeId: true },
        })
      : [];
    const byPin = new Map(mapped.map((m) => [m.deviceUserId, m]));

    // Determine which punches are already synced into attendance. A punch is
    // "synced" when its matched employee has an attendance row for the punch's
    // day (attendance is unique per [userId, date]). Fetch all relevant rows in
    // one query, keyed by `${userId}|${YYYY-MM-DD}`.
    const dayKey = (userId: string, time: Date) =>
      `${userId}|${time.toISOString().slice(0, 10)}`;

    const matchedUserIds = [...new Set(mapped.map((m) => m.id))];
    const syncedKeys = new Set<string>();
    if (matchedUserIds.length) {
      const times = recent
        .filter((p) => byPin.has(p.pin))
        .map((p) => p.time.getTime());
      const minDate = new Date(Math.min(...times));
      const maxDate = new Date(Math.max(...times));
      minDate.setHours(0, 0, 0, 0);
      maxDate.setHours(23, 59, 59, 999);
      const existing = await prisma.attendance.findMany({
        where: { userId: { in: matchedUserIds }, date: { gte: minDate, lte: maxDate } },
        select: { userId: true, date: true },
      });
      for (const a of existing) syncedKeys.add(dayKey(a.userId, a.date));
    }

    const logs = recent.map((p) => {
      const emp = byPin.get(p.pin);
      return {
        pin: p.pin,
        time: p.time.toISOString(),
        state: p.state ?? null,
        employee: emp
          ? { name: `${emp.firstName} ${emp.lastName}`, employeeId: emp.employeeId }
          : null,
        // true = already in attendance, false = mapped but not yet imported,
        // null = no matching employee (can't be synced until the PIN is linked).
        synced: emp ? syncedKeys.has(dayKey(emp.id, p.time)) : null,
      };
    });

    const unsynced = logs.filter((l) => l.synced === false).length;

    return NextResponse.json({
      success: true,
      data: {
        totalOnDevice,
        returned: logs.length,
        unsynced,
        limit,
        logs,
      },
    });
  } catch (error) {
    logger.error("Device logs endpoint error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
