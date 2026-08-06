/** The company timezone, read from organization settings. Server-only. */
import { prisma } from "./prisma";
import {
  normalizeTimeZone,
  todayInZone,
  UTC,
  zonedDayRange,
  zonedDayStart,
  type WallTime,
} from "./time";

/**
 * Falls back to UTC when settings are missing or the database is unreachable —
 * a day boundary must never be computed against the server's incidental
 * timezone, which is what makes "today" move when the app is redeployed.
 */
export async function getOrgTimeZone(): Promise<string> {
  try {
    const settings = await prisma.organizationSettings.findFirst({
      select: { timezone: true },
    });
    return normalizeTimeZone(settings?.timezone);
  } catch {
    return UTC;
  }
}

/** Today's calendar date in the company timezone, as "YYYY-MM-DD". */
export async function getOrgToday(now: Date = new Date()): Promise<string> {
  return todayInZone(await getOrgTimeZone(), now);
}

/** Midnight of `instant`'s day, in the company timezone. */
export async function getOrgDayStart(instant: Date = new Date()): Promise<Date> {
  return zonedDayStart(instant, await getOrgTimeZone());
}

/** `[start, end)` for `instant`'s day in the company timezone. */
export async function getOrgDayRange(
  instant: Date = new Date()
): Promise<{ start: Date; end: Date }> {
  return zonedDayRange(instant, await getOrgTimeZone());
}

export type { WallTime };
