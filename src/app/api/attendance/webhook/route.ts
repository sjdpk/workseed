import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib";

/**
 * Webhook endpoint for external attendance devices (Biometric, RFID, etc.)
 *
 * Headers:
 *   X-API-Key: <device_api_key>
 *
 * Body:
 *   {
 *     "employeeId": "EMP001",
 *     "action": "IN" | "OUT",
 *     "timestamp": "2024-01-15T09:00:00Z",  // Optional
 *     "location": "Main Entrance"            // Optional
 *   }
 */

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-API-Key") || request.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Missing API key" }, { status: 401 });
    }

    // Validate API key - use raw query to avoid type issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devices: any[] = await prisma.$queryRaw`
      SELECT * FROM attendance_devices WHERE "apiKey" = ${apiKey} AND status = 'ACTIVE' LIMIT 1
    `;

    if (devices.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid API key" }, { status: 401 });
    }

    const device = devices[0];

    const body = await request.json();
    const { employeeId, action, timestamp, location } = body;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "Employee ID is required" },
        { status: 400 }
      );
    }

    if (!action || !["IN", "OUT"].includes(action.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: "Action must be 'IN' or 'OUT'" },
        { status: 400 }
      );
    }

    // Find employee by employeeId
    const user = await prisma.user.findUnique({
      where: { employeeId: employeeId.toUpperCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: `Employee not found: ${employeeId}` },
        { status: 404 }
      );
    }

    const now = timestamp ? new Date(timestamp) : new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Determine source based on device type
    const sourceMap: Record<string, string> = {
      BIOMETRIC: "BIOMETRIC",
      RFID: "RFID",
      FACE: "BIOMETRIC",
    };
    const source = sourceMap[device.type] || "OTHER";

    if (action.toUpperCase() === "IN") {
      // Check-in - check if already exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing: any[] = await prisma.$queryRaw`
        SELECT * FROM attendance WHERE "userId" = ${user.id}::uuid AND date = ${today}::date LIMIT 1
      `;

      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, error: "Already checked in today" },
          { status: 400 }
        );
      }

      // Create attendance record
      await prisma.$executeRaw`
        INSERT INTO attendance (id, "userId", date, "checkIn", source, "deviceId", location, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${user.id}::uuid, ${today}::date, ${now}, ${source}::"AttendanceSource", ${device.deviceId}, ${location || device.location}, NOW(), NOW())
      `;

      // Update device last sync
      await prisma.$executeRaw`
        UPDATE attendance_devices SET "lastSync" = ${now}, "updatedAt" = NOW() WHERE id = ${device.id}::uuid
      `;

      return NextResponse.json({
        success: true,
        message: "Check-in recorded",
        data: {
          employeeId: user.employeeId,
          name: `${user.firstName} ${user.lastName}`,
          action: "IN",
          time: now.toISOString(),
        },
      });
    } else {
      // Check-out
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing: any[] = await prisma.$queryRaw`
        SELECT * FROM attendance WHERE "userId" = ${user.id}::uuid AND date = ${today}::date LIMIT 1
      `;

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, error: "Not checked in today" },
          { status: 400 }
        );
      }

      if (existing[0].checkOut) {
        return NextResponse.json({ success: false, error: "Already checked out" }, { status: 400 });
      }

      // Update checkout
      await prisma.$executeRaw`
        UPDATE attendance SET "checkOut" = ${now}, "updatedAt" = NOW() WHERE id = ${existing[0].id}::uuid
      `;

      // Update device last sync
      await prisma.$executeRaw`
        UPDATE attendance_devices SET "lastSync" = ${now}, "updatedAt" = NOW() WHERE id = ${device.id}::uuid
      `;

      return NextResponse.json({
        success: true,
        message: "Check-out recorded",
        data: {
          employeeId: user.employeeId,
          name: `${user.firstName} ${user.lastName}`,
          action: "OUT",
          time: now.toISOString(),
        },
      });
    }
  } catch (error) {
    console.error("Attendance webhook error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// GET endpoint to test device connection
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-API-Key") || request.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Missing API key" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devices: any[] = await prisma.$queryRaw`
      SELECT * FROM attendance_devices WHERE "apiKey" = ${apiKey} AND status = 'ACTIVE' LIMIT 1
    `;

    if (devices.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid API key" }, { status: 401 });
    }

    const device = devices[0];

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      device: {
        name: device.name,
        type: device.type,
        deviceId: device.deviceId,
      },
    });
  } catch (error) {
    console.error("Device connection test error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
