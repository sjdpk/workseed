"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Select } from "@/components";
import type { Role, Branch } from "@/types";

interface User {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  status: string;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  createdAt: string;
}

interface CurrentUser {
  id: string;
  role: Role;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "EMPLOYEE" as Role,
    branchId: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "SUSPENDED",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (data.success) {
      setUsers(data.data.users);
    }
    setLoading(false);
  };

  const fetchBranches = async () => {
    const res = await fetch("/api/branches");
    const data = await res.json();
    if (data.success) {
      setBranches(data.data.branches);
    }
  };

  const fetchCurrentUser = async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (data.success) {
      setCurrentUser(data.data.user);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBranches();
    fetchCurrentUser();
  }, []);

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "EMPLOYEE",
      branchId: "",
      status: "ACTIVE",
    });
    setEditingUser(null);
    setFormError("");
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || "",
      role: user.role,
      branchId: user.branchId || "",
      status: user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update existing user
        const updatePayload: Record<string, unknown> = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || null,
        };

        if (formData.password) {
          updatePayload.password = formData.password;
        }

        // HR/Admin fields
        if (isHROrAbove(currentUser?.role)) {
          updatePayload.branchId = formData.branchId || null;
          updatePayload.role = formData.role;
          if (currentUser?.role === "ADMIN") {
            updatePayload.status = formData.status;
          }
        }

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        const data = await res.json();

        if (!data.success) {
          setFormError(data.error || "Failed to update user");
          return;
        }
      } else {
        // Create new user
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            branchId: formData.branchId || undefined,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          setFormError(data.error || "Failed to create user");
          return;
        }
      }

      setShowForm(false);
      resetForm();
      fetchUsers();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const isHROrAbove = (role?: string) => {
    return role === "ADMIN" || role === "HR";
  };

  const canEdit = (user: User) => {
    if (!currentUser) return false;
    // Can edit self or if HR/Admin
    return user.id === currentUser.id || isHROrAbove(currentUser.role);
  };

  const roleOptions = [
    { value: "EMPLOYEE", label: "Employee" },
    { value: "TEAM_LEAD", label: "Team Lead" },
    { value: "MANAGER", label: "Manager" },
    { value: "HR", label: "HR" },
    { value: "ADMIN", label: "Admin" },
  ];

  const statusOptions = [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "SUSPENDED", label: "Suspended" },
  ];

  const branchOptions = [
    { value: "", label: "Select Branch" },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];

  const isSelfEdit = editingUser?.id === currentUser?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Users
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage system users
          </p>
        </div>
        {isHROrAbove(currentUser?.role) && (
          <Button
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                resetForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
          >
            {showForm ? "Cancel" : "Add User"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            {editingUser ? "Edit User" : "Create New User"}
          </h2>
          {formError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="firstName"
                label="First Name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
              <Input
                id="lastName"
                label="Last Name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="email"
                type="email"
                label="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={!!editingUser}
              />
              <Input
                id="password"
                type="password"
                label={editingUser ? "New Password (leave empty to keep)" : "Password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required={!editingUser}
                placeholder={editingUser ? "••••••••" : ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                id="phone"
                label="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              {isHROrAbove(currentUser?.role) && !isSelfEdit && (
                <>
                  <Select
                    id="role"
                    label="Role"
                    options={roleOptions}
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as Role })
                    }
                  />
                  <Select
                    id="branch"
                    label="Branch"
                    options={branchOptions}
                    value={formData.branchId}
                    onChange={(e) =>
                      setFormData({ ...formData, branchId: e.target.value })
                    }
                  />
                  {currentUser?.role === "ADMIN" && editingUser && (
                    <Select
                      id="status"
                      label="Status"
                      options={statusOptions}
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED",
                        })
                      }
                    />
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editingUser
                    ? "Updating..."
                    : "Creating..."
                  : editingUser
                  ? "Update User"
                  : "Create User"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Branch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.employeeId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {user.branch?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          user.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : user.status === "SUSPENDED"
                            ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {canEdit(user) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
