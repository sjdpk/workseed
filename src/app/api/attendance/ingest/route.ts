import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib";
import { logger } from "@/lib/logger";
import { applyPunches } from "@/lib/attendance/sync";
import type { Punch } from "@/lib/attendance/types";

/**
 * Batch ingest for the on-prem agent (cloud topology). The agent reads punches
 * from a device on the local network and POSTs them here; the server does the
 * day-aggregation and watermarking (same logic as the LAN-direct pull).
 *
 * Headers: X-API-Key: <device apiKey>
 * Body: { "punches": [{ "pin": "1001", "time": "2026-06-28T09:01:00Z", "state": 1 }] }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-API-Key") || request.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Missing API key" }, { status: 401 });
    }

    const device = await prisma.attendanceDevice.findFirst({
      where: { apiKey, status: "ACTIVE" },
    });
    if (!device) {
      return NextResponse.json({ success: false, error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    if (!Array.isArray(body?.punches)) {
      return NextResponse.json(
        { success: false, error: "punches array is required" },
        { status: 400 }
      );
    }

    const punches: Punch[] = body.punches
      .filter((p: unknown): p is { pin: unknown; time: unknown; state?: number } => !!p)
      .map((p: { pin: unknown; time: unknown; state?: number }) => ({
        pin: String(p.pin),
        time: new Date(p.time as string),
        state: p.state,
      }));

    const result = await applyPunches(device, punches);
    return NextResponse.json({ success: !result.error, data: result });
  } catch (error) {
    logger.error("Attendance ingest error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
