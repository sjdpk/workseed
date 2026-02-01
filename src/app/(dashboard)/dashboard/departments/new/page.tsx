"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Input, Select, useToast } from "@/components";
import type { Branch } from "@/types";

const ALLOWED_ROLES = ["ADMIN", "HR"];

export default function NewDepartmentPage() {
  const router = useRouter();
  const toast = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    branchId: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
    ]).then(([meData, branchesData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (branchesData.success) setBranches(branchesData.data.branches);
      setPageLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          branchId: formData.branchId || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to create department");
        return;
      }

      toast.success("Department created successfully");
      router.push("/dashboard/departments");
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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Add Department</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Create a new department</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-4">
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
              placeholder="e.g., ENG, HR, FIN"
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
            options={[
              { value: "", label: "Select Branch (Optional)" },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={formData.branchId}
            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Department"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
