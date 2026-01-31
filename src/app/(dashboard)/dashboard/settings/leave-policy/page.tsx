"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, useToast } from "@/components";

const ALLOWED_ROLES = ["ADMIN", "HR"];

interface LeavePolicy {
  resetPeriod: "CALENDAR_YEAR" | "FISCAL_YEAR" | "ANNIVERSARY";
  fiscalYearStartMonth: number;
  accrualType: "ANNUAL" | "MONTHLY" | "QUARTERLY";
  proRataForNewJoiners: boolean;
  proRataMethod: "MONTHLY" | "DAILY";
  carryForwardProcessingMonth: number;
  maxCarryForwardMonths: number;
  allowNegativeBalance: boolean;
  maxNegativeBalance: number;
  autoResetOnNewYear: boolean;
  sendResetNotification: boolean;
  sendLowBalanceAlert: boolean;
  lowBalanceThreshold: number;
}

const defaultPolicy: LeavePolicy = {
  resetPeriod: "CALENDAR_YEAR",
  fiscalYearStartMonth: 4,
  accrualType: "ANNUAL",
  proRataForNewJoiners: true,
  proRataMethod: "MONTHLY",
  carryForwardProcessingMonth: 1,
  maxCarryForwardMonths: 3,
  allowNegativeBalance: false,
  maxNegativeBalance: 0,
  autoResetOnNewYear: true,
  sendResetNotification: true,
  sendLowBalanceAlert: false,
  lowBalanceThreshold: 3,
};

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function LeavePolicyPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<LeavePolicy>(defaultPolicy);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(([meData, orgData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (orgData.success && orgData.data.settings.leavePolicy) {
        setPolicy({ ...defaultPolicy, ...orgData.data.settings.leavePolicy });
      }
      setLoading(false);
    });
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leavePolicy: policy }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Leave policy updated successfully");
      } else {
        toast.error(data.error || "Failed to update policy");
      }
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leave Policy</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure when and how leave balances are reset and allocated
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Reset Period */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Leave Reset Period</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          When should leave balances reset for employees?
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 rounded border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
            <input
              type="radio"
              name="resetPeriod"
              value="CALENDAR_YEAR"
              checked={policy.resetPeriod === "CALENDAR_YEAR"}
              onChange={(e) => setPolicy({ ...policy, resetPeriod: e.target.value as LeavePolicy["resetPeriod"] })}
              className="mt-0.5 h-4 w-4 text-gray-900 dark:text-white"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Calendar Year (January 1st)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Leave resets on January 1st every year for all employees</p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
            <input
              type="radio"
              name="resetPeriod"
              value="FISCAL_YEAR"
              checked={policy.resetPeriod === "FISCAL_YEAR"}
              onChange={(e) => setPolicy({ ...policy, resetPeriod: e.target.value as LeavePolicy["resetPeriod"] })}
              className="mt-0.5 h-4 w-4 text-gray-900 dark:text-white"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Fiscal Year</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Leave resets at the start of your fiscal year</p>
              {policy.resetPeriod === "FISCAL_YEAR" && (
                <div className="mt-3">
                  <label className="text-xs text-gray-500">Fiscal Year Starts</label>
                  <select
                    value={policy.fiscalYearStartMonth}
                    onChange={(e) => setPolicy({ ...policy, fiscalYearStartMonth: parseInt(e.target.value) })}
                    className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </label>

          <label className="flex items-start gap-3 rounded border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
            <input
              type="radio"
              name="resetPeriod"
              value="ANNIVERSARY"
              checked={policy.resetPeriod === "ANNIVERSARY"}
              onChange={(e) => setPolicy({ ...policy, resetPeriod: e.target.value as LeavePolicy["resetPeriod"] })}
              className="mt-0.5 h-4 w-4 text-gray-900 dark:text-white"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Employee Anniversary</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Leave resets on each employee's work anniversary (joining date)</p>
            </div>
          </label>
        </div>
      </Card>

      {/* Accrual Settings */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Leave Accrual</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          How should leave be allocated to employees?
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 rounded border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
            <input
              type="radio"
              name="accrualType"
              value="ANNUAL"
              checked={policy.accrualType === "ANNUAL"}
              onChange={(e) => setPolicy({ ...policy, accrualType: e.target.value as LeavePolicy["accrualType"] })}
              className="mt-0.5 h-4 w-4 text-gray-900 dark:text-white"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Annual Allocation</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Full leave balance credited at the start of the period</p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
            <input
              type="radio"
              name="accrualType"
              value="MONTHLY"
              checked={policy.accrualType === "MONTHLY"}
              onChange={(e) => setPolicy({ ...policy, accrualType: e.target.value as LeavePolicy["accrualType"] })}
              className="mt-0.5 h-4 w-4 text-gray-900 dark:text-white"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Monthly Accrual</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Leave credits monthly (e.g., 1.67 days/month for 20 days/year)</p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
            <input
              type="radio"
              name="accrualType"
              value="QUARTERLY"
              checked={policy.accrualType === "QUARTERLY"}
              onChange={(e) => setPolicy({ ...policy, accrualType: e.target.value as LeavePolicy["accrualType"] })}
              className="mt-0.5 h-4 w-4 text-gray-900 dark:text-white"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Quarterly Accrual</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Leave credits every quarter (e.g., 5 days/quarter for 20 days/year)</p>
            </div>
          </label>
        </div>
      </Card>

      {/* Pro-rata Settings */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Pro-rata for New Joiners</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Calculate leave proportionally for employees who join mid-year
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={policy.proRataForNewJoiners}
              onChange={(e) => setPolicy({ ...policy, proRataForNewJoiners: e.target.checked })}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-gray-900 dark:peer-checked:bg-white peer-checked:after:translate-x-full dark:bg-gray-700" />
          </label>
        </div>

        {policy.proRataForNewJoiners && (
          <div className="mt-4 rounded bg-gray-50 p-4 dark:bg-gray-800">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Pro-rata Method</label>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="proRataMethod"
                  value="MONTHLY"
                  checked={policy.proRataMethod === "MONTHLY"}
                  onChange={(e) => setPolicy({ ...policy, proRataMethod: e.target.value as LeavePolicy["proRataMethod"] })}
                  className="h-4 w-4 text-gray-900 dark:text-white"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">By Month</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="proRataMethod"
                  value="DAILY"
                  checked={policy.proRataMethod === "DAILY"}
                  onChange={(e) => setPolicy({ ...policy, proRataMethod: e.target.value as LeavePolicy["proRataMethod"] })}
                  className="h-4 w-4 text-gray-900 dark:text-white"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">By Day</span>
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {policy.proRataMethod === "MONTHLY"
                ? "E.g., Employee joining in April gets 9/12 of annual leave"
                : "E.g., Leave calculated based on exact remaining days in the year"}
            </p>
          </div>
        )}
      </Card>

      {/* Carry Forward Settings */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Carry Forward Processing</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          When should unused leave be carried forward to the new period?
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Process Carry Forward In</label>
            <select
              value={policy.carryForwardProcessingMonth}
              onChange={(e) => setPolicy({ ...policy, carryForwardProcessingMonth: parseInt(e.target.value) })}
              className="mt-1.5 w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Carry Forward Expires After</label>
            <select
              value={policy.maxCarryForwardMonths}
              onChange={(e) => setPolicy({ ...policy, maxCarryForwardMonths: parseInt(e.target.value) })}
              className="mt-1.5 w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value={0}>Never expires</option>
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Negative Balance */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Allow Negative Balance</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Allow employees to take leave even if they don't have sufficient balance
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={policy.allowNegativeBalance}
              onChange={(e) => setPolicy({ ...policy, allowNegativeBalance: e.target.checked })}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-gray-900 dark:peer-checked:bg-white peer-checked:after:translate-x-full dark:bg-gray-700" />
          </label>
        </div>

        {policy.allowNegativeBalance && (
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Maximum Negative Balance (days)</label>
            <input
              type="number"
              min="0"
              max="30"
              value={policy.maxNegativeBalance}
              onChange={(e) => setPolicy({ ...policy, maxNegativeBalance: parseInt(e.target.value) || 0 })}
              className="mt-1.5 w-32 rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Notifications</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure automated leave notifications
        </p>

        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Annual Reset Notification</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Notify employees when their leave balance resets</p>
            </div>
            <input
              type="checkbox"
              checked={policy.sendResetNotification}
              onChange={(e) => setPolicy({ ...policy, sendResetNotification: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 dark:text-white"
            />
          </label>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Low Balance Alert</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notify employees when their leave balance is low</p>
              </div>
              <input
                type="checkbox"
                checked={policy.sendLowBalanceAlert}
                onChange={(e) => setPolicy({ ...policy, sendLowBalanceAlert: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 dark:text-white"
              />
            </label>
            {policy.sendLowBalanceAlert && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Alert when balance falls below</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={policy.lowBalanceThreshold}
                  onChange={(e) => setPolicy({ ...policy, lowBalanceThreshold: parseInt(e.target.value) || 3 })}
                  className="w-16 rounded border border-gray-200 px-2 py-1 text-center text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">days</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Current Policy Summary</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
          <li>
            Leave resets:{" "}
            <strong>
              {policy.resetPeriod === "CALENDAR_YEAR" && "January 1st each year"}
              {policy.resetPeriod === "FISCAL_YEAR" && `${MONTHS.find(m => m.value === policy.fiscalYearStartMonth)?.label} 1st each year`}
              {policy.resetPeriod === "ANNIVERSARY" && "On employee's work anniversary"}
            </strong>
          </li>
          <li>
            Accrual:{" "}
            <strong>
              {policy.accrualType === "ANNUAL" && "Full balance at start of period"}
              {policy.accrualType === "MONTHLY" && "Monthly accrual"}
              {policy.accrualType === "QUARTERLY" && "Quarterly accrual"}
            </strong>
          </li>
          <li>
            Pro-rata for new joiners: <strong>{policy.proRataForNewJoiners ? "Yes" : "No"}</strong>
          </li>
          <li>
            Carry forward expires: <strong>{policy.maxCarryForwardMonths === 0 ? "Never" : `After ${policy.maxCarryForwardMonths} months`}</strong>
          </li>
        </ul>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
