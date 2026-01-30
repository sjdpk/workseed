"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input } from "@/components";
import type { LeaveType } from "@/types";

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    defaultDays: 0,
    maxDays: 0,
    carryForward: false,
    maxCarryForward: 0,
    isPaid: true,
    requiresApproval: true,
    minDaysNotice: 0,
    color: "#3B82F6",
  });

  const fetchLeaveTypes = async () => {
    const res = await fetch("/api/leave-types");
    const data = await res.json();
    if (data.success) {
      setLeaveTypes(data.data.leaveTypes);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          maxDays: formData.maxDays || undefined,
          maxCarryForward: formData.carryForward ? formData.maxCarryForward : undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to create leave type");
        return;
      }

      setShowForm(false);
      setFormData({
        name: "", code: "", description: "", defaultDays: 0, maxDays: 0,
        carryForward: false, maxCarryForward: 0, isPaid: true,
        requiresApproval: true, minDaysNotice: 0, color: "#3B82F6",
      });
      fetchLeaveTypes();
    } catch {
      setError("Something went wrong");
    } finally {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leave Types</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure organization leave policies</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Leave Type"}</Button>
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Create Leave Type</h2>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input id="name" label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <Input id="code" label="Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
              <Input id="color" type="color" label="Color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
            </div>
            <Input id="description" label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input id="defaultDays" type="number" label="Default Days" value={formData.defaultDays.toString()} onChange={(e) => setFormData({ ...formData, defaultDays: parseFloat(e.target.value) || 0 })} />
              <Input id="maxDays" type="number" label="Max Days" value={formData.maxDays.toString()} onChange={(e) => setFormData({ ...formData, maxDays: parseFloat(e.target.value) || 0 })} />
              <Input id="minDaysNotice" type="number" label="Min Days Notice" value={formData.minDaysNotice.toString()} onChange={(e) => setFormData({ ...formData, minDaysNotice: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.isPaid} onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })} className="rounded border-gray-300" />
                Paid Leave
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.requiresApproval} onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })} className="rounded border-gray-300" />
                Requires Approval
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.carryForward} onChange={(e) => setFormData({ ...formData, carryForward: e.target.checked })} className="rounded border-gray-300" />
                Allow Carry Forward
              </label>
              {formData.carryForward && (
                <Input id="maxCarryForward" type="number" label="Max Carry Forward" value={formData.maxCarryForward.toString()} onChange={(e) => setFormData({ ...formData, maxCarryForward: parseFloat(e.target.value) || 0 })} className="w-40" />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Leave Type"}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {leaveTypes.map((lt) => (
          <Card key={lt.id} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: lt.color || "#3B82F6" }} />
            <div className="pl-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{lt.name}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{lt.code}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{lt.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{lt.defaultDays} days/year</span>
                {lt.isPaid ? (
                  <span className="rounded bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-300">Paid</span>
                ) : (
                  <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-300">Unpaid</span>
                )}
                {lt.carryForward && (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Carry Forward</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
