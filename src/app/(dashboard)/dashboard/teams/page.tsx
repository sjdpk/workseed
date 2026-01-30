"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Select } from "@/components";

interface Department {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  department?: { id: string; name: string };
  _count: { users: number };
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    departmentId: "",
  });

  const fetchData = async () => {
    const [teamRes, deptRes] = await Promise.all([
      fetch("/api/teams").then(r => r.json()),
      fetch("/api/departments").then(r => r.json()),
    ]);

    if (teamRes.success) setTeams(teamRes.data.teams);
    if (deptRes.success) setDepartments(deptRes.data.departments);
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

      setShowForm(false);
      setFormData({ name: "", code: "", description: "", departmentId: "" });
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Teams</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage organization teams</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Team"}</Button>
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Create Team</h2>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="name" label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <Input id="code" label="Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
            </div>
            <Input id="description" label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <Select id="department" label="Department *" options={[{ value: "", label: "Select Department" }, ...departments.map(d => ({ value: d.id, label: d.name }))]} value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} required />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Team"}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{team.code}</span>
              </div>
            </div>
            {team.description && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{team.description}</p>
            )}
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              {team._count.users} members
            </div>
            {team.department && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Department: {team.department.name}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
