import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, createAuditLog, getRequestMeta } from "@/lib";
import { logger } from "@/lib/logger";
import { can } from "@/lib/rbac";

/**
 * Link an EXISTING employee to a device enrollment PIN by setting their
 * deviceUserId. Prevents duplicates when the person is already in the system
 * and only later gets enrolled on the device.
 *
 * POST /api/attendance/link-user
 * Body: { "userId": "<uuid>", "deviceUserId": "1005" }
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await can(currentUser, "ATTENDANCE_MANAGE"))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : "";
    const deviceUserId = body.deviceUserId != null ? String(body.deviceUserId).trim() : "";

    if (!userId || !deviceUserId) {
      return NextResponse.json(
        { success: false, error: "userId and deviceUserId are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, employeeId: true, deviceUserId: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    // Same-value guard — already linked to this exact PIN: no write needed.
    if (user.deviceUserId === deviceUserId) {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            employeeId: user.employeeId,
            deviceUserId,
          },
        },
      });
    }

    // Don't silently steal a PIN from another employee, or overwrite a different
    // PIN already on this employee — make the caller resolve it explicitly.
    if (user.deviceUserId && user.deviceUserId !== deviceUserId) {
      return NextResponse.json(
        {
          success: false,
          error: `This employee is already linked to PIN ${user.deviceUserId}. Change it on their profile first.`,
        },
        { status: 400 }
      );
    }

    const pinOwner = await prisma.user.findFirst({
      where: { deviceUserId, NOT: { id: userId } },
      select: { firstName: true, lastName: true, employeeId: true },
    });
    if (pinOwner) {
      return NextResponse.json(
        {
          success: false,
          error: `PIN ${deviceUserId} is already linked to ${pinOwner.firstName} ${pinOwner.lastName} (${pinOwner.employeeId}).`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { deviceUserId },
      select: { id: true, firstName: true, lastName: true, employeeId: true, deviceUserId: true },
    });

    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: currentUser.id,
      action: "UPDATE",
      entity: "USER",
      entityId: updated.id,
      details: { source: "device-link", deviceUserId, employeeId: updated.employeeId },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: updated.id,
          name: `${updated.firstName} ${updated.lastName}`,
          employeeId: updated.employeeId,
          deviceUserId: updated.deviceUserId,
        },
      },
    });
  } catch (error) {
    logger.error("Link user endpoint error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
