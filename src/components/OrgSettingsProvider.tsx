"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  currentFiscalYear,
  describeFiscalYear,
  listFiscalYears,
  type FiscalYear,
  type FiscalYearConfig,
} from "@/lib/fiscal-year";
import { formatDateTimeInZone, formatInZone, formatTimeInZone, todayInZone, UTC } from "@/lib/time";

/**
 * Company-wide display settings — the timezone and the fiscal year — fetched once
 * and shared, so every screen formats dates the same way and agrees on which year
 * the company is counting in.
 *
 * Before this, ~24 pages called `toLocaleDateString()` with the visitor's own
 * timezone and a dozen of them had their own private `formatDate` helper.
 */
interface OrgSettingsValue {
  timezone: string;
  fiscalConfig: FiscalYearConfig;
  /** The fiscal year running now. */
  fiscalYear: FiscalYear;
  /** Today's calendar date in the company timezone, as "YYYY-MM-DD". */
  today: string;
  loading: boolean;
  /** "14 Aug 2026" */
  formatDate: (value: Date | string | null | undefined) => string;
  /** "00:05" */
  formatTime: (value: Date | string | null | undefined) => string;
  /** "14 Aug 2026, 00:05" */
  formatDateTime: (value: Date | string | null | undefined) => string;
  /** Newest-first fiscal years for a picker. */
  fiscalYears: (opts?: { back?: number; forward?: number }) => FiscalYear[];
  /** A specific fiscal year by its key. */
  fiscalYearOf: (year: number) => FiscalYear;
}

const FALLBACK_CONFIG: FiscalYearConfig = { startMonth: 1, startDay: 1 };

const OrgSettingsContext = createContext<OrgSettingsValue | null>(null);

export function OrgSettingsProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezone] = useState(UTC);
  const [fiscalConfig, setFiscalConfig] = useState<FiscalYearConfig>(FALLBACK_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.success) return;
        const settings = data.data.settings;
        setTimezone(settings.timezone || UTC);
        setFiscalConfig({
          startMonth: settings.fiscalYearStart || 1,
          startDay: settings.fiscalYearStartDay || 1,
        });
      })
      .catch(() => {
        /* keep the UTC fallback — a failed settings fetch must not blank the UI */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<OrgSettingsValue>(
    () => ({
      timezone,
      fiscalConfig,
      fiscalYear: currentFiscalYear(fiscalConfig, new Date(), timezone),
      today: todayInZone(timezone),
      loading,
      formatDate: (v) => formatInZone(v, timezone),
      formatTime: (v) => formatTimeInZone(v, timezone),
      formatDateTime: (v) => formatDateTimeInZone(v, timezone),
      fiscalYears: (opts) => listFiscalYears(fiscalConfig, { ...opts, timeZone: timezone }),
      fiscalYearOf: (year) => describeFiscalYear(year, fiscalConfig, timezone),
    }),
    [timezone, fiscalConfig, loading]
  );

  return <OrgSettingsContext.Provider value={value}>{children}</OrgSettingsContext.Provider>;
}

/** Works outside the provider too, falling back to UTC, so a component can be
 *  mounted in isolation without crashing. */
export function useOrgSettings(): OrgSettingsValue {
  const ctx = useContext(OrgSettingsContext);
  if (ctx) return ctx;
  return {
    timezone: UTC,
    fiscalConfig: FALLBACK_CONFIG,
    fiscalYear: currentFiscalYear(FALLBACK_CONFIG, new Date(), UTC),
    today: todayInZone(UTC),
    loading: false,
    formatDate: (v) => formatInZone(v, UTC),
    formatTime: (v) => formatTimeInZone(v, UTC),
    formatDateTime: (v) => formatDateTimeInZone(v, UTC),
    fiscalYears: (opts) => listFiscalYears(FALLBACK_CONFIG, { ...opts, timeZone: UTC }),
    fiscalYearOf: (year) => describeFiscalYear(year, FALLBACK_CONFIG, UTC),
  };
}
