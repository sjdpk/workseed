/** Fiscal year config read from organization settings. Server-only. */
import {
  currentFiscalYear,
  DEFAULT_FISCAL_YEAR,
  normalizeFiscalYearConfig,
  resolveFiscalYear,
  type FiscalYear,
  type FiscalYearConfig,
} from "./fiscal-year";
import { prisma } from "./prisma";
import { getOrgTimeZone } from "./time-server";

/** Falls back to the calendar year if settings are missing or unreachable, so a
 *  year-keyed write never lands on a guessed value. */
export async function getFiscalYearConfig(): Promise<FiscalYearConfig> {
  try {
    const settings = await prisma.organizationSettings.findFirst({
      select: { fiscalYearStart: true, fiscalYearStartDay: true },
    });
    if (!settings) return DEFAULT_FISCAL_YEAR;
    return normalizeFiscalYearConfig({
      startMonth: settings.fiscalYearStart,
      startDay: settings.fiscalYearStartDay,
    });
  } catch {
    return DEFAULT_FISCAL_YEAR;
  }
}

/** The fiscal year running right now, in the company timezone. */
export async function getCurrentFiscalYear(): Promise<FiscalYear> {
  const [config, timeZone] = await Promise.all([getFiscalYearConfig(), getOrgTimeZone()]);
  return currentFiscalYear(config, new Date(), timeZone);
}

/** The fiscal year a date belongs to — used to key leave allocations. */
export async function getFiscalYearFor(date: Date | string): Promise<FiscalYear> {
  const [config, timeZone] = await Promise.all([getFiscalYearConfig(), getOrgTimeZone()]);
  return resolveFiscalYear(date, config, timeZone);
}
