"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Select } from "@/components";
import type { Branch } from "@/types";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  branch?: { id: string; name: string };
  _count: { users: number; teams: number };
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    branchId: "",
  });

  const fetchData = async () => {
    const [deptRes, branchRes] = await Promise.all([
      fetch("/api/departments").then(r => r.json()),
      fetch("/api/branches").then(r => r.json()),
    ]);

    if (deptRes.success) setDepartments(deptRes.data.departments);
    if (branchRes.success) setBranches(branchRes.data.branches);
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
        setError(data.error || "Failed to create department");
        return;
      }

      setShowForm(false);
      setFormData({ name: "", code: "", description: "", branchId: "" });
      fetchData();
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Departments</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage organization departments</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Department"}</Button>
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Create Department</h2>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="name" label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <Input id="code" label="Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
            </div>
            <Input id="description" label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <Select id="branch" label="Branch" options={[{ value: "", label: "Select Branch" }, ...branches.map(b => ({ value: b.id, label: b.name }))]} value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Department"}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{dept.code}</span>
              </div>
            </div>
            {dept.description && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{dept.description}</p>
            )}
            <div className="mt-3 flex gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span>{dept._count.users} employees</span>
              <span>{dept._count.teams} teams</span>
            </div>
            {dept.branch && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Branch: {dept.branch.name}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
