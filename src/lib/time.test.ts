import { describe, expect, it } from "vitest";
import {
  addZonedDays,
  dateOnlyToUtcDate,
  dateOnlyToZonedStart,
  describeTimeZone,
  formatDateOnly,
  formatDateTimeInZone,
  fromWallTime,
  isDateOnly,
  isValidTimeZone,
  normalizeTimeZone,
  todayInZone,
  toDateOnly,
  toWallTime,
  utcDateToDateOnly,
  zonedDayDiff,
  zonedDayRange,
  zonedDayStart,
  zonedMonthRange,
  zoneOffsetMs,
} from "./time";

const KTM = "Asia/Kathmandu"; // UTC+05:45, no DST — the 45-minute offset catches sloppy maths
const LONDON = "Europe/London"; // DST
const DENVER = "America/Denver"; // west of UTC, where toISOString() day-shifts

describe("timezone validation", () => {
  it("accepts IANA names and rejects nonsense", () => {
    expect(isValidTimeZone(KTM)).toBe(true);
    expect(isValidTimeZone("Nowhere/Fake")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("falls back to UTC rather than throwing", () => {
    expect(normalizeTimeZone("Nowhere/Fake")).toBe("UTC");
    expect(normalizeTimeZone(null)).toBe("UTC");
    expect(normalizeTimeZone(KTM)).toBe(KTM);
  });
});

describe("wall time and offsets", () => {
  it("reads the wall clock in a 45-minute zone", () => {
    // 18:15 UTC is 00:00 the next day in Kathmandu
    const wall = toWallTime(new Date("2026-08-13T18:15:00.000Z"), KTM);
    expect(wall).toMatchObject({ year: 2026, month: 8, day: 14, hour: 0, minute: 0 });
  });

  it("reports the offset", () => {
    expect(zoneOffsetMs(new Date("2026-08-14T00:00:00Z"), KTM)).toBe(5 * 3_600_000 + 45 * 60_000);
    expect(zoneOffsetMs(new Date("2026-01-15T00:00:00Z"), LONDON)).toBe(0);
    expect(zoneOffsetMs(new Date("2026-07-15T00:00:00Z"), LONDON)).toBe(3_600_000); // BST
  });

  it("round-trips wall time to an instant", () => {
    const instant = fromWallTime({ year: 2026, month: 8, day: 14 }, KTM);
    expect(instant.toISOString()).toBe("2026-08-13T18:15:00.000Z");
    expect(toDateOnly(instant, KTM)).toBe("2026-08-14");
  });
});

describe("day boundaries", () => {
  it("puts 23:50 and 00:10 local on different days", () => {
    // 2026-08-14 23:50 and 2026-08-15 00:10 in Kathmandu
    const before = fromWallTime({ year: 2026, month: 8, day: 14, hour: 23, minute: 50 }, KTM);
    const after = fromWallTime({ year: 2026, month: 8, day: 15, hour: 0, minute: 10 }, KTM);
    expect(toDateOnly(before, KTM)).toBe("2026-08-14");
    expect(toDateOnly(after, KTM)).toBe("2026-08-15");
    expect(zonedDayStart(before, KTM).getTime()).not.toBe(zonedDayStart(after, KTM).getTime());
  });

  it("groups both punches on the same UTC day, which is exactly the old bug", () => {
    const before = fromWallTime({ year: 2026, month: 8, day: 14, hour: 23, minute: 50 }, KTM);
    const after = fromWallTime({ year: 2026, month: 8, day: 15, hour: 0, minute: 10 }, KTM);
    // both are 2026-08-14 in UTC — bucketing by toISOString() merges two work days
    expect(before.toISOString().slice(0, 10)).toBe("2026-08-14");
    expect(after.toISOString().slice(0, 10)).toBe("2026-08-14");
    // and resolving in the company zone separates them again
    expect(toDateOnly(after, KTM)).not.toBe(after.toISOString().slice(0, 10));
  });

  it("returns an exclusive day range", () => {
    const { start, end } = zonedDayRange(new Date("2026-08-14T06:00:00Z"), KTM);
    expect(start.toISOString()).toBe("2026-08-13T18:15:00.000Z");
    expect(end.toISOString()).toBe("2026-08-14T18:15:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
  });

  it("keeps a DST day a single day", () => {
    // clocks go forward 29 March 2026 in London: the day is 23 hours long
    const { start, end } = zonedDayRange(new Date("2026-03-29T12:00:00Z"), LONDON);
    expect(end.getTime() - start.getTime()).toBe(23 * 3_600_000);
    expect(zonedDayDiff(start, end, LONDON)).toBe(1);
  });

  it("counts calendar days across a DST boundary", () => {
    const a = fromWallTime({ year: 2026, month: 3, day: 28 }, LONDON);
    const b = fromWallTime({ year: 2026, month: 3, day: 31 }, LONDON);
    expect(zonedDayDiff(a, b, LONDON)).toBe(3);
  });

  it("adds days by calendar, not by 24-hour blocks", () => {
    const start = fromWallTime({ year: 2026, month: 3, day: 28 }, LONDON);
    const next = addZonedDays(start, 1, LONDON);
    expect(toDateOnly(next, LONDON)).toBe("2026-03-29");
  });

  it("ranges a whole month", () => {
    const { start, end } = zonedMonthRange(2026, 2, KTM);
    expect(toDateOnly(start, KTM)).toBe("2026-02-01");
    expect(toDateOnly(new Date(end.getTime() - 1), KTM)).toBe("2026-02-28");
  });

  it("resolves today in the configured zone, not the process zone", () => {
    // 19:30 UTC on the 14th is already the 15th in Kathmandu and still the 14th in Denver
    const now = new Date("2026-08-14T19:30:00Z");
    expect(todayInZone(KTM, now)).toBe("2026-08-15");
    expect(todayInZone(DENVER, now)).toBe("2026-08-14");
    expect(todayInZone("UTC", now)).toBe("2026-08-14");
  });
});

describe("date-only values", () => {
  it("validates the format", () => {
    expect(isDateOnly("2026-08-14")).toBe(true);
    expect(isDateOnly("2026-02-30")).toBe(false);
    expect(isDateOnly("2026-8-4")).toBe(false);
    expect(isDateOnly("2026-08-14T00:00:00Z")).toBe(false);
  });

  it("stores as UTC midnight so the calendar day survives any server zone", () => {
    const stored = dateOnlyToUtcDate("2026-08-14");
    expect(stored.toISOString()).toBe("2026-08-14T00:00:00.000Z");
    expect(utcDateToDateOnly(stored)).toBe("2026-08-14");
  });

  it("rejects a value that is not a calendar date", () => {
    expect(() => dateOnlyToUtcDate("14/08/2026")).toThrow();
  });

  it("can anchor a stored date to the company day for timestamp comparisons", () => {
    expect(dateOnlyToZonedStart("2026-08-14", KTM).toISOString()).toBe("2026-08-13T18:15:00.000Z");
  });

  it("formats without shifting the day", () => {
    expect(formatDateOnly("2026-08-14")).toBe("14 Aug 2026");
    expect(formatDateOnly(dateOnlyToUtcDate("2026-01-01"))).toBe("1 Jan 2026");
  });
});

describe("display", () => {
  it("renders an instant in the company zone", () => {
    const instant = new Date("2026-08-13T18:20:00Z");
    expect(formatDateTimeInZone(instant, KTM)).toBe("14 Aug 2026, 00:05");
    expect(formatDateTimeInZone(instant, "UTC")).toBe("13 Aug 2026, 18:20");
  });

  it("degrades gracefully", () => {
    expect(formatDateTimeInZone(null, KTM)).toBe("-");
    expect(formatDateTimeInZone("not a date", KTM)).toBe("-");
  });

  it("describes a zone with its offset", () => {
    expect(describeTimeZone(KTM, new Date("2026-08-14T00:00:00Z"))).toBe(
      "Asia/Kathmandu (UTC+05:45)"
    );
    expect(describeTimeZone(DENVER, new Date("2026-01-14T00:00:00Z"))).toBe(
      "America/Denver (UTC-07:00)"
    );
  });
});
