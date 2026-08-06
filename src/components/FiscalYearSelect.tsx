"use client";

import { Combobox } from "./Combobox";
import { useOrgSettings } from "./OrgSettingsProvider";

/**
 * The one year picker. It replaces four divergent implementations that offered
 * three different ranges — a hardcoded `[2023…2026]`, a window that slid every
 * time you changed it, and a calendar ±2 that ignored the company's fiscal year.
 *
 * Options are always newest-first and labelled the way the rest of the product
 * names a year ("2026/27 (current)"), so the same year reads the same everywhere.
 */
export function FiscalYearSelect({
  value,
  onChange,
  label,
  back = 3,
  /** Future years are hidden by default: there is nothing recorded in them yet,
   *  so offering one only invites a report that reads as empty. Pass
   *  `forward={1}` where planning ahead genuinely applies. */
  forward = 0,
  /** Nothing before this year is offered — e.g. the year an employee joined. */
  earliestYear,
  /** Sizes the whole control; a toolbar wants something narrow. */
  wrapperClassName,
  id = "fiscalYear",
  size = "md",
}: {
  value: number;
  onChange: (year: number) => void;
  label?: string;
  back?: number;
  forward?: number;
  earliestYear?: number;
  wrapperClassName?: string;
  id?: string;
  /** `sm` lines the picker up with a `<Button size="sm">` in a page header. */
  size?: "sm" | "md";
}) {
  const { fiscalYear, fiscalYears, fiscalYearOf } = useOrgSettings();

  const years = fiscalYears({ back, forward }).filter(
    (fy) => earliestYear === undefined || fy.year >= earliestYear
  );

  // the joining year, or a year loaded from a saved record, may sit outside the window
  if (earliestYear !== undefined && !years.some((fy) => fy.year === earliestYear)) {
    years.push(fiscalYearOf(earliestYear));
  }
  if (!years.some((fy) => fy.year === value)) {
    years.push(fiscalYearOf(value));
  }
  years.sort((a, b) => b.year - a.year);

  const options = years.map((fy) => ({
    value: String(fy.year),
    label:
      fy.year === fiscalYear.year
        ? `${fy.label} (current)`
        : fy.year === earliestYear
          ? `${fy.label} (joined)`
          : fy.label,
    // typing "2024" or "current" finds the year
    keywords: `${fy.year} ${fy.year + 1} ${fy.year === fiscalYear.year ? "current this" : ""}`,
  }));

  return (
    /* Combobox rather than a native <select>: the OS dropdown ignores the app's
       styling (and its dark theme), and the same control is already used for the
       timezone picker — one dropdown, one behaviour. */
    <Combobox
      id={id}
      label={label}
      options={options}
      value={String(value)}
      placeholder="Find a year…"
      className={wrapperClassName}
      size={size}
      onChange={(next) => onChange(parseInt(next, 10))}
    />
  );
}
