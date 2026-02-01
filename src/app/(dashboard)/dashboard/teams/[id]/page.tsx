"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { Button, Card, Input, Select, useToast } from "@/components";

interface Department {
  id: string;
  name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface _Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  departmentId: string;
  leadId?: string;
  isActive: boolean;
}

const ALLOWED_ROLES = ["ADMIN", "HR"];

export default function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    departmentId: "",
    leadId: "",
    isActive: true,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch(`/api/teams/${id}`).then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch(`/api/users?teamId=${id}&limit=100`).then((r) => r.json()),
    ]).then(([meData, teamData, deptData, usersData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (teamData.success) {
        const team = teamData.data.team;
        setFormData({
          name: team.name,
          code: team.code,
          description: team.description || "",
          departmentId: team.departmentId,
          leadId: team.leadId || "",
          isActive: team.isActive,
        });
      }
      if (deptData.success) setDepartments(deptData.data.departments);
      if (usersData.success) setTeamMembers(usersData.data.users);
      setPageLoading(false);
    });
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          leadId: formData.leadId || null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to update team");
        return;
      }

      toast.success("Team updated successfully");
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

  // Filter potential team leads (TEAM_LEAD or MANAGER roles, or any team member)
  const _potentialLeads = teamMembers.filter(
    (u) => ["TEAM_LEAD", "MANAGER"].includes(u.role) || teamMembers.length <= 5
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Team</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Update team details and assign team lead
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/teams")}>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Team Information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="name"
              label="Team Name *"
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
            id="department"
            label="Department *"
            options={[
              { value: "", label: "Select Department" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            required
          />

          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Team Lead
            </h2>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Assign a team lead who will manage this team and approve leave requests.
            </p>

            {teamMembers.length === 0 ? (
              <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                No team members found. Add employees to this team first before assigning a team
                lead.
              </div>
            ) : (
              <Select
                id="leadId"
                label="Team Lead"
                options={[
                  { value: "", label: "No Team Lead Assigned" },
                  ...teamMembers.map((u) => ({
                    value: u.id,
                    label: `${u.firstName} ${u.lastName} (${u.role.replace("_", " ")})`,
                  })),
                ]}
                value={formData.leadId}
                onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Inactive teams are hidden from selection
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => router.push("/dashboard/teams")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Card>
      </form>

      {/* Team Members List */}
      {teamMembers.length > 0 && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            Team Members ({teamMembers.length})
          </h2>
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between rounded border p-3 ${
                  member.id === formData.leadId
                    ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {member.firstName[0]}
                    {member.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {member.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
                {member.id === formData.leadId && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Team Lead
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
