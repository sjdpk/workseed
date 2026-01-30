"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@/components";

const ALLOWED_ROLES = ["ADMIN"];

interface OrgSettings {
  id: string;
  name: string;
  fiscalYearStart: number;
  workingDaysPerWeek: number;
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    fiscalYearStart: 1,
    workingDaysPerWeek: 5,
  });

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
        setFormData({
          name: orgData.data.settings.name || "",
          fiscalYearStart: orgData.data.settings.fiscalYearStart || 1,
          workingDaysPerWeek: orgData.data.settings.workingDaysPerWeek || 5,
        });
      }
      setLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to save settings");
        return;
      }

      setSuccess("Settings saved successfully!");
      setSettings(data.data.settings);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Organization Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage company-wide settings</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">{success}</div>
      )}

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
