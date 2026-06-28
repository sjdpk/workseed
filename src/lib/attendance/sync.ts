// Device-agnostic attendance sync — turns punches into attendance records.
// Works with any device via the reader registry (./readers). Used by the sync
// API route, the scheduled worker, and the cloud-agent ingest endpoint.

import type { AttendanceDevice } from "@prisma/client";
import { logger } from "../logger";
import { prisma } from "../prisma";
import { readDevice } from "./readers";
import { sourceForType, type Punch, type SyncResult } from "./types";

export type { Punch, SyncResult } from "./types";

function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Apply a batch of punches to the database for a device. Shared by the
 * LAN-direct pull and the cloud-agent ingest endpoint. Aggregates per user per
 * day (earliest = check-in, latest = check-out) and only processes punches
 * newer than the device's lastSync watermark, which it then advances.
 */
export async function applyPunches(device: AttendanceDevice, punches: Punch[]): Promise<SyncResult> {
  const result: SyncResult = {
    device: device.name,
    punches: 0,
    matched: 0,
    unmatched: [],
    daysWritten: 0,
  };

  const since = device.lastSync ? new Date(device.lastSync) : null;
  const fresh = punches
    .filter((p) => !isNaN(p.time.getTime()) && (!since || p.time > since))
    .sort((a, b) => a.time.getTime() - b.time.getTime());
  result.punches = fresh.length;
  if (fresh.length === 0) return result;

  const source = sourceForType(device.type);
  const unmatched = new Set<string>();
  let maxTime = since ? since.getTime() : 0;

  // Resolve PIN -> user once per distinct PIN
  const userByPin = new Map<string, { id: string } | null>();
  for (const pin of new Set(fresh.map((p) => p.pin))) {
    userByPin.set(
      pin,
      await prisma.user.findFirst({ where: { deviceUserId: pin }, select: { id: true } })
    );
  }

  // Group fresh punches by user + day
  const groups = new Map<string, { userId: string; day: Date; times: Date[] }>();
  for (const p of fresh) {
    maxTime = Math.max(maxTime, p.time.getTime());
    const user = userByPin.get(p.pin);
    if (!user) {
      unmatched.add(p.pin);
      continue;
    }
    result.matched++;
    const day = dayStart(p.time);
    const key = `${user.id}_${day.toISOString()}`;
    const g = groups.get(key) ?? { userId: user.id, day, times: [] };
    g.times.push(p.time);
    groups.set(key, g);
  }

  // One attendance row per user/day, merged with any existing record
  for (const g of groups.values()) {
    const first = g.times[0];
    const last = g.times[g.times.length - 1];
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId: g.userId, date: g.day } },
    });

    if (!existing) {
      await prisma.attendance.create({
        data: {
          userId: g.userId,
          date: g.day,
          checkIn: first,
          checkOut: last > first ? last : null,
          source,
          deviceId: device.deviceId,
          location: device.location,
        },
      });
    } else {
      const checkIn = existing.checkIn < first ? existing.checkIn : first;
      const prevOut = existing.checkOut ? existing.checkOut.getTime() : 0;
      const checkOut = new Date(Math.max(prevOut, last.getTime()));
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkIn, checkOut: checkOut > checkIn ? checkOut : existing.checkOut },
      });
    }
    result.daysWritten++;
  }

  result.unmatched = [...unmatched];

  // Advance the watermark so the next run only sees newer punches
  await prisma.attendanceDevice.update({
    where: { id: device.id },
    data: { lastSync: new Date(maxTime) },
  });

  return result;
}

/** LAN-direct: connect to the device, read punches, write attendance. */
export async function syncDeviceToDb(device: AttendanceDevice): Promise<SyncResult> {
  const empty: SyncResult = { device: device.name, punches: 0, matched: 0, unmatched: [], daysWritten: 0 };
  if (!device.ipAddress) {
    return { ...empty, error: "No IP address configured" };
  }
  let punches: Punch[];
  try {
    punches = await readDevice({ host: device.ipAddress, port: device.port, protocol: device.protocol });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Failed to read device";
    logger.error("Device read failed", { device: device.name, error });
    return { ...empty, error };
  }
  return applyPunches(device, punches);
}

/** Sync every active LAN-direct device. */
export async function syncAllLanDevices(): Promise<SyncResult[]> {
  const devices = await prisma.attendanceDevice.findMany({
    where: { status: "ACTIVE", syncMode: "LAN_DIRECT", ipAddress: { not: null } },
  });
  const results: SyncResult[] = [];
  for (const device of devices) {
    results.push(await syncDeviceToDb(device));
  }
  return results;
}
