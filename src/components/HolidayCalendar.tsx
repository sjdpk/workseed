"use client";

import { useMemo, useState } from "react";
import { useOrgSettings } from "./OrgSettingsProvider";
import { Badge } from "./Badge";
import { daysInMonth, MONTH_NAMES } from "@/lib/fiscal-year";
import { dateOnlyToUtcDate, todayInZone, utcDateToDateOnly } from "@/lib/time";

export interface CalendarHoliday {
  id: string;
  name: string;
  /** ISO date or "YYYY-MM-DD"; only the calendar day matters. */
  date: string;
  type: "PUBLIC" | "OPTIONAL" | "RESTRICTED";
  description?: string | null;
}

const TYPE_TONE = {
  PUBLIC: "success",
  OPTIONAL: "info",
  RESTRICTED: "warning",
} as const;

/**
 * Month grid for the holiday calendar.
 *
 * A list answers "what are the holidays"; a calendar answers "when is the next
 * one, and what does that week look like" — which is the question people actually
 * have. Clicking an empty day starts a holiday on that date, so adding one no
 * longer means typing a date by hand.
 */
export function HolidayCalendar({
  holidays,
  /** First month to show — the company year's start month. */
  startMonth,
  startYear,
  /** Months to render, so a fiscal year that spans a boundary still reads in order. */
  months = 12,
  onPickDate,
  canManage,
}: {
  holidays: CalendarHoliday[];
  startMonth: number;
  startYear: number;
  months?: number;
  onPickDate?: (dateOnly: string) => void;
  canManage?: boolean;
}) {
  const { timezone } = useOrgSettings();
  const today = todayInZone(timezone);
  const [offset, setOffset] = useState(() => {
    // open on the month containing today when it falls inside the range
    const [ty, tm] = today.split("-").map(Number);
    const diff = (ty - startYear) * 12 + (tm - startMonth);
    return diff >= 0 && diff < months ? diff : 0;
  });

  const month = ((startMonth - 1 + offset) % 12) + 1;
  const year = startYear + Math.floor((startMonth - 1 + offset) / 12);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarHoliday[]>();
    for (const h of holidays) {
      const key = h.date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), h]);
    }
    return map;
  }, [holidays]);

  const total = daysInMonth(year, month);
  // Monday-first, which is how a work week reads
  const firstWeekday =
    (dateOnlyToUtcDate(`${year}-${String(month).padStart(2, "0")}-01`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: total }, (_, i) => {
      return `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    }),
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            disabled={offset === 0}
            className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
            aria-label="Previous month"
          >
            ←
          </button>
          <p className="min-w-[9rem] text-center text-sm font-semibold text-gray-900 dark:text-white">
            {MONTH_NAMES[month - 1]} {year}
          </p>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(months - 1, o + 1))}
            disabled={offset === months - 1}
            className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
            aria-label="Next month"
          >
            →
          </button>
        </div>
        {canManage && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Click a day to add a holiday</p>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-gray-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateOnly, i) => {
          if (!dateOnly) return <div key={`pad-${i}`} />;
          const dayHolidays = byDate.get(dateOnly) ?? [];
          const isToday = dateOnly === today;
          const weekend = [5, 6].includes((dateOnlyToUtcDate(dateOnly).getUTCDay() + 6) % 7);
          return (
            <button
              key={dateOnly}
              type="button"
              disabled={!canManage}
              onClick={() => onPickDate?.(dateOnly)}
              className={`min-h-[68px] rounded border p-1.5 text-left align-top transition-colors ${
                dayHolidays.length
                  ? "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
                  : weekend
                    ? "border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900"
                    : "border-gray-100 dark:border-gray-800"
              } ${canManage ? "hover:border-gray-400 dark:hover:border-gray-500" : "cursor-default"}`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-gray-900 font-semibold text-white dark:bg-white dark:text-gray-900"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {Number(dateOnly.slice(-2))}
              </span>
              <span className="mt-1 block space-y-0.5">
                {dayHolidays.map((h) => (
                  <span
                    key={h.id}
                    className="block truncate text-[11px] font-medium text-gray-900 dark:text-white"
                    title={h.name}
                  >
                    {h.name}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "Dashain in 12 days" — the thing everyone actually scans for. */
export function NextHoliday({ holidays }: { holidays: CalendarHoliday[] }) {
  const { timezone } = useOrgSettings();
  const today = todayInZone(timezone);
  const upcoming = holidays
    .map((h) => ({ ...h, day: h.date.slice(0, 10) }))
    .filter((h) => h.day >= today)
    .sort((a, b) => a.day.localeCompare(b.day))[0];

  if (!upcoming) return null;

  const days = Math.round(
    (dateOnlyToUtcDate(upcoming.day).getTime() - dateOnlyToUtcDate(today).getTime()) / 86_400_000
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-gray-900 dark:text-white">{upcoming.name}</span>
      <Badge tone={TYPE_TONE[upcoming.type] ?? "neutral"}>
        {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
      </Badge>
      <span className="text-gray-500 dark:text-gray-400">
        {utcDateToDateOnly(dateOnlyToUtcDate(upcoming.day))}
      </span>
    </div>
  );
}
