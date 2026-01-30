"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components";
import type { LeaveType, LeaveAllocation } from "@/types";

export default function ApplyLeavePage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<(LeaveAllocation & { balance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    days: 1,
    isHalfDay: false,
    halfDayType: "FIRST_HALF",
    reason: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/leave-types").then((r) => r.json()),
      fetch("/api/leave-allocations").then((r) => r.json()),
    ]).then(([typesRes, allocRes]) => {
      if (typesRes.success) setLeaveTypes(typesRes.data.leaveTypes);
      if (allocRes.success) setAllocations(allocRes.data.allocations);
      setLoading(false);
    });
  }, []);

  const selectedLeaveType = leaveTypes.find((lt) => lt.id === formData.leaveTypeId);
  const selectedAllocation = allocations.find((a) => a.leaveTypeId === formData.leaveTypeId);

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return;
    if (formData.isHalfDay) {
      setFormData((prev) => ({ ...prev, days: 0.5 }));
      return;
    }
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setFormData((prev) => ({ ...prev, days: Math.max(1, diff) }));
  };

  useEffect(() => {
    calculateDays();
  }, [formData.startDate, formData.endDate, formData.isHalfDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!formData.leaveTypeId) {
      setError("Please select a leave type");
      setSubmitting(false);
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError("Please select dates");
      setSubmitting(false);
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError("End date must be after start date");
      setSubmitting(false);
      return;
    }

    if (selectedAllocation && formData.days > selectedAllocation.balance) {
      setError(`Insufficient balance. You have ${selectedAllocation.balance} days available.`);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          halfDayType: formData.isHalfDay ? formData.halfDayType : undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to submit leave request");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard/leaves?success=1");
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Apply for Leave</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Submit a new leave request</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/leaves")}>
          Cancel
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Leave Type Selection */}
        <Card>
          <label className="mb-3 block text-sm font-medium text-gray-900 dark:text-white">Select Leave Type</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {leaveTypes.map((lt) => {
              const alloc = allocations.find((a) => a.leaveTypeId === lt.id);
              const isSelected = formData.leaveTypeId === lt.id;
              const balance = alloc?.balance ?? 0;
              const total = alloc ? alloc.allocated + alloc.carriedOver + alloc.adjusted : lt.defaultDays;
              const hasBalance = balance > 0;

              return (
                <button
                  key={lt.id}
                  type="button"
                  onClick={() => hasBalance && setFormData({ ...formData, leaveTypeId: lt.id })}
                  disabled={!hasBalance}
                  className={`relative flex items-center justify-between rounded-lg border-2 p-3 text-left transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                      : hasBalance
                      ? "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      : "border-gray-200 opacity-40 cursor-not-allowed dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: lt.color || "#3B82F6" }}
                    />
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
                        {lt.name}
                      </p>
                      {!lt.isPaid && (
                        <span className="text-xs text-orange-600 dark:text-orange-400">Unpaid</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${hasBalance ? "text-gray-900 dark:text-white" : "text-red-500"}`}>
                      {balance}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">of {total}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 rounded-full bg-blue-500 p-0.5 text-white">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Date Selection */}
        <Card>
          <label className="mb-3 block text-sm font-medium text-gray-900 dark:text-white">Select Dates</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="startDate"
              type="date"
              label="From"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value, endDate: formData.endDate || e.target.value })
              }
              min={new Date().toISOString().split("T")[0]}
              required
            />
            <Input
              id="endDate"
              type="date"
              label="To"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate || new Date().toISOString().split("T")[0]}
              required
              disabled={formData.isHalfDay}
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isHalfDay}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isHalfDay: e.target.checked,
                    endDate: e.target.checked ? formData.startDate : formData.endDate,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Half Day</span>
              {formData.isHalfDay && (
                <select
                  value={formData.halfDayType}
                  onChange={(e) => setFormData({ ...formData, halfDayType: e.target.value })}
                  className="ml-2 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="FIRST_HALF">Morning</option>
                  <option value="SECOND_HALF">Afternoon</option>
                </select>
              )}
            </label>
            {formData.startDate && formData.endDate && (
              <div className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {formData.days} {formData.days === 1 || formData.days === 0.5 ? "day" : "days"}
              </div>
            )}
          </div>
        </Card>

        {/* Reason */}
        <Card>
          <label htmlFor="reason" className="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
            Reason <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <textarea
            id="reason"
            rows={2}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Enter reason for leave..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </Card>

        {/* Summary & Submit */}
        {formData.leaveTypeId && formData.startDate && formData.endDate && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedLeaveType?.color || "#3B82F6" }} />
                  <span className="font-medium text-gray-900 dark:text-white">{selectedLeaveType?.name}</span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">·</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {new Date(formData.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {formData.startDate !== formData.endDate && (
                    <> - {new Date(formData.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                  )}
                </span>
                <span className="text-gray-500 dark:text-gray-400">·</span>
                <span className="font-medium text-gray-900 dark:text-white">{formData.days} day{formData.days !== 1 && "s"}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 dark:text-gray-400">Balance after: </span>
                <span className={`font-semibold ${
                  selectedAllocation && selectedAllocation.balance - formData.days >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {selectedAllocation ? selectedAllocation.balance - formData.days : 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !formData.leaveTypeId || !formData.startDate} className="flex-1">
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/leaves")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
