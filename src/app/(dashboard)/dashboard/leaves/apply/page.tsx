"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components";
import type { LeaveType, LeaveAllocation } from "@/types";

export default function ApplyLeavePage() {
  const router = useRouter();
  const toast = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<(LeaveAllocation & { balance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [dropdownOpen]);

  const filteredLeaveTypes = leaveTypes.filter((lt) =>
    lt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setSubmitting(true);

    if (!formData.leaveTypeId) {
      toast.error("Please select a leave type");
      setSubmitting(false);
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error("Please select dates");
      setSubmitting(false);
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error("End date must be after start date");
      setSubmitting(false);
      return;
    }

    if (selectedAllocation && formData.days > selectedAllocation.balance) {
      toast.error(`Insufficient balance. You have ${selectedAllocation.balance} days available.`);
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
        toast.error(data.error || "Failed to submit leave request");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard/leaves?success=1");
    } catch {
      toast.error("Something went wrong");
      setSubmitting(false);
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
    <div className="mx-auto max-w-xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Apply for Leave</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Submit a new leave request</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/leaves")}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave Type */}
        <div ref={dropdownRef} className="relative">
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            Leave Type
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex w-full items-center justify-between rounded border bg-white px-4 py-3 text-left transition-all dark:bg-gray-800 ${
              dropdownOpen
                ? "border-gray-900 ring-2 ring-gray-900/20 dark:border-white dark:ring-white/20"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            }`}
          >
            {selectedLeaveType ? (
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: selectedLeaveType.color || "#3B82F6" }}
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedLeaveType.name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedAllocation?.balance ?? 0} days left
                </span>
              </div>
            ) : (
              <span className="text-gray-400">Select leave type</span>
            )}
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 p-2 dark:border-gray-700">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded border-0 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500/20 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>
              <div className="max-h-64 overflow-auto p-1">
                {filteredLeaveTypes.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No leave types found
                  </div>
                ) : (
                  filteredLeaveTypes.map((lt) => {
                    const alloc = allocations.find((a) => a.leaveTypeId === lt.id);
                    const balance = alloc?.balance ?? 0;
                    const total = alloc ? alloc.allocated + alloc.carriedOver + alloc.adjusted : lt.defaultDays;
                    const hasBalance = balance > 0;
                    const isSelected = formData.leaveTypeId === lt.id;

                    return (
                      <button
                        key={lt.id}
                        type="button"
                        disabled={!hasBalance}
                        onClick={() => {
                          if (hasBalance) {
                            setFormData({ ...formData, leaveTypeId: lt.id });
                            setDropdownOpen(false);
                            setSearchTerm("");
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? "bg-gray-50 dark:bg-gray-800"
                            : hasBalance
                            ? "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            : "opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: lt.color || "#3B82F6" }}
                          />
                          <span className={`text-sm ${isSelected ? "font-medium text-gray-900 dark:text-white" : "text-gray-900 dark:text-white"}`}>
                            {lt.name}
                          </span>
                          {!lt.isPaid && (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                              Unpaid
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-sm font-semibold ${hasBalance ? "text-gray-900 dark:text-white" : "text-red-500"}`}>
                            {balance}
                          </span>
                          <span className="text-xs text-gray-400">/ {total}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            Duration
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value, endDate: formData.endDate || e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
                required
                className="w-full rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-white"
              />
            </div>
            <span className="text-sm text-gray-400">to</span>
            <div className="flex-1">
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate || new Date().toISOString().split("T")[0]}
                required
                disabled={formData.isHalfDay}
                className="w-full rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-white"
              />
            </div>
            {formData.startDate && formData.endDate && (
              <div className="shrink-0 rounded bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formData.days} {formData.days === 1 || formData.days === 0.5 ? "day" : "days"}
                </span>
              </div>
            )}
          </div>
          <div className="mt-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
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
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-600 dark:text-white"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Half day</span>
            </label>
            {formData.isHalfDay && (
              <select
                value={formData.halfDayType}
                onChange={(e) => setFormData({ ...formData, halfDayType: e.target.value })}
                className="ml-3 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-white"
              >
                <option value="FIRST_HALF">Morning</option>
                <option value="SECOND_HALF">Afternoon</option>
              </select>
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            Reason <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Add a note for your manager..."
            className="w-full rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-white"
          />
        </div>

        {/* Summary */}
        {formData.leaveTypeId && formData.startDate && formData.endDate && (
          <div className="rounded bg-gray-50 p-4 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedLeaveType?.color || "#3B82F6" }} />
                <span className="font-medium text-gray-900 dark:text-white">{selectedLeaveType?.name}</span>
                <span className="text-gray-400">·</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(formData.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {formData.startDate !== formData.endDate && (
                    <> - {new Date(formData.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                  )}
                </span>
                <span className="text-gray-400">·</span>
                <span className="font-medium text-gray-900 dark:text-white">{formData.days}d</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Remaining: </span>
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

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={submitting || !formData.leaveTypeId || !formData.startDate}
            className="flex-1"
          >
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
