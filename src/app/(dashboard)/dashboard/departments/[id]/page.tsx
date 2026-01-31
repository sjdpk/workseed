"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, useToast } from "@/components";

interface Branch {
  id: string;
  name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const ALLOWED_ROLES = ["ADMIN", "HR"];

export default function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [deptUsers, setDeptUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    branchId: "",
    headId: "",
    isActive: true,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch(`/api/departments/${id}`).then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
      fetch(`/api/users?departmentId=${id}&limit=100`).then((r) => r.json()),
    ]).then(([meData, deptData, branchData, usersData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (deptData.success) {
        const dept = deptData.data.department;
        setFormData({
          name: dept.name,
          code: dept.code,
          description: dept.description || "",
          branchId: dept.branchId || "",
          headId: dept.headId || "",
          isActive: dept.isActive,
        });
      }
      if (branchData.success) setBranches(branchData.data.branches);
      if (usersData.success) setDeptUsers(usersData.data.users);
      setPageLoading(false);
    });
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          branchId: formData.branchId || null,
          headId: formData.headId || null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to update department");
        return;
      }

      toast.success("Department updated successfully");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this department? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to delete department");
        return;
      }

      toast.success("Department deleted successfully");
      router.push("/dashboard/departments");
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

  // Filter potential heads (MANAGER or TEAM_LEAD roles)
  const potentialHeads = deptUsers.filter((u) => ["MANAGER", "TEAM_LEAD", "HR"].includes(u.role));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Department</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Update department details</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/departments")}>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Department Information</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="name"
              label="Department Name *"
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

          <Input
            id="description"
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <Select
            id="branch"
            label="Branch"
            options={[{ value: "", label: "No Branch" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
            value={formData.branchId}
            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
          />

          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Department Head</h2>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Assign a department head who will oversee this department.
            </p>

            {deptUsers.length === 0 ? (
              <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                No users in this department. Add employees first before assigning a department head.
              </div>
            ) : potentialHeads.length === 0 ? (
              <Select
                id="headId"
                label="Department Head"
                options={[
                  { value: "", label: "No Head Assigned (System Managed)" },
                  ...deptUsers.map((u) => ({
                    value: u.id,
                    label: `${u.firstName} ${u.lastName} (${u.role.replace("_", " ")})`,
                  })),
                ]}
                value={formData.headId}
                onChange={(e) => setFormData({ ...formData, headId: e.target.value })}
              />
            ) : (
              <Select
                id="headId"
                label="Department Head"
                options={[
                  { value: "", label: "No Head Assigned (System Managed)" },
                  ...potentialHeads.map((u) => ({
                    value: u.id,
                    label: `${u.firstName} ${u.lastName} (${u.role.replace("_", " ")})`,
                  })),
                ]}
                value={formData.headId}
                onChange={(e) => setFormData({ ...formData, headId: e.target.value })}
              />
            )}
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
                <p className="text-xs text-gray-500 dark:text-gray-400">Inactive departments are hidden from selection</p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => router.push("/dashboard/departments")}>
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
          Permanently delete this department. This action cannot be undone.
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={handleDelete} className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
            Delete Department
          </Button>
        </div>
      </Card>
    </div>
  );
}
