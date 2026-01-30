"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input, Select } from "@/components";

const ALLOWED_ROLES = ["ADMIN", "HR"];

interface User {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
  defaultDays: number;
  color?: string;
}

interface Allocation {
  id: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  year: number;
  allocated: number;
  used: number;
  carriedOver: number;
  adjusted: number;
  balance: number;
  notes?: string;
}

export default function LeaveAllocationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId");

  const [users, setUsers] = useState<User[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(userIdParam || "");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/users?limit=500").then((r) => r.json()),
      fetch("/api/leave-types").then((r) => r.json()),
    ]).then(([meData, usersData, leaveTypesData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (usersData.success) setUsers(usersData.data.users);
      if (leaveTypesData.success) setLeaveTypes(leaveTypesData.data.leaveTypes);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (selectedUserId) {
      fetchAllocations();
    }
  }, [selectedUserId, selectedYear]);

  const fetchAllocations = async () => {
    const res = await fetch(`/api/leave-allocations?userId=${selectedUserId}&year=${selectedYear}`);
    const data = await res.json();
    if (data.success) {
      setAllocations(data.data.allocations);
    }
  };

  const handleUpdateAllocation = async (allocationId: string, field: string, value: number | string) => {
    setError("");
    setSuccess("");
    setSaving(allocationId);

    try {
      const res = await fetch(`/api/leave-allocations/${allocationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to update allocation");
        return;
      }

      setSuccess("Allocation updated successfully");
      fetchAllocations();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(null);
    }
  };

  const handleCreateAllocation = async (leaveTypeId: string, allocated: number) => {
    setError("");
    setSuccess("");
    setSaving(leaveTypeId);

    try {
      const res = await fetch("/api/leave-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          leaveTypeId,
          year: selectedYear,
          allocated,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to create allocation");
        return;
      }

      setSuccess("Allocation created successfully");
      fetchAllocations();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      searchTerm === "" ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Get missing leave types (not yet allocated)
  const allocatedTypeIds = allocations.map((a) => a.leaveTypeId);
  const missingLeaveTypes = leaveTypes.filter((lt) => !allocatedTypeIds.includes(lt.id));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leave Allocations</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage user-specific leave allocations</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">{success}</div>
      )}

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Search User</label>
            <Input
              id="search"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Select User *</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select User</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.employeeId})
                </option>
              ))}
            </select>
          </div>
          <Select
            id="year"
            label="Year"
            options={yearOptions}
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          />
        </div>
      </Card>

      {selectedUserId && (
        <>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {selectedUser?.firstName} {selectedUser?.lastName}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Leave allocations for {selectedYear}</p>
              </div>
            </div>

            {allocations.length === 0 && missingLeaveTypes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No leave types available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Leave Type</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Allocated</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Used</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Adjusted</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {allocations.map((alloc) => (
                      <tr key={alloc.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-1 rounded-full" style={{ backgroundColor: alloc.leaveType?.color || "#3B82F6" }} />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{alloc.leaveType?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={alloc.allocated}
                            onChange={(e) => handleUpdateAllocation(alloc.id, "allocated", parseFloat(e.target.value) || 0)}
                            disabled={saving === alloc.id}
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-center text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">{alloc.used}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            step="0.5"
                            value={alloc.adjusted}
                            onChange={(e) => handleUpdateAllocation(alloc.id, "adjusted", parseFloat(e.target.value) || 0)}
                            disabled={saving === alloc.id}
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-center text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${alloc.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {alloc.balance}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={alloc.notes || ""}
                            onChange={(e) => handleUpdateAllocation(alloc.id, "notes", e.target.value)}
                            disabled={saving === alloc.id}
                            placeholder="Add note..."
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </td>
                      </tr>
                    ))}
                    {/* Show missing leave types */}
                    {missingLeaveTypes.map((lt) => (
                      <tr key={lt.id} className="bg-gray-50 dark:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-1 rounded-full" style={{ backgroundColor: lt.color || "#3B82F6" }} />
                            <span className="text-sm text-gray-500 dark:text-gray-400">{lt.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            defaultValue={lt.defaultDays}
                            disabled={saving === lt.id}
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-center text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            id={`new-${lt.id}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-400">-</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-400">-</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-400">-</td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            disabled={saving === lt.id}
                            onClick={() => {
                              const input = document.getElementById(`new-${lt.id}`) as HTMLInputElement;
                              handleCreateAllocation(lt.id, parseFloat(input.value) || lt.defaultDays);
                            }}
                          >
                            {saving === lt.id ? "Adding..." : "Add"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">How it works</h3>
            <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li><strong>Allocated:</strong> Total days given to the employee for this year</li>
              <li><strong>Used:</strong> Days already used (automatically calculated from approved leaves)</li>
              <li><strong>Adjusted:</strong> Manual adjustments (+/-) for special cases (joining mid-year, bonus leaves, etc.)</li>
              <li><strong>Balance:</strong> Allocated + Adjusted - Used</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
