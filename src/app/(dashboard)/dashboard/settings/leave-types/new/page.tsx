"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, useToast } from "@/components";

const ALLOWED_ROLES = ["ADMIN", "HR"];

export default function NewLeaveTypePage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (data.success && !ALLOWED_ROLES.includes(data.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
        setPageLoading(false);
      });
  }, [router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        toast.error(data.error || "Failed to create leave type");
        return;
      }

      toast.success("Leave type created successfully");
      router.push("/dashboard/settings/leave-types");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Add Leave Type</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Create a new leave policy</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="name" label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input id="code" label="Code *" placeholder="e.g., AL, SL, CL" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
            <div>
              <label htmlFor="color" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
              <input id="color" type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10 w-full rounded border border-gray-300 dark:border-gray-600" />
            </div>
          </div>
          <Input id="description" label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="defaultDays" type="number" label="Default Days/Year" value={formData.defaultDays.toString()} onChange={(e) => setFormData({ ...formData, defaultDays: parseFloat(e.target.value) || 0 })} />
            <Input id="maxDays" type="number" label="Max Days" value={formData.maxDays.toString()} onChange={(e) => setFormData({ ...formData, maxDays: parseFloat(e.target.value) || 0 })} />
            <Input id="minDaysNotice" type="number" label="Min Days Notice" value={formData.minDaysNotice.toString()} onChange={(e) => setFormData({ ...formData, minDaysNotice: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={formData.isPaid} onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
              Paid Leave
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={formData.requiresApproval} onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
              Requires Approval
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={formData.carryForward} onChange={(e) => setFormData({ ...formData, carryForward: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
              Allow Carry Forward
            </label>
          </div>
          {formData.carryForward && (
            <Input id="maxCarryForward" type="number" label="Max Carry Forward Days" value={formData.maxCarryForward.toString()} onChange={(e) => setFormData({ ...formData, maxCarryForward: parseFloat(e.target.value) || 0 })} className="max-w-xs" />
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Leave Type"}</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
