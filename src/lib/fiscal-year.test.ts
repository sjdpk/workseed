import { describe, expect, it } from "vitest";
import {
  currentFiscalYear,
  describeFiscalYear,
  fiscalYearLabel,
  fiscalYearProgress,
  fiscalYearStartDate,
  formatFiscalYearRange,
  isCalendarYear,
  listFiscalYears,
  normalizeFiscalYearConfig,
  resolveFiscalYear,
} from "./fiscal-year";

const KTM = "Asia/Kathmandu";
const CALENDAR = { startMonth: 1, startDay: 1 };
const AUG_14 = { startMonth: 8, startDay: 14 };
const FEB_31 = { startMonth: 2, startDay: 31 }; // a start day the month cannot hold

describe("config normalisation", () => {
  it("clamps out-of-range values instead of trusting the row", () => {
    expect(normalizeFiscalYearConfig({ startMonth: 0, startDay: 0 })).toEqual(CALENDAR);
    expect(normalizeFiscalYearConfig({ startMonth: 99, startDay: 99 })).toEqual({
      startMonth: 12,
      startDay: 31,
    });
    expect(normalizeFiscalYearConfig(null)).toEqual(CALENDAR);
  });
});

describe("labels", () => {
  it("uses a plain year only when the year really is the calendar year", () => {
    expect(isCalendarYear(CALENDAR)).toBe(true);
    expect(fiscalYearLabel(2026, CALENDAR)).toBe("2026");
    expect(fiscalYearLabel(2026, AUG_14)).toBe("2026/27");
    expect(fiscalYearLabel(2099, AUG_14)).toBe("2099/00");
  });

  it("states the reset date alongside the label", () => {
    expect(describeFiscalYear(2026, AUG_14, KTM).resetsOn).toBe("14 Aug");
    expect(describeFiscalYear(2026, CALENDAR, KTM).resetsOn).toBe("1 Jan");
  });
});

describe("boundaries", () => {
  it("starts at midnight in the company timezone", () => {
    expect(fiscalYearStartDate(2026, AUG_14, KTM).toISOString()).toBe("2026-08-13T18:15:00.000Z");
    expect(fiscalYearStartDate(2026, AUG_14, "UTC").toISOString()).toBe("2026-08-14T00:00:00.000Z");
  });

  it("falls back to the last day of a short month rather than rolling over", () => {
    // 31 February is not a date; 2026 is not a leap year, so the 28th
    expect(fiscalYearStartDate(2026, FEB_31, "UTC").toISOString()).toBe("2026-02-28T00:00:00.000Z");
    // and a leap year gets the 29th
    expect(fiscalYearStartDate(2028, FEB_31, "UTC").toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("ends the moment before the next year begins", () => {
    const fy = describeFiscalYear(2026, AUG_14, "UTC");
    expect(fy.start.toISOString()).toBe("2026-08-14T00:00:00.000Z");
    expect(fy.end.toISOString()).toBe("2027-08-13T23:59:59.999Z");
  });

  it("has no gap or overlap between consecutive years", () => {
    const a = describeFiscalYear(2026, AUG_14, KTM);
    const b = describeFiscalYear(2027, AUG_14, KTM);
    expect(b.start.getTime() - a.end.getTime()).toBe(1);
  });
});

describe("resolving a date to its fiscal year", () => {
  it("assigns dates before the start day to the previous year", () => {
    expect(resolveFiscalYear("2026-08-13T12:00:00Z", AUG_14, "UTC").year).toBe(2025);
    expect(resolveFiscalYear("2026-08-14T00:00:00Z", AUG_14, "UTC").year).toBe(2026);
    expect(resolveFiscalYear("2027-08-13T23:00:00Z", AUG_14, "UTC").year).toBe(2026);
  });

  it("judges the boundary in the company timezone, not UTC", () => {
    // 2026-08-13 19:00 UTC is already 00:45 on the 14th in Kathmandu
    const instant = new Date("2026-08-13T19:00:00Z");
    expect(resolveFiscalYear(instant, AUG_14, KTM).year).toBe(2026);
    expect(resolveFiscalYear(instant, AUG_14, "UTC").year).toBe(2025);
  });

  it("matches the calendar year when the company uses 1 January", () => {
    expect(resolveFiscalYear("2026-03-04T00:00:00Z", CALENDAR, "UTC").year).toBe(2026);
    expect(currentFiscalYear(CALENDAR, new Date("2026-12-31T23:00:00Z"), "UTC").year).toBe(2026);
  });
});

describe("progress and pickers", () => {
  it("reports the day number and days remaining", () => {
    const fy = describeFiscalYear(2026, AUG_14, "UTC");
    const first = fiscalYearProgress(fy, new Date("2026-08-14T10:00:00Z"));
    expect(first.dayNumber).toBe(1);
    expect(first.totalDays).toBe(365);
    expect(first.daysRemaining).toBe(364);

    const last = fiscalYearProgress(fy, new Date("2027-08-13T10:00:00Z"));
    expect(last.dayNumber).toBe(365);
    expect(last.daysRemaining).toBe(0);
    expect(last.percent).toBe(100);
  });

  it("never reports outside the year, even for a date beyond it", () => {
    const fy = describeFiscalYear(2026, AUG_14, "UTC");
    const beyond = fiscalYearProgress(fy, new Date("2030-01-01T00:00:00Z"));
    expect(beyond.dayNumber).toBeLessThanOrEqual(beyond.totalDays);
  });

  it("lists years newest first, around the running one", () => {
    const years = listFiscalYears(AUG_14, {
      back: 2,
      forward: 1,
      now: new Date("2026-09-01T00:00:00Z"),
      timeZone: "UTC",
    });
    expect(years.map((y) => y.year)).toEqual([2027, 2026, 2025, 2024]);
    expect(years[1].label).toBe("2026/27");
  });

  it("formats the range in the company timezone", () => {
    const fy = describeFiscalYear(2026, AUG_14, KTM);
    expect(formatFiscalYearRange(fy, KTM)).toBe("14 Aug 2026 – 13 Aug 2027");
  });
});
