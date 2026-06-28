import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

const ALLOWED_ROLES = ["ADMIN", "HR"];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) {
      updateData.type = Array.isArray(body.type) ? body.type : body.type ? [body.type] : [];
    }
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.ipAddress !== undefined) updateData.ipAddress = body.ipAddress || null;
    if (body.port !== undefined) updateData.port = body.port ? Number(body.port) : 4370;
    if (body.protocol !== undefined) updateData.protocol = body.protocol || "zkteco";
    if (body.syncMode !== undefined) {
      updateData.syncMode = body.syncMode === "CLOUD_AGENT" ? "CLOUD_AGENT" : "LAN_DIRECT";
    }

    const device = await prisma.attendanceDevice.update({ where: { id }, data: updateData });

    return NextResponse.json({
      success: true,
      data: {
        device: {
          id: device.id,
          name: device.name,
          type: device.type,
          deviceId: device.deviceId,
          location: device.location,
          status: device.status,
          syncMode: device.syncMode,
          protocol: device.protocol,
          ipAddress: device.ipAddress,
          port: device.port,
          lastSync: device.lastSync?.toISOString() || null,
        },
      },
    });
  } catch (error) {
    console.error("Update device error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Delete device using raw query
    await prisma.$executeRaw`DELETE FROM attendance_devices WHERE id = ${id}::uuid`;

    return NextResponse.json({
      success: true,
      message: "Device deleted",
    });
  } catch (error) {
    console.error("Delete device error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
