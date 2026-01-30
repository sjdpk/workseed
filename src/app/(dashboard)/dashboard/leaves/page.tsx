"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Select } from "@/components";
import type { LeaveType, LeaveAllocation, LeaveRequest } from "@/types";

export default function MyLeavesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<(LeaveAllocation & { balance: number })[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    days: 1,
    isHalfDay: false,
    halfDayType: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

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

      setShowForm(false);
      setFormData({ leaveTypeId: "", startDate: "", endDate: "", days: 1, isHalfDay: false, halfDayType: "", reason: "" });
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
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setFormData({ ...formData, days: formData.isHalfDay ? 0.5 : Math.max(1, diff) });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Leaves</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View balance and apply for leave</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Apply Leave"}</Button>
      </div>

      {/* Leave Balance */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {allocations.map((alloc) => (
          <Card key={alloc.id} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: alloc.leaveType?.color || "#3B82F6" }} />
            <div className="pl-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{alloc.leaveType?.name}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{alloc.balance}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">of {alloc.allocated} days</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Apply Leave Form */}
      {showForm && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Apply for Leave</h2>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select id="leaveType" label="Leave Type *" options={[{ value: "", label: "Select Type" }, ...leaveTypes.map(lt => ({ value: lt.id, label: lt.name }))]} value={formData.leaveTypeId} onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })} required />
              <Input id="startDate" type="date" label="Start Date *" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
              <Input id="endDate" type="date" label="End Date *" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
              <Input id="days" type="number" label="Days" value={formData.days.toString()} disabled />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.isHalfDay} onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked, days: e.target.checked ? 0.5 : 1 })} className="rounded border-gray-300" />
                Half Day
              </label>
              {formData.isHalfDay && (
                <Select id="halfDayType" label="" options={[{ value: "FIRST_HALF", label: "First Half" }, { value: "SECOND_HALF", label: "Second Half" }]} value={formData.halfDayType} onChange={(e) => setFormData({ ...formData, halfDayType: e.target.value })} />
              )}
            </div>
            <Input id="reason" label="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Leave Requests */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Leave History</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No leave requests found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Dates</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Days</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{req.leaveType?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{req.days}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusColors[req.status]}`}>{req.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === "PENDING" && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(req.id)}>Cancel</Button>
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
