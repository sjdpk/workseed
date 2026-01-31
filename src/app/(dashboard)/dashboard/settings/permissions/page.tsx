"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, useToast } from "@/components";

const ALLOWED_ROLES = ["ADMIN"];

interface Department {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  department?: { name: string };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

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
  showOwnAssetsToEmployee: boolean;

  // Approval settings
  teamLeadCanApproveLeaves: boolean;
  managerCanApproveLeaves: boolean;
  hrCanApproveLeaves: boolean;

  // Attendance settings
  onlineAttendance: {
    enabled: boolean;
    scope: "all" | "department" | "team" | "specific";
    departmentIds: string[];
    teamIds: string[];
    userIds: string[];
  };

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
  showOwnAssetsToEmployee: true,

  teamLeadCanApproveLeaves: true,
  managerCanApproveLeaves: true,
  hrCanApproveLeaves: true,

  onlineAttendance: {
    enabled: false,
    scope: "all",
    departmentIds: [],
    teamIds: [],
    userIds: [],
  },

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
  const toast = useToast();
  const [permissions, setPermissions] = useState<PermissionSettings>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([meData, orgData, deptData, teamData, userData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }

      if (deptData.success) setDepartments(deptData.data.departments || []);
      if (teamData.success) setTeams(teamData.data.teams || []);
      if (userData.success) setUsers(userData.data.users || []);
      if (orgData.success && orgData.data.settings.permissions) {
        setPermissions({ ...defaultPermissions, ...orgData.data.settings.permissions });
      }
      setLoading(false);
    });
  }, [router]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to save permissions");
        return;
      }

      toast.success("Permissions saved successfully");
    } catch {
      toast.error("Something went wrong");
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Permissions</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure role-based access and visibility settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

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
        <div className="mb-4 rounded bg-gray-50 p-3 dark:bg-gray-800">
          <p className="text-xs font-medium text-gray-800 dark:text-gray-300">Default Leave Viewing Hierarchy:</p>
          <ul className="mt-1 space-y-0.5 text-xs text-gray-700 dark:text-gray-400">
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

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.showOwnAssetsToEmployee}
              onChange={(e) => setPermissions({ ...permissions, showOwnAssetsToEmployee: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">View Own Assets</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees can see company assets assigned to them</p>
            </div>
          </label>
        </div>
      </Card>

      {/* Online Attendance */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Online Attendance</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Allow employees to check-in/check-out from web and mobile app
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={permissions.onlineAttendance.enabled}
              onChange={(e) =>
                setPermissions({
                  ...permissions,
                  onlineAttendance: { ...permissions.onlineAttendance, enabled: e.target.checked },
                })
              }
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Enable Online Check-in/Check-out</span>
            </div>
          </label>

          {permissions.onlineAttendance.enabled && (
            <div className="ml-7 space-y-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Available for:</p>
              <div className="space-y-2">
                {[
                  { value: "all", label: "All Employees" },
                  { value: "department", label: "Specific Departments" },
                  { value: "team", label: "Specific Teams" },
                  { value: "specific", label: "Specific Employees" },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="attendanceScope"
                      value={option.value}
                      checked={permissions.onlineAttendance.scope === option.value}
                      onChange={(e) =>
                        setPermissions({
                          ...permissions,
                          onlineAttendance: {
                            ...permissions.onlineAttendance,
                            scope: e.target.value as "all" | "department" | "team" | "specific",
                          },
                        })
                      }
                      className="border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>

              {/* Selection Button */}
              {permissions.onlineAttendance.scope !== "all" && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowSelector(true)}
                    className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Select {permissions.onlineAttendance.scope === "department" ? "Departments" : permissions.onlineAttendance.scope === "team" ? "Teams" : "Employees"}
                    {permissions.onlineAttendance.scope === "department" && permissions.onlineAttendance.departmentIds.length > 0 && (
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-gray-900">
                        {permissions.onlineAttendance.departmentIds.length}
                      </span>
                    )}
                    {permissions.onlineAttendance.scope === "team" && permissions.onlineAttendance.teamIds.length > 0 && (
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-gray-900">
                        {permissions.onlineAttendance.teamIds.length}
                      </span>
                    )}
                    {permissions.onlineAttendance.scope === "specific" && permissions.onlineAttendance.userIds.length > 0 && (
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-gray-900">
                        {permissions.onlineAttendance.userIds.length}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
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

      {/* Selection Sidebar */}
      {showSelector && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowSelector(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl dark:bg-gray-900">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Select {permissions.onlineAttendance.scope === "department" ? "Departments" : permissions.onlineAttendance.scope === "team" ? "Teams" : "Employees"}
                </h2>
                <button
                  onClick={() => setShowSelector(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Department List */}
                {permissions.onlineAttendance.scope === "department" && (
                  <div className="space-y-1">
                    {departments.map((dept) => (
                      <label
                        key={dept.id}
                        className="flex items-center gap-3 rounded px-2 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={permissions.onlineAttendance.departmentIds.includes(dept.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...permissions.onlineAttendance.departmentIds, dept.id]
                              : permissions.onlineAttendance.departmentIds.filter((id) => id !== dept.id);
                            setPermissions({
                              ...permissions,
                              onlineAttendance: { ...permissions.onlineAttendance, departmentIds: ids },
                            });
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{dept.name}</span>
                      </label>
                    ))}
                    {departments.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No departments found</p>
                    )}
                  </div>
                )}

                {/* Team List */}
                {permissions.onlineAttendance.scope === "team" && (
                  <div className="space-y-1">
                    {teams.map((team) => (
                      <label
                        key={team.id}
                        className="flex items-center gap-3 rounded px-2 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={permissions.onlineAttendance.teamIds.includes(team.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...permissions.onlineAttendance.teamIds, team.id]
                              : permissions.onlineAttendance.teamIds.filter((id) => id !== team.id);
                            setPermissions({
                              ...permissions,
                              onlineAttendance: { ...permissions.onlineAttendance, teamIds: ids },
                            });
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <div>
                          <span className="text-sm text-gray-900 dark:text-white">{team.name}</span>
                          {team.department && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({team.department.name})</span>
                          )}
                        </div>
                      </label>
                    ))}
                    {teams.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No teams found</p>
                    )}
                  </div>
                )}

                {/* Employee List */}
                {permissions.onlineAttendance.scope === "specific" && (
                  <div className="space-y-1">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 rounded px-2 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={permissions.onlineAttendance.userIds.includes(user.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...permissions.onlineAttendance.userIds, user.id]
                              : permissions.onlineAttendance.userIds.filter((id) => id !== user.id);
                            setPermissions({
                              ...permissions,
                              onlineAttendance: { ...permissions.onlineAttendance, userIds: ids },
                            });
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                          <span className="text-gray-400 dark:text-gray-500 ml-1">({user.employeeId})</span>
                        </span>
                      </label>
                    ))}
                    {users.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No employees found</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <Button onClick={() => setShowSelector(false)} className="w-full">
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
