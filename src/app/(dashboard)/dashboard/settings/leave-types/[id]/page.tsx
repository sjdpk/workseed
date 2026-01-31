"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, useToast } from "@/components";

const ALLOWED_ROLES = ["ADMIN", "HR"];

interface LeaveTypeData {
  id: string;
  name: string;
  code: string;
  description?: string;
  defaultDays: number;
  maxDays?: number;
  carryForward: boolean;
  maxCarryForward?: number;
  isPaid: boolean;
  isActive: boolean;
  requiresApproval: boolean;
  minDaysNotice: number;
  color?: string;
}

export default function EditLeaveTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [leaveType, setLeaveType] = useState<LeaveTypeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    defaultDays: 0,
    maxDays: 0,
    carryForward: false,
    maxCarryForward: 0,
    isPaid: true,
    isActive: true,
    requiresApproval: true,
    minDaysNotice: 0,
    color: "#3B82F6",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch(`/api/leave-types/${id}`).then(r => r.json()),
    ]).then(([meData, leaveTypeData]) => {
      if (meData.success) {
        if (!ALLOWED_ROLES.includes(meData.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
        setHasPermission(true);
      }
      if (leaveTypeData.success) {
        const lt = leaveTypeData.data.leaveType;
        setLeaveType(lt);
        setFormData({
          name: lt.name || "",
          code: lt.code || "",
          description: lt.description || "",
          defaultDays: lt.defaultDays || 0,
          maxDays: lt.maxDays || 0,
          carryForward: lt.carryForward || false,
          maxCarryForward: lt.maxCarryForward || 0,
          isPaid: lt.isPaid ?? true,
          isActive: lt.isActive ?? true,
          requiresApproval: lt.requiresApproval ?? true,
          minDaysNotice: lt.minDaysNotice || 0,
          color: lt.color || "#3B82F6",
        });
      }
      setLoading(false);
    });
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/leave-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          maxDays: formData.maxDays || null,
          maxCarryForward: formData.carryForward ? formData.maxCarryForward : null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to update leave type");
        return;
      }

      toast.success("Leave type updated successfully");
      router.push("/dashboard/settings/leave-types");
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

  if (!leaveType || !hasPermission) {
    return <div className="p-8 text-center text-gray-500">Leave type not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Leave Type</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{leaveType.name} ({leaveType.code})</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="name" label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input id="code" label="Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
            <div>
              <label htmlFor="color" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
              <input id="color" type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10 w-full rounded border border-gray-300 dark:border-gray-600" />
            </div>
          </div>
          <div className="mt-4">
            <Input id="description" label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Leave Allocation</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="defaultDays" type="number" label="Default Days/Year" value={formData.defaultDays.toString()} onChange={(e) => setFormData({ ...formData, defaultDays: parseFloat(e.target.value) || 0 })} />
            <Input id="maxDays" type="number" label="Max Days (0 = unlimited)" value={formData.maxDays.toString()} onChange={(e) => setFormData({ ...formData, maxDays: parseFloat(e.target.value) || 0 })} />
            <Input id="minDaysNotice" type="number" label="Min Days Notice" value={formData.minDaysNotice.toString()} onChange={(e) => setFormData({ ...formData, minDaysNotice: parseInt(e.target.value) || 0 })} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Settings</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                <span className="flex items-center gap-2">
                  Active
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${formData.isActive ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                    {formData.isActive ? "Visible to employees" : "Hidden from employees"}
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.isPaid} onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                Paid Leave
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.requiresApproval} onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                Requires Approval
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.carryForward} onChange={(e) => setFormData({ ...formData, carryForward: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                Allow Carry Forward
              </label>
              {formData.carryForward && (
                <Input id="maxCarryForward" type="number" label="Max Carry Forward Days" value={formData.maxCarryForward.toString()} onChange={(e) => setFormData({ ...formData, maxCarryForward: parseFloat(e.target.value) || 0 })} className="max-w-[200px]" />
              )}
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}
