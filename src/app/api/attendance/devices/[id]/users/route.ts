import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { readDeviceUsers, supportsUserList } from "@/lib/attendance/readers";
import { logger } from "@/lib/logger";
import { can } from "@/lib/rbac";

/**
 * List the enrolled users stored on a LAN-direct device (live, read-only).
 * Each entry is annotated with whether its enrollment PIN is already mapped to
 * an employee (User.deviceUserId), so HR can see who still needs linking.
 *
 * GET /api/attendance/devices/:id/users
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!(await can(currentUser, "ATTENDANCE_DEVICE_MANAGE"))) {
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
            "This is a cloud-agent device — the server can't reach it to read users. The on-prem agent owns that side.",
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
    if (!supportsUserList(device.protocol)) {
      return NextResponse.json(
        {
          success: false,
          error: `Listing users isn't supported for protocol "${device.protocol}" yet (ZK Protocol only).`,
        },
        { status: 400 }
      );
    }

    let users;
    try {
      users = await readDeviceUsers({
        host: device.ipAddress,
        port: device.port,
        protocol: device.protocol,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to read users from device";
      logger.error("Device user read failed", { device: device.name, error });
      return NextResponse.json({ success: false, error }, { status: 502 });
    }

    // Cross-reference the enrollment PINs against mapped employees in one query.
    const pins = users.map((u) => u.userId).filter(Boolean);
    const mapped = pins.length
      ? await prisma.user.findMany({
          where: { deviceUserId: { in: pins } },
          select: { deviceUserId: true, firstName: true, lastName: true, employeeId: true },
        })
      : [];
    const byPin = new Map(mapped.map((m) => [m.deviceUserId, m]));

    const data = users.map((u) => {
      const emp = byPin.get(u.userId);
      return {
        ...u,
        mapped: Boolean(emp),
        employee: emp
          ? { name: `${emp.firstName} ${emp.lastName}`, employeeId: emp.employeeId }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        total: data.length,
        mapped: data.filter((u) => u.mapped).length,
        users: data,
      },
    });
  } catch (error) {
    logger.error("Device users endpoint error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
