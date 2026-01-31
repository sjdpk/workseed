import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { randomBytes } from "crypto";

const ALLOWED_ROLES = ["ADMIN", "HR"];

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const devices = await prisma.attendanceDevice.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        devices: devices.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          deviceId: d.deviceId,
          location: d.location,
          status: d.status,
          lastSync: d.lastSync?.toISOString() || null,
        })),
      },
    });
  } catch (error) {
    console.error("Get devices error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, deviceId, location } = body;

    if (!name || !type || !deviceId) {
      return NextResponse.json(
        { success: false, error: "Name, type, and device ID are required" },
        { status: 400 }
      );
    }

    // Check if device already exists
    const existing = await prisma.attendanceDevice.findUnique({
      where: { deviceId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Device with this ID already exists" },
        { status: 400 }
      );
    }

    // Generate API key for device
    const apiKey = randomBytes(32).toString("hex");

    const device = await prisma.attendanceDevice.create({
      data: {
        name,
        type,
        deviceId,
        location: location || null,
        apiKey,
      },
    });

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
          apiKey: device.apiKey, // Return once for setup
        },
      },
    });
  } catch (error) {
    console.error("Create device error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
