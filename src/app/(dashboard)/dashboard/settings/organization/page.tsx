"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Combobox, Input, PageHeader, Select, useToast } from "@/components";
import {
  currentFiscalYear,
  daysInMonth,
  describeFiscalYear,
  fiscalYearProgress,
  formatFiscalYearRange,
} from "@/lib/fiscal-year";
import {
  describeTimeZone,
  deviceTimeZone,
  formatDateTimeInZone,
  formatInZone,
  listTimeZones,
} from "@/lib/time";

const ALLOWED_ROLES = ["ADMIN"];

interface OrgSettings {
  id: string;
  name: string;
  logoUrl: string | null;
  timezone: string;
  fiscalYearStart: number;
  fiscalYearStartDay: number;
  workingDaysPerWeek: number;
  theme?: {
    accentColor: string;
    darkMode: "system" | "light" | "dark";
  };
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [_settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    timezone: "UTC",
    fiscalYearStart: 1,
    fiscalYearStartDay: 1,
    workingDaysPerWeek: 5,
    theme: {
      accentColor: "gray",
      darkMode: "system" as "system" | "light" | "dark",
    },
  });
  const [logoError, setLogoError] = useState(false);
  /* ticks so the timezone preview is a live clock rather than a stale stamp */
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(([meData, orgData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (orgData.success) {
        setSettings(orgData.data.settings);
        const themeData = orgData.data.settings.theme || {};
        setFormData({
          name: orgData.data.settings.name || "",
          logoUrl: orgData.data.settings.logoUrl || "",
          timezone: orgData.data.settings.timezone || "UTC",
          fiscalYearStart: orgData.data.settings.fiscalYearStart || 1,
          fiscalYearStartDay: orgData.data.settings.fiscalYearStartDay || 1,
          workingDaysPerWeek: orgData.data.settings.workingDaysPerWeek || 5,
          theme: {
            accentColor: themeData.accentColor || "gray",
            darkMode: themeData.darkMode || "system",
          },
        });
      }
      setLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to save settings");
        return;
      }

      toast.success("Settings saved successfully");
      setSettings(data.data.settings);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  /* day list follows the chosen month, so 30 February can't be picked */
  const fiscalConfig = {
    startMonth: formData.fiscalYearStart,
    startDay: formData.fiscalYearStartDay,
  };
  const maxDay = daysInMonth(new Date().getFullYear(), formData.fiscalYearStart);
  const dayOptions = Array.from({ length: maxDay }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));
  const timeZone = formData.timezone;
  /* 400+ zones need a search box, and the device's own zone belongs at the top —
     that is what a company setting up for the first time almost always wants. */
  const device = deviceTimeZone();
  const zones = listTimeZones();
  const timeZoneOptions = [
    ...(zones.includes(device)
      ? [
          {
            value: device,
            label: `${describeTimeZone(device)} — your device`,
            keywords: "current device local here",
          },
        ]
      : []),
    ...zones
      .filter((tz) => tz !== device)
      .map((tz) => ({
        value: tz,
        label: describeTimeZone(tz),
        keywords: tz.replace(/[_/]/g, " "),
      })),
  ];
  const runningFiscalYear = currentFiscalYear(fiscalConfig, new Date(), timeZone);
  const progress = fiscalYearProgress(runningFiscalYear);
  const nextFiscalYear = describeFiscalYear(runningFiscalYear.year + 1, fiscalConfig, timeZone);

  const workingDaysOptions = [
    { value: "5", label: "5 days (Mon-Fri)" },
    { value: "6", label: "6 days (Mon-Sat)" },
    { value: "7", label: "7 days" },
  ];

  const accentColors = [
    { value: "gray", label: "Gray (Minimal)", color: "#374151" },
    { value: "blue", label: "Blue", color: "#2563eb" },
    { value: "green", label: "Green", color: "#16a34a" },
    { value: "purple", label: "Purple", color: "#9333ea" },
    { value: "orange", label: "Orange", color: "#ea580c" },
    { value: "red", label: "Red", color: "#dc2626" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Organization Settings" subtitle="Manage company-wide settings" />

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Company Information
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Basic information about your organization
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="name"
              label="Organization Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div className="sm:col-span-2">
              <Input
                id="logoUrl"
                label="Logo URL"
                type="url"
                placeholder="https://example.com/logo.svg"
                value={formData.logoUrl}
                onChange={(e) => {
                  setFormData({ ...formData, logoUrl: e.target.value });
                  setLogoError(false);
                }}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter a URL to your organization logo (PNG, JPG, SVG recommended)
              </p>
            </div>
            {formData.logoUrl && (
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Logo Preview
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
                    {!logoError ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Dynamic URL from form input
                      <img
                        src={formData.logoUrl}
                        alt="Logo preview"
                        className="h-14 w-14 object-contain"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <span className="text-xs text-red-500">Invalid</span>
                    )}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
                    {!logoError ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Dynamic URL from form input
                      <img
                        src={formData.logoUrl}
                        alt="Logo small"
                        className="h-8 w-8 object-contain"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <span className="text-xs text-red-500">!</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {logoError ? (
                      <span className="text-red-500">
                        Failed to load image. Please check the URL.
                      </span>
                    ) : (
                      <span>Preview shows how your logo will appear in the header</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Leave Settings
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configure leave calculation settings
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Combobox
                id="timezone"
                label="Company Timezone"
                options={timeZoneOptions}
                value={formData.timezone}
                placeholder="Search a city or region…"
                onChange={(tz) => setFormData({ ...formData, timezone: tz })}
              />
              {formData.timezone !== device && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, timezone: device })}
                  className="mt-1.5 text-xs text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Use my current timezone ({device.replace(/_/g, " ")})
                </button>
              )}
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Right now it is{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDateTimeInZone(now, timeZone)}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Attendance days, leave dates, reports and emails all use this zone. Times are stored
                in UTC, so changing it re-renders history rather than rewriting it.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              id="fiscalYearStart"
              label="Fiscal Year Starts — Month"
              options={monthOptions}
              value={formData.fiscalYearStart.toString()}
              onChange={(e) => {
                const month = parseInt(e.target.value);
                // keep the day valid when moving to a shorter month
                const max = daysInMonth(new Date().getFullYear(), month);
                setFormData({
                  ...formData,
                  fiscalYearStart: month,
                  fiscalYearStartDay: Math.min(formData.fiscalYearStartDay, max),
                });
              }}
            />
            <Select
              id="fiscalYearStartDay"
              label="Day"
              options={dayOptions}
              value={formData.fiscalYearStartDay.toString()}
              onChange={(e) =>
                setFormData({ ...formData, fiscalYearStartDay: parseInt(e.target.value) })
              }
            />
            <Select
              id="workingDaysPerWeek"
              label="Working Days per Week"
              options={workingDaysOptions}
              value={formData.workingDaysPerWeek.toString()}
              onChange={(e) =>
                setFormData({ ...formData, workingDaysPerWeek: parseInt(e.target.value) })
              }
            />
          </div>

          {/* what the setting above actually means today — leave balances, reports
              and allocations are all keyed to this year */}
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Current fiscal year {runningFiscalYear.label} · resets {runningFiscalYear.resetsOn}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Day {progress.dayNumber} of {progress.totalDays} · {progress.daysRemaining} left
              </p>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {formatFiscalYearRange(runningFiscalYear, timeZone)}
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gray-900 dark:bg-white"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Leave allocations, balances and yearly reports are keyed to this year. Next year{" "}
              {nextFiscalYear.label} starts{" "}
              {formatInZone(nextFiscalYear.start, timeZone, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              .{" "}
              {formData.fiscalYearStart === 1 && formData.fiscalYearStartDay === 1
                ? "This matches the calendar year."
                : "Records already saved keep the year they were filed under; only new ones follow a changed start date."}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Appearance</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Set organization-wide theme for all users
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Accent Color
              </label>
              <div className="flex flex-wrap gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        theme: { ...formData.theme, accentColor: color.value },
                      })
                    }
                    className={`flex items-center gap-2 rounded border px-3 py-2 text-sm transition-all ${
                      formData.theme.accentColor === color.value
                        ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-800"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: color.color }}
                    />
                    <span className="text-gray-700 dark:text-gray-300">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
