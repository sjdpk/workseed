/**
 * Fiscal year maths — the single definition of "which year are we in".
 *
 * A company's leave year rarely starts on 1 January: Nepal runs Shrawan 1
 * (mid-July), India 1 April, some firms pick a fixed date like 14 August. So the
 * start is stored as a month **and** a day on organization settings, and every
 * year-keyed record (leave allocations, balances, reports) is stamped with the
 * fiscal year resolved here rather than with `getFullYear()`.
 *
 * A fiscal year is labelled by the calendar year it STARTS in. That keeps the
 * default (1 January) identical to the calendar year, so existing rows stay
 * correct when a company never changes the setting.
 *
 * Every boundary is resolved in the COMPANY timezone (see `src/lib/time.ts`), not
 * the timezone the server or the browser happens to run in — otherwise the answer
 * to "which year are we in" changes with where the app is deployed.
 *
 * Pure module — no database import, so client components can use it too.
 */
import { formatDateOnly, fromWallTime, toWallTime, UTC } from "./time";

export interface FiscalYearConfig {
  /** 1–12 */
  startMonth: number;
  /** 1–31, clamped to the length of the month */
  startDay: number;
}

export interface FiscalYear {
  /** Calendar year the fiscal year starts in — the key stored on records. */
  year: number;
  /** "2026" when the year starts 1 Jan, otherwise "2026/27". */
  label: string;
  /** First day, at 00:00 in the company timezone. */
  start: Date;
  /** Last moment of the year, in the company timezone. */
  end: Date;
  /** "14 Aug" — the day balances reset, for showing next to the label. */
  resetsOn: string;
}

export const DEFAULT_FISCAL_YEAR: FiscalYearConfig = { startMonth: 1, startDay: 1 };

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Days in a month, leap-year aware. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Keeps a stored config inside range, whatever a caller or old row contains. */
export function normalizeFiscalYearConfig(
  config?: Partial<FiscalYearConfig> | null
): FiscalYearConfig {
  const startMonth = Math.min(12, Math.max(1, Math.trunc(config?.startMonth || 1)));
  const startDay = Math.min(31, Math.max(1, Math.trunc(config?.startDay || 1)));
  return { startMonth, startDay };
}

/** Start date of the fiscal year labelled `year`, as the instant its first day
 *  begins in `timeZone`. A 31st start day falls back to the last day of a shorter
 *  month rather than rolling into the next one. */
export function fiscalYearStartDate(
  year: number,
  config: FiscalYearConfig,
  timeZone: string = UTC
): Date {
  const { startMonth, startDay } = normalizeFiscalYearConfig(config);
  const day = Math.min(startDay, daysInMonth(year, startMonth));
  return fromWallTime({ year, month: startMonth, day }, timeZone);
}

export function isCalendarYear(config: FiscalYearConfig): boolean {
  const { startMonth, startDay } = normalizeFiscalYearConfig(config);
  return startMonth === 1 && startDay === 1;
}

export function fiscalYearLabel(year: number, config: FiscalYearConfig): string {
  if (isCalendarYear(config)) return String(year);
  return `${year}/${String((year + 1) % 100).padStart(2, "0")}`;
}

/** The fiscal year labelled `year`, as a range. */
export function describeFiscalYear(
  year: number,
  config: FiscalYearConfig,
  timeZone: string = UTC
): FiscalYear {
  const start = fiscalYearStartDate(year, config, timeZone);
  const nextStart = fiscalYearStartDate(year + 1, config, timeZone);
  const end = new Date(nextStart.getTime() - 1);
  const { startMonth, startDay } = normalizeFiscalYearConfig(config);
  const resetDay = Math.min(startDay, daysInMonth(year, startMonth));
  return {
    year,
    label: fiscalYearLabel(year, config),
    start,
    end,
    resetsOn: formatDateOnly(
      `${year}-${String(startMonth).padStart(2, "0")}-${String(resetDay).padStart(2, "0")}`
    )
      .split(" ")
      .slice(0, 2)
      .join(" "),
  };
}

/** Which fiscal year a given date falls in, judged in `timeZone`. */
export function resolveFiscalYear(
  date: Date | string,
  config: FiscalYearConfig,
  timeZone: string = UTC
): FiscalYear {
  const d = typeof date === "string" ? new Date(date) : date;
  const calendarYear = toWallTime(d, timeZone).year;
  // before this calendar year's start date, the date still belongs to the year before
  const year =
    d.getTime() < fiscalYearStartDate(calendarYear, config, timeZone).getTime()
      ? calendarYear - 1
      : calendarYear;
  return describeFiscalYear(year, config, timeZone);
}

/** Fiscal year running on `now` (defaults to today). */
export function currentFiscalYear(
  config: FiscalYearConfig,
  now: Date = new Date(),
  timeZone: string = UTC
): FiscalYear {
  return resolveFiscalYear(now, config, timeZone);
}

/** How far through the fiscal year `now` is — for the settings summary. */
export function fiscalYearProgress(
  fy: FiscalYear,
  now: Date = new Date()
): { totalDays: number; dayNumber: number; daysRemaining: number; percent: number } {
  const day = 86_400_000;
  const totalDays = Math.round((fy.end.getTime() + 1 - fy.start.getTime()) / day);
  const elapsed = Math.floor((now.getTime() - fy.start.getTime()) / day);
  const dayNumber = Math.min(totalDays, Math.max(1, elapsed + 1));
  return {
    totalDays,
    dayNumber,
    daysRemaining: Math.max(0, totalDays - dayNumber),
    percent: Math.round((dayNumber / totalDays) * 100),
  };
}

/** Options for a year picker: `back` years before the current one, `forward` after. */
export function listFiscalYears(
  config: FiscalYearConfig,
  {
    back = 3,
    forward = 1,
    now = new Date(),
    timeZone = UTC,
  }: { back?: number; forward?: number; now?: Date; timeZone?: string } = {}
): FiscalYear[] {
  const current = currentFiscalYear(config, now, timeZone).year;
  const years: FiscalYear[] = [];
  for (let y = current + forward; y >= current - back; y--) {
    years.push(describeFiscalYear(y, config, timeZone));
  }
  return years;
}

/** "14 Aug 2026 – 13 Aug 2027", rendered in the company timezone. */
export function formatFiscalYearRange(
  fy: FiscalYear,
  timeZone: string = UTC,
  locale = "en-GB"
): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  });
  return `${fmt.format(fy.start)} – ${fmt.format(fy.end)}`;
}
