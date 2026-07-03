import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  prisma,
  getCurrentUser,
  isHROrAbove,
  hashPassword,
  createAuditLog,
  getRequestMeta,
} from "@/lib";
import { readDeviceUsers, supportsUserList } from "@/lib/attendance/readers";
import { logger } from "@/lib/logger";

const EMAIL_DOMAIN = "imported.local";

/**
 * Import enrolled device users as employees, with their enrollment PIN
 * pre-linked as deviceUserId so their punches sync automatically. Skips any
 * PIN already mapped to an existing employee (so re-running is safe — the
 * same-value guard: we never re-create a user whose PIN is already taken).
 *
 * POST /api/attendance/devices/:id/import-users
 * Body (optional): { "pins": ["1001", "1002"] }  // omit to import ALL unmapped
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
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
          error: "This is a cloud-agent device — the server can't reach it to read users.",
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
          error: `Reading users isn't supported for protocol "${device.protocol}" yet (ZK Protocol only).`,
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedPins: string[] | null = Array.isArray(body?.pins)
      ? body.pins.map((p: unknown) => String(p))
      : null;

    let deviceUsers;
    try {
      deviceUsers = await readDeviceUsers({
        host: device.ipAddress,
        port: device.port,
        protocol: device.protocol,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to read users from device";
      logger.error("Device user read failed (import)", { device: device.name, error });
      return NextResponse.json({ success: false, error }, { status: 502 });
    }

    // Candidate users: valid PIN, and (if pins given) in the requested set.
    const candidates = deviceUsers.filter(
      (u) => u.userId && (!requestedPins || requestedPins.includes(u.userId))
    );

    // Skip PINs already linked to an employee.
    const pins = candidates.map((u) => u.userId);
    const taken = new Set(
      (
        await prisma.user.findMany({
          where: { deviceUserId: { in: pins } },
          select: { deviceUserId: true },
        })
      ).map((u) => u.deviceUserId)
    );

    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    const created: { pin: string; employeeId: string; name: string }[] = [];
    const failures: { pin: string; error: string }[] = [];
    let skipped = 0;

    for (const u of candidates) {
      if (taken.has(u.userId)) {
        skipped++;
        continue;
      }
      try {
        const employeeId = await nextEmployeeId();
        const email = await uniqueEmail(u.userId);
        const password = await hashPassword(randomBytes(24).toString("hex"));
        const { firstName, lastName } = splitName(u.name, u.userId);

        const user = await prisma.user.create({
          data: {
            employeeId,
            deviceUserId: u.userId,
            email,
            password,
            firstName,
            lastName,
            role: "EMPLOYEE",
            status: "ACTIVE",
            employmentType: "FULL_TIME",
            createdBy: currentUser.id,
          },
          select: { id: true, employeeId: true },
        });

        await allocateDefaultLeaves(user.id);
        await createAuditLog({
          userId: currentUser.id,
          action: "CREATE",
          entity: "USER",
          entityId: user.id,
          details: {
            source: "device-import",
            deviceName: device.name,
            deviceUserId: u.userId,
            employeeId: user.employeeId,
          },
          ipAddress,
          userAgent,
        });

        // Guard against re-import within this same batch if a PIN repeats.
        taken.add(u.userId);
        created.push({ pin: u.userId, employeeId: user.employeeId, name: `${firstName} ${lastName}` });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed to create user";
        logger.error("Device user import failed", { pin: u.userId, error });
        failures.push({ pin: u.userId, error });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: created.length,
        skipped,
        failed: failures.length,
        createdUsers: created,
        failures,
      },
    });
  } catch (error) {
    logger.error("Import device users endpoint error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/** Split a device name into first/last, with sensible fallbacks. */
function splitName(name: string | undefined, pin: string): { firstName: string; lastName: string } {
  const raw = (name || "").trim();
  if (!raw) return { firstName: "Employee", lastName: pin };
  const parts = raw.split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || "-" };
}

/** Next free EMP##### id (mirrors POST /api/users, but collision-safe). */
async function nextEmployeeId(): Promise<string> {
  let n = (await prisma.user.count()) + 1;
  for (let i = 0; i < 10000; i++) {
    const id = `EMP${String(n).padStart(5, "0")}`;
    const exists = await prisma.user.findUnique({ where: { employeeId: id }, select: { id: true } });
    if (!exists) return id;
    n++;
  }
  throw new Error("Could not allocate a unique employee ID");
}

/** A unique placeholder email for a device-imported user (they have none). */
async function uniqueEmail(pin: string): Promise<string> {
  const base = `device-${pin}`.replace(/[^a-z0-9._-]/gi, "").toLowerCase() || "device-user";
  let candidate = `${base}@${EMAIL_DOMAIN}`;
  let i = 1;
  while (await prisma.user.findUnique({ where: { email: candidate }, select: { id: true } })) {
    candidate = `${base}-${i++}@${EMAIL_DOMAIN}`;
  }
  return candidate;
}

/** Allocate default leave balances, same as normal user creation. */
async function allocateDefaultLeaves(userId: string) {
  const leaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });
  const year = new Date().getFullYear();
  for (const lt of leaveTypes) {
    await prisma.leaveAllocation.create({
      data: { userId, leaveTypeId: lt.id, year, allocated: lt.defaultDays },
    });
  }
}
