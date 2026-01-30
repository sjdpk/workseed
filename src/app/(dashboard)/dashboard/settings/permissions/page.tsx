"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components";

const ALLOWED_ROLES = ["ADMIN"];

interface PermissionSettings {
  // Visibility settings
  employeesCanViewTeamMembers: boolean;
  employeesCanViewDepartmentMembers: boolean;
  employeesCanViewAllEmployees: boolean;

  // Leave settings
  employeesCanViewTeamLeaves: boolean;
  employeesCanViewDepartmentLeaves: boolean;

  // Self-service settings
  employeesCanEditOwnProfile: boolean;
  employeesCanViewOwnDocuments: boolean;

  // Approval settings
  teamLeadCanApproveLeaves: boolean;
  managerCanApproveLeaves: boolean;
  hrCanApproveLeaves: boolean;

  // Feature access by role
  roleAccess: {
    users: string[];
    departments: string[];
    teams: string[];
    branches: string[];
    leaveTypes: string[];
    leaveRequests: string[];
    auditLogs: string[];
    reports: string[];
  };
}

const defaultPermissions: PermissionSettings = {
  employeesCanViewTeamMembers: true,
  employeesCanViewDepartmentMembers: false,
  employeesCanViewAllEmployees: false,

  employeesCanViewTeamLeaves: false,
  employeesCanViewDepartmentLeaves: false,

  employeesCanEditOwnProfile: true,
  employeesCanViewOwnDocuments: true,

  teamLeadCanApproveLeaves: true,
  managerCanApproveLeaves: true,
  hrCanApproveLeaves: true,

  roleAccess: {
    users: ["ADMIN", "HR"],
    departments: ["ADMIN", "HR"],
    teams: ["ADMIN", "HR"],
    branches: ["ADMIN", "HR"],
    leaveTypes: ["ADMIN", "HR"],
    leaveRequests: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"],
    auditLogs: ["ADMIN"],
    reports: ["ADMIN", "HR", "MANAGER"],
  },
};

const ALL_ROLES = ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"];

export default function PermissionsPage() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<PermissionSettings>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(([meData, orgData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (orgData.success && orgData.data.settings.permissions) {
        setPermissions({ ...defaultPermissions, ...orgData.data.settings.permissions });
      }
      setLoading(false);
    });
  }, [router]);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to save permissions");
        return;
      }

      setSuccess("Permissions saved successfully!");
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const toggleRoleAccess = (feature: keyof typeof permissions.roleAccess, role: string) => {
    const current = permissions.roleAccess[feature];
    const updated = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];

    // Ensure ADMIN always has access
    if (!updated.includes("ADMIN")) {
      updated.push("ADMIN");
    }

    setPermissions({
      ...permissions,
      roleAccess: {
        ...permissions.roleAccess,
        [feature]: updated,
      },
    });
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Permissions</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure role-based access and visibility settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">{success}</div>
      )}

      {/* Employee Visibility Settings */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Employee Visibility</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Control what employees can see about other employees</p>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.employeesCanViewTeamMembers}
              onChange={(e) => setPermissions({ ...permissions, employeesCanViewTeamMembers: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">View Team Members</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees can see other members in their team</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.employeesCanViewDepartmentMembers}
              onChange={(e) => setPermissions({ ...permissions, employeesCanViewDepartmentMembers: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">View Department Members</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees can see all members in their department</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.employeesCanViewAllEmployees}
              onChange={(e) => setPermissions({ ...permissions, employeesCanViewAllEmployees: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">View All Employees</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees can see the full employee directory</p>
            </div>
          </label>
        </div>
      </Card>

      {/* Leave Visibility Settings */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Leave Visibility</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Control who can see leave information</p>

        {/* Default Hierarchy Info */}
        <div className="mb-4 rounded bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Default Leave Viewing Hierarchy:</p>
          <ul className="mt-1 space-y-0.5 text-xs text-blue-700 dark:text-blue-400">
            <li>• <strong>Admin/HR:</strong> View all organization leave requests</li>
            <li>• <strong>Manager:</strong> View only their direct reports' leave requests</li>
            <li>• <strong>Team Lead:</strong> View their team members' leave requests</li>
          </ul>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.employeesCanViewTeamLeaves}
              onChange={(e) => setPermissions({ ...permissions, employeesCanViewTeamLeaves: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Employees View Team Leaves</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees can see approved leaves of their team members</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.employeesCanViewDepartmentLeaves}
              onChange={(e) => setPermissions({ ...permissions, employeesCanViewDepartmentLeaves: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Employees View Department Leaves</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees can see approved leaves of their department members</p>
            </div>
          </label>
        </div>
      </Card>

      {/* Leave Approval Settings */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Leave Approval</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Configure who can approve leave requests</p>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.teamLeadCanApproveLeaves}
              onChange={(e) => setPermissions({ ...permissions, teamLeadCanApproveLeaves: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Team Leads Can Approve</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Team leads can approve leave requests for their team</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.managerCanApproveLeaves}
              onChange={(e) => setPermissions({ ...permissions, managerCanApproveLeaves: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Managers Can Approve</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Managers can approve leave requests for their department</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.hrCanApproveLeaves}
              onChange={(e) => setPermissions({ ...permissions, hrCanApproveLeaves: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">HR Can Approve</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">HR can approve leave requests for all employees</p>
            </div>
          </label>
        </div>
      </Card>

      {/* Self-Service Settings */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Self-Service</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">What employees can do for themselves</p>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.employeesCanEditOwnProfile}
              onChange={(e) => setPermissions({ ...permissions, employeesCanEditOwnProfile: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Edit Own Profile</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees can update their personal information</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.employeesCanViewOwnDocuments}
              onChange={(e) => setPermissions({ ...permissions, employeesCanViewOwnDocuments: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">View Own Documents</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees can view their uploaded documents</p>
            </div>
          </label>
        </div>
      </Card>

      {/* Feature Access by Role */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Feature Access by Role</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Configure which roles can access each feature</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Feature</th>
                {ALL_ROLES.map((role) => (
                  <th key={role} className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    {role.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(permissions.roleAccess).map(([feature, roles]) => (
                <tr key={feature}>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {feature.replace(/([A-Z])/g, " $1").trim()}
                  </td>
                  {ALL_ROLES.map((role) => (
                    <td key={role} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={roles.includes(role)}
                        onChange={() => toggleRoleAccess(feature as keyof typeof permissions.roleAccess, role)}
                        disabled={role === "ADMIN"}
                        className="rounded border-gray-300 dark:border-gray-600 disabled:opacity-50"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Admin always has access to all features. Changes take effect immediately after saving.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
