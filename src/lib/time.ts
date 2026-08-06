/**
 * Timezone maths — the single definition of "when".
 *
 * Rules this module exists to enforce:
 *
 *   1. Instants are stored in UTC. Nothing depends on the timezone of the Node
 *      process or of the visitor's browser.
 *   2. A company picks ONE timezone (`organization_settings.timezone`, an IANA
 *      name). Every day boundary — an attendance day, a report window, "today" —
 *      is resolved in that zone, and every displayed time is rendered in it.
 *   3. Date-only values (a holiday, a joining date, a leave day) are calendar
 *      facts, not instants. They live in Postgres `DATE` columns and are carried
 *      as `YYYY-MM-DD` strings or as UTC-midnight `Date`s, never as local
 *      midnight — local midnight is what shifts a date by a day.
 *
 * Pure module: no database import and no dependency, so client components can use
 * it too. The zone-aware arithmetic is done with `Intl.DateTimeFormat`, which
 * already ships the full IANA database in Node and every browser.
 */

/** Wall-clock components of an instant, as read in some timezone. */
export interface WallTime {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export const UTC = "UTC";

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** True if the runtime recognises this IANA zone name. */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Falls back to UTC rather than throwing — a bad stored value must not take the
 *  app down, and UTC is the one zone that is always defensible. */
export function normalizeTimeZone(timeZone?: string | null): string {
  const value = (timeZone || "").trim();
  return value && isValidTimeZone(value) ? value : UTC;
}

/** The wall-clock reading of `instant` in `timeZone`. */
export function toWallTime(instant: Date, timeZone: string): WallTime {
  const parts = partsFormatter(normalizeTimeZone(timeZone)).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    // Intl renders midnight as hour 24 in some locales even under h23
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
    millisecond: instant.getMilliseconds(),
  };
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (east positive). */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const wall = toWallTime(instant, timeZone);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
    wall.millisecond
  );
  return asUtc - instant.getTime();
}

/**
 * The instant at which `timeZone`'s clocks read the given wall time.
 *
 * Solved by iteration because the offset depends on the instant we are looking
 * for. Two passes settle every real zone, including the 45-minute offsets and
 * DST transitions; a wall time that a DST jump skips resolves to the instant the
 * clocks moved to, which is the conventional answer.
 */
export function fromWallTime(wall: Partial<WallTime>, timeZone: string): Date {
  const zone = normalizeTimeZone(timeZone);
  const utcGuess = Date.UTC(
    wall.year ?? 1970,
    (wall.month ?? 1) - 1,
    wall.day ?? 1,
    wall.hour ?? 0,
    wall.minute ?? 0,
    wall.second ?? 0,
    wall.millisecond ?? 0
  );
  let instant = new Date(utcGuess - zoneOffsetMs(new Date(utcGuess), zone));
  instant = new Date(utcGuess - zoneOffsetMs(instant, zone));
  return instant;
}

/** Midnight, in `timeZone`, of the day `instant` falls on. */
export function zonedDayStart(instant: Date, timeZone: string): Date {
  const { year, month, day } = toWallTime(instant, timeZone);
  return fromWallTime({ year, month, day }, timeZone);
}

/** `[start, end)` — midnight to the next midnight in `timeZone`. Exclusive upper
 *  bound, which is the shape Prisma range filters want (`gte` / `lt`). */
export function zonedDayRange(instant: Date, timeZone: string): { start: Date; end: Date } {
  const start = zonedDayStart(instant, timeZone);
  const { year, month, day } = toWallTime(instant, timeZone);
  const end = fromWallTime({ year, month, day: day + 1 }, timeZone);
  return { start, end };
}

/** `[start, end)` for a whole month in `timeZone`. `month` is 1-12. */
export function zonedMonthRange(
  year: number,
  month: number,
  timeZone: string
): { start: Date; end: Date } {
  return {
    start: fromWallTime({ year, month, day: 1 }, timeZone),
    end: fromWallTime({ year, month: month + 1, day: 1 }, timeZone),
  };
}

/** `n` days before/after `instant`, anchored to midnight in `timeZone`. */
export function addZonedDays(instant: Date, days: number, timeZone: string): Date {
  const { year, month, day } = toWallTime(instant, timeZone);
  return fromWallTime({ year, month, day: day + days }, timeZone);
}

