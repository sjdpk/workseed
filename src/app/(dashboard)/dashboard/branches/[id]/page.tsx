"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, useToast } from "@/components";

const ALLOWED_ROLES = ["ADMIN", "HR"];

export default function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    phone: "",
    email: "",
    isActive: true,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch(`/api/branches/${id}`).then((r) => r.json()),
    ]).then(([meData, branchData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (branchData.success) {
        const branch = branchData.data.branch;
        setFormData({
          name: branch.name,
          code: branch.code,
          address: branch.address || "",
          city: branch.city || "",
          state: branch.state || "",
          country: branch.country || "",
          phone: branch.phone || "",
          email: branch.email || "",
          isActive: branch.isActive,
        });
      }
      setPageLoading(false);
    });
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/branches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to update branch");
        return;
      }

      toast.success("Branch updated successfully");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this branch? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/branches/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to delete branch");
        return;
      }

      toast.success("Branch deleted successfully");
      router.push("/dashboard/branches");
    } catch {
      toast.error("Something went wrong");
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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Branch</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Update branch details</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/branches")}>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Branch Information</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="name"
              label="Branch Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              id="code"
              label="Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">Address</h3>
            <div className="space-y-4">
              <Input
                id="address"
                label="Street Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  id="city"
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <Input
                  id="state"
                  label="State/Province"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
                <Input
                  id="country"
                  label="Country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">Contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="phone"
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                id="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Active</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Inactive branches are hidden from selection</p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => router.push("/dashboard/branches")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Card>
      </form>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <h2 className="text-base font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Permanently delete this branch. This action cannot be undone.
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={handleDelete} className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
            Delete Branch
          </Button>
        </div>
      </Card>
    </div>
  );
}
