"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@/components";
import type { Branch, Department, Team, Role, Gender, MaritalStatus, EmploymentType, LeaveType } from "@/types";

const ALLOWED_ROLES = ["ADMIN", "HR"];

interface UserData {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  status: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  employmentType: EmploymentType;
  joiningDate?: string;
  designation?: string;
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
}

interface CurrentUser {
  id: string;
  role: string;
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

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [managers, setManagers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAllocation, setSavingAllocation] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    role: "EMPLOYEE" as Role,
    status: "ACTIVE",
    dateOfBirth: "",
    gender: "" as Gender | "",
    maritalStatus: "" as MaritalStatus | "",
    nationality: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    emergencyContact: "",
    emergencyContactPhone: "",
    employmentType: "FULL_TIME" as EmploymentType,
    joiningDate: "",
    designation: "",
    branchId: "",
    departmentId: "",
    teamId: "",
    managerId: "",
  });

  const fetchAllocations = async () => {
    const res = await fetch(`/api/leave-allocations?userId=${id}&year=${selectedYear}`);
    const data = await res.json();
    if (data.success) {
      setAllocations(data.data.allocations);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch(`/api/users/${id}`).then(r => r.json()),
      fetch("/api/branches").then(r => r.json()),
      fetch("/api/departments").then(r => r.json()),
      fetch("/api/teams").then(r => r.json()),
      fetch("/api/users?limit=100").then(r => r.json()),
      fetch("/api/leave-types").then(r => r.json()),
      fetch(`/api/leave-allocations?userId=${id}&year=${selectedYear}`).then(r => r.json()),
    ]).then(([meData, userData, branchesData, deptData, teamsData, usersData, leaveTypesData, allocData]) => {
      if (meData.success) {
        setCurrentUser(meData.data.user);
        if (!ALLOWED_ROLES.includes(meData.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
      }
      if (userData.success) {
        const u = userData.data.user;
        setUser(u);
        setFormData({
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          phone: u.phone || "",
          password: "",
          role: u.role,
          status: u.status,
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split("T")[0] : "",
          gender: u.gender || "",
          maritalStatus: u.maritalStatus || "",
          nationality: u.nationality || "",
          address: u.address || "",
          city: u.city || "",
          state: u.state || "",
          country: u.country || "",
          postalCode: u.postalCode || "",
          emergencyContact: u.emergencyContact || "",
          emergencyContactPhone: u.emergencyContactPhone || "",
          employmentType: u.employmentType || "FULL_TIME",
          joiningDate: u.joiningDate ? u.joiningDate.split("T")[0] : "",
          designation: u.designation || "",
          branchId: u.branchId || "",
          departmentId: u.departmentId || "",
          teamId: u.teamId || "",
          managerId: u.managerId || "",
        });
      }
      if (branchesData.success) setBranches(branchesData.data.branches);
      if (deptData.success) setDepartments(deptData.data.departments);
      if (teamsData.success) setTeams(teamsData.data.teams);
      if (usersData.success) setManagers(usersData.data.users.filter((u: { id: string; role: string }) =>
        ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"].includes(u.role) && u.id !== id
      ));
      if (leaveTypesData.success) setLeaveTypes(leaveTypesData.data.leaveTypes);
      if (allocData.success) setAllocations(allocData.data.allocations);
      setLoading(false);
    });
  }, [id, router]);

  useEffect(() => {
    if (!loading && id) {
      fetchAllocations();
    }
  }, [selectedYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        postalCode: formData.postalCode || null,
        emergencyContact: formData.emergencyContact || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      payload.role = formData.role;
      payload.status = formData.status;
      payload.dateOfBirth = formData.dateOfBirth || null;
      payload.gender = formData.gender || null;
      payload.maritalStatus = formData.maritalStatus || null;
      payload.nationality = formData.nationality || null;
      payload.employmentType = formData.employmentType;
      payload.joiningDate = formData.joiningDate || null;
      payload.designation = formData.designation || null;
      payload.branchId = formData.branchId || null;
      payload.departmentId = formData.departmentId || null;
      payload.teamId = formData.teamId || null;
      payload.managerId = formData.managerId || null;

      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to update user");
        return;
      }

      setSuccess("User updated successfully!");
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAllocation = async (allocationId: string, field: string, value: number | string) => {
    setSavingAllocation(allocationId);
    try {
      const res = await fetch(`/api/leave-allocations/${allocationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAllocations();
      }
    } finally {
      setSavingAllocation(null);
    }
  };

  const handleCreateAllocation = async (leaveTypeId: string, allocated: number) => {
    setSavingAllocation(leaveTypeId);
    try {
      const res = await fetch("/api/leave-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: id,
          leaveTypeId,
          year: selectedYear,
          allocated,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAllocations();
      }
    } finally {
      setSavingAllocation(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || !currentUser || !ALLOWED_ROLES.includes(currentUser.role)) {
    return <div className="p-8 text-center text-gray-500">User not found</div>;
  }

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

  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
  ];

  const maritalOptions = [
    { value: "", label: "Select Status" },
    { value: "SINGLE", label: "Single" },
    { value: "MARRIED", label: "Married" },
    { value: "DIVORCED", label: "Divorced" },
    { value: "WIDOWED", label: "Widowed" },
  ];

  const employmentOptions = [
    { value: "FULL_TIME", label: "Full Time" },
    { value: "PART_TIME", label: "Part Time" },
    { value: "CONTRACT", label: "Contract" },
    { value: "INTERN", label: "Intern" },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  // Get missing leave types
  const allocatedTypeIds = allocations.map((a) => a.leaveTypeId);
  const missingLeaveTypes = leaveTypes.filter((lt) => !allocatedTypeIds.includes(lt.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Edit User</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{user.firstName} {user.lastName} ({user.employeeId})</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Account Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="email" type="email" label="Email" value={user.email} disabled />
            <Input id="password" type="password" label="New Password (leave empty to keep)" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select id="role" label="Role" options={roleOptions} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })} />
            <Select id="status" label="Status" options={statusOptions} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Personal Information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input id="firstName" label="First Name *" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            <Input id="lastName" label="Last Name *" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
            <Input id="phone" label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input id="dateOfBirth" type="date" label="Date of Birth" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            <Select id="gender" label="Gender" options={genderOptions} value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })} />
            <Select id="maritalStatus" label="Marital Status" options={maritalOptions} value={formData.maritalStatus} onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as MaritalStatus })} />
            <Input id="nationality" label="Nationality" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input id="address" label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <Input id="city" label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            <Input id="state" label="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
            <Input id="country" label="Country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
            <Input id="postalCode" label="Postal Code" value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Emergency Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="emergencyContact" label="Contact Name" value={formData.emergencyContact} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} />
            <Input id="emergencyContactPhone" label="Contact Phone" value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Employment Details</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select id="employmentType" label="Employment Type" options={employmentOptions} value={formData.employmentType} onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as EmploymentType })} />
            <Input id="designation" label="Designation" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} />
            <Input id="joiningDate" type="date" label="Joining Date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} />
            <Select id="branch" label="Branch" options={[{ value: "", label: "Select Branch" }, ...branches.map(b => ({ value: b.id, label: b.name }))]} value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })} />
            <Select id="department" label="Department" options={[{ value: "", label: "Select Department" }, ...departments.map(d => ({ value: d.id, label: d.name }))]} value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} />
            <Select id="team" label="Team" options={[{ value: "", label: "Select Team" }, ...teams.map(t => ({ value: t.id, label: t.name }))]} value={formData.teamId} onChange={(e) => setFormData({ ...formData, teamId: e.target.value })} />
            <Select id="manager" label="Reporting Manager" options={[{ value: "", label: "Select Manager" }, ...managers.map(m => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))]} value={formData.managerId} onChange={(e) => setFormData({ ...formData, managerId: e.target.value })} />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>

      {/* Leave Allocations Section */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Leave Allocations</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage leave balance for this employee</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            {yearOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Leave Type</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Allocated</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Used</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Adjust</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Balance</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {allocations.map((alloc) => (
                <tr key={alloc.id}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-1 rounded-full" style={{ backgroundColor: alloc.leaveType?.color || "#3B82F6" }} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{alloc.leaveType?.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={alloc.allocated}
                      onChange={(e) => handleUpdateAllocation(alloc.id, "allocated", parseFloat(e.target.value) || 0)}
                      disabled={savingAllocation === alloc.id}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-sm text-gray-600 dark:text-gray-300">{alloc.used}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      step="0.5"
                      value={alloc.adjusted}
                      onChange={(e) => handleUpdateAllocation(alloc.id, "adjusted", parseFloat(e.target.value) || 0)}
                      disabled={savingAllocation === alloc.id}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-sm font-medium ${alloc.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {alloc.balance}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={alloc.notes || ""}
                      onChange={(e) => handleUpdateAllocation(alloc.id, "notes", e.target.value)}
                      disabled={savingAllocation === alloc.id}
                      placeholder="Note..."
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </td>
                </tr>
              ))}
              {missingLeaveTypes.map((lt) => (
                <tr key={lt.id} className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-1 rounded-full" style={{ backgroundColor: lt.color || "#3B82F6" }} />
                      <span className="text-sm text-gray-500 dark:text-gray-400">{lt.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      defaultValue={lt.defaultDays}
                      id={`new-alloc-${lt.id}`}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-sm text-gray-400">-</td>
                  <td className="px-3 py-2 text-center text-sm text-gray-400">-</td>
                  <td className="px-3 py-2 text-center text-sm text-gray-400">-</td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      disabled={savingAllocation === lt.id}
                      onClick={() => {
                        const input = document.getElementById(`new-alloc-${lt.id}`) as HTMLInputElement;
                        handleCreateAllocation(lt.id, parseFloat(input.value) || lt.defaultDays);
                      }}
                    >
                      {savingAllocation === lt.id ? "..." : "Add"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <strong>Tip:</strong> For mid-year joiners, reduce &quot;Allocated&quot; or use negative &quot;Adjust&quot; value. Balance = Allocated + Adjust - Used
        </p>
      </Card>
    </div>
  );
}
