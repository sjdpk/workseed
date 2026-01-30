"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@/components";

interface Department {
  id: string;
  name: string;
}

export default function NewTeamPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    departmentId: "",
  });

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDepartments(data.data.departments);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to create team");
        return;
      }

      router.push("/dashboard/teams");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Add Team</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Create a new team</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="name" label="Team Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input id="code" label="Code *" placeholder="e.g., FRONTEND, BACKEND" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
          </div>
          <Input id="description" label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <Select id="department" label="Department *" options={[{ value: "", label: "Select Department" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} required />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Team"}</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
