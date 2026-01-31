"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, useToast } from "@/components";

const ALLOWED_ROLES = ["ADMIN"];

interface OrgSettings {
  id: string;
  name: string;
  logoUrl: string | null;
  fiscalYearStart: number;
  workingDaysPerWeek: number;
  theme?: {
    accentColor: string;
    darkMode: "system" | "light" | "dark";
  };
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    fiscalYearStart: 1,
    workingDaysPerWeek: 5,
    theme: {
      accentColor: "gray",
      darkMode: "system" as "system" | "light" | "dark",
    },
  });
  const [logoError, setLogoError] = useState(false);

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
          fiscalYearStart: orgData.data.settings.fiscalYearStart || 1,
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
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Organization Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage company-wide settings</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Company Information</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Basic information about your organization</p>
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
                placeholder="https://example.com/logo.png"
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
                      <span className="text-red-500">Failed to load image. Please check the URL.</span>
                    ) : (
                      <span>Preview shows how your logo will appear in the header</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Leave Settings</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure leave calculation settings</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="fiscalYearStart"
              label="Fiscal Year Starts"
              options={monthOptions}
              value={formData.fiscalYearStart.toString()}
              onChange={(e) => setFormData({ ...formData, fiscalYearStart: parseInt(e.target.value) })}
            />
            <Select
              id="workingDaysPerWeek"
              label="Working Days per Week"
              options={workingDaysOptions}
              value={formData.workingDaysPerWeek.toString()}
              onChange={(e) => setFormData({ ...formData, workingDaysPerWeek: parseInt(e.target.value) })}
            />
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Appearance</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Set organization-wide theme for all users</p>
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
                    onClick={() => setFormData({ ...formData, theme: { ...formData.theme, accentColor: color.value } })}
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
