"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@/components";
import type { LeaveType, LeaveAllocation, LeaveRequest } from "@/types";

export default function MyLeavesPage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<(LeaveAllocation & { balance: number })[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    days: 1,
    isHalfDay: false,
    halfDayType: "FIRST_HALF",
    reason: "",
  });

  const fetchData = async () => {
    const [typesRes, allocRes, reqRes] = await Promise.all([
      fetch("/api/leave-types").then(r => r.json()),
      fetch("/api/leave-allocations").then(r => r.json()),
      fetch("/api/leave-requests").then(r => r.json()),
    ]);

    if (typesRes.success) setLeaveTypes(typesRes.data.leaveTypes);
    if (allocRes.success) setAllocations(allocRes.data.allocations);
    if (reqRes.success) setRequests(reqRes.data.leaveRequests);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leaveTypeId);
  const selectedAllocation = allocations.find(a => a.leaveTypeId === formData.leaveTypeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    // Validation
    if (!formData.leaveTypeId) {
      setError("Please select a leave type");
      setSubmitting(false);
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError("Please select start and end dates");
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
        return;
      }

      setSuccess("Leave request submitted successfully!");
      setFormData({ leaveTypeId: "", startDate: "", endDate: "", days: 1, isHalfDay: false, halfDayType: "FIRST_HALF", reason: "" });
      fetchData();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) return;

    const res = await fetch(`/api/leave-requests?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });

    const data = await res.json();
    if (data.success) {
      fetchData();
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return;
    if (formData.isHalfDay) {
      setFormData(prev => ({ ...prev, days: 0.5 }));
      return;
    }
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setFormData(prev => ({ ...prev, days: Math.max(1, diff) }));
  };

  useEffect(() => {
    calculateDays();
  }, [formData.startDate, formData.endDate, formData.isHalfDay]);

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    REJECTED: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Leaves</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View balance and apply for leave</p>
      </div>

      {/* Leave Balance Cards */}
      {allocations.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Leave Balance</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {allocations.map((alloc) => (
              <div
                key={alloc.id}
                className="relative overflow-hidden rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: alloc.leaveType?.color || "#3B82F6" }} />
                <div className="pl-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{alloc.leaveType?.name}</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{alloc.balance}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">/ {alloc.allocated}</span>
                  </div>
                  {alloc.used > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{alloc.used} used</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apply Leave Form */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Apply for Leave</h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Leave Type Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Leave Type *</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {leaveTypes.map((lt) => {
                const alloc = allocations.find(a => a.leaveTypeId === lt.id);
                const isSelected = formData.leaveTypeId === lt.id;
                const balance = alloc?.balance ?? 0;
                const hasBalance = balance > 0;

                return (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, leaveTypeId: lt.id })}
                    disabled={!hasBalance}
                    className={`relative flex items-start gap-3 rounded-md border p-3 text-left transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-400 dark:bg-blue-900/20"
                        : hasBalance
                        ? "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                        : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800/50"
                    }`}
                  >
                    <div className="w-1 h-full absolute left-0 top-0 rounded-l-md" style={{ backgroundColor: lt.color || "#3B82F6" }} />
                    <div className="flex-1 pl-1">
                      <p className={`text-sm font-medium ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
                        {lt.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-xs ${hasBalance ? "text-gray-600 dark:text-gray-400" : "text-red-500 dark:text-red-400"}`}>
                          {balance} days available
                        </span>
                        {!lt.isPaid && (
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            Unpaid
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Selection */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              id="startDate"
              type="date"
              label="Start Date *"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: formData.endDate || e.target.value })}
              min={new Date().toISOString().split("T")[0]}
              required
            />
            <Input
              id="endDate"
              type="date"
              label="End Date *"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate || new Date().toISOString().split("T")[0]}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
              <div className="flex h-10 items-center rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {formData.days} {formData.days === 1 || formData.days === 0.5 ? "day" : "days"}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Half Day</label>
              <div className="flex h-10 items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.isHalfDay}
                    onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked, endDate: e.target.checked ? formData.startDate : formData.endDate })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Half day
                </label>
                {formData.isHalfDay && (
                  <select
                    value={formData.halfDayType}
                    onChange={(e) => setFormData({ ...formData, halfDayType: e.target.value })}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="FIRST_HALF">First Half</option>
                    <option value="SECOND_HALF">Second Half</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason {selectedLeaveType?.requiresApproval && <span className="text-gray-500">(helps with approval)</span>}
            </label>
            <textarea
              id="reason"
              rows={2}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Enter the reason for your leave..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Summary & Submit */}
          {formData.leaveTypeId && formData.startDate && formData.endDate && (
            <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800/50">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary</h3>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Leave Type:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedLeaveType?.name}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{formData.days} {formData.days === 1 || formData.days === 0.5 ? "day" : "days"}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Dates:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {new Date(formData.startDate).toLocaleDateString()} {formData.startDate !== formData.endDate && `- ${new Date(formData.endDate).toLocaleDateString()}`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Balance After:</span>
                  <span className={`ml-2 font-medium ${
                    selectedAllocation && selectedAllocation.balance - formData.days >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {selectedAllocation ? selectedAllocation.balance - formData.days : 0} days
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({ leaveTypeId: "", startDate: "", endDate: "", days: 1, isHalfDay: false, halfDayType: "FIRST_HALF", reason: "" })}
            >
              Clear
            </Button>
            <Button type="submit" disabled={submitting || !formData.leaveTypeId}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Leave History */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Leave History</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No leave requests found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-1 rounded-full" style={{ backgroundColor: req.leaveType?.color || "#3B82F6" }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{req.leaveType?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(req.startDate).toLocaleDateString()}
                      {req.startDate !== req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}
                      {req.isHalfDay && <span className="ml-1 text-xs text-gray-500">({req.halfDayType === "FIRST_HALF" ? "AM" : "PM"})</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{req.days}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{req.reason || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusColors[req.status]}`}>
                        {req.status}
                      </span>
                      {req.status === "REJECTED" && req.rejectionReason && (
                        <p className="mt-1 text-xs text-red-500">{req.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === "PENDING" && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(req.id)}>
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