/** Whole days from `a` to `b`, counted by calendar day in `timeZone` (so a
 *  23-hour DST day still counts as one). */
export function zonedDayDiff(a: Date, b: Date, timeZone: string): number {
  const startA = zonedDayStart(a, timeZone).getTime();
  const startB = zonedDayStart(b, timeZone).getTime();
  return Math.round((startB - startA) / 86_400_000);
}

/* ---------- date-only values ---------- */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" for the day `instant` falls on in `timeZone`. */
export function toDateOnly(instant: Date, timeZone: string): string {
  const { year, month, day } = toWallTime(instant, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Today's calendar date in `timeZone`, as "YYYY-MM-DD". */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  return toDateOnly(now, timeZone);
}

export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/**
 * "YYYY-MM-DD" → the `Date` to store in a Postgres `DATE` column.
 *
 * UTC midnight, deliberately: `DATE` carries no zone, and UTC midnight is the
 * only anchor that round-trips to the same calendar day everywhere. Building it
 * with `new Date("2026-08-14")` happens to agree, but `new Date(2026, 7, 14)`
 * does not — that is the bug this function exists to prevent.
 */
export function dateOnlyToUtcDate(value: string): Date {
  if (!isDateOnly(value)) throw new Error(`Expected YYYY-MM-DD, received "${value}"`);
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** A `DATE` column value back to "YYYY-MM-DD", read in UTC to match how it was
 *  written. Never use `toDateOnly` for these — that would apply a zone twice. */
export function utcDateToDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** The instant a date-only day starts in `timeZone` — for comparing a stored
 *  calendar date against real timestamps. */
export function dateOnlyToZonedStart(value: string, timeZone: string): Date {
  if (!isDateOnly(value)) throw new Error(`Expected YYYY-MM-DD, received "${value}"`);
  const [year, month, day] = value.split("-").map(Number);
  return fromWallTime({ year, month, day }, timeZone);
}

/* ---------- display ---------- */

const DATE_STYLE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const TIME_STYLE: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

/** Every user-facing date string should come through here, so one setting
 *  controls the whole product. */
export function formatInZone(
  value: Date | string | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = DATE_STYLE,
  locale = "en-GB"
): string {
  if (!value) return "-";
  const instant = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(instant.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: normalizeTimeZone(timeZone),
  }).format(instant);
}

export function formatTimeInZone(
  value: Date | string | null | undefined,
  timeZone: string,
  locale = "en-GB"
): string {
  return formatInZone(value, timeZone, TIME_STYLE, locale);
}

export function formatDateTimeInZone(
  value: Date | string | null | undefined,
  timeZone: string,
  locale = "en-GB"
): string {
  return formatInZone(value, timeZone, { ...DATE_STYLE, ...TIME_STYLE }, locale);
}

/** A date-only value formatted without any zone conversion. */
export function formatDateOnly(value: string | Date, locale = "en-GB"): string {
  const text = typeof value === "string" ? value : utcDateToDateOnly(value);
  if (!isDateOnly(text)) return "-";
  return new Intl.DateTimeFormat(locale, { ...DATE_STYLE, timeZone: UTC }).format(
    dateOnlyToUtcDate(text)
  );
}

/** "Asia/Kathmandu (UTC+05:45)" — for the timezone picker. */
export function describeTimeZone(timeZone: string, now: Date = new Date()): string {
  const zone = normalizeTimeZone(timeZone);
  const offset = zoneOffsetMs(now, zone);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  const hours = String(Math.floor(abs / 3_600_000)).padStart(2, "0");
  const minutes = String(Math.floor((abs % 3_600_000) / 60_000)).padStart(2, "0");
  return `${zone.replace(/_/g, " ")} (UTC${sign}${hours}:${minutes})`;
}

/** The zone this device is in — the sensible default for a first-time setup. */
export function deviceTimeZone(): string {
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return UTC;
  }
}

/** Every zone the runtime knows, for a settings dropdown. Falls back to a short
 *  list on runtimes without `supportedValuesOf`. */
export function listTimeZones(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;
  if (typeof supported === "function") return supported("timeZone");
  return [UTC, "Asia/Kathmandu", "Asia/Kolkata", "Europe/London", "America/New_York"];
}
