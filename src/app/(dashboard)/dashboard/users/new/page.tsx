"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, useToast } from "@/components";
import type { Branch, Department, Team, Role, Gender, MaritalStatus, EmploymentType } from "@/types";

const ALLOWED_ROLES = ["ADMIN", "HR"];

export default function NewUserPage() {
  const router = useRouter();
  const toast = useToast();
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [managers, setManagers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    employeeId: "",
    phone: "",
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

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/branches").then(r => r.json()),
      fetch("/api/departments").then(r => r.json()),
      fetch("/api/teams").then(r => r.json()),
      fetch("/api/users?limit=100").then(r => r.json()),
    ]).then(([meData, branchesData, deptData, teamsData, usersData]) => {
      // Check permission
      if (meData.success) {
        if (!ALLOWED_ROLES.includes(meData.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
        setCurrentUserRole(meData.data.user.role);
      }
      if (branchesData.success) setBranches(branchesData.data.branches);
      if (deptData.success) setDepartments(deptData.data.departments);
      if (teamsData.success) setTeams(teamsData.data.teams);
      if (usersData.success) setManagers(usersData.data.users.filter((u: { role: string }) =>
        ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"].includes(u.role)
      ));
      setPageLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        employeeId: formData.employeeId || undefined, // Auto-generate if empty
        status: formData.status,
        gender: formData.gender || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        branchId: formData.branchId || undefined,
        departmentId: formData.departmentId || undefined,
        teamId: formData.teamId || undefined,
        managerId: formData.managerId || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        joiningDate: formData.joiningDate || undefined,
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to create user");
        return;
      }

      toast.success("User created successfully");
      router.push("/dashboard/users");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Only ADMIN can assign ADMIN or HR roles
  const roleOptions = [
    { value: "EMPLOYEE", label: "Employee" },
    { value: "TEAM_LEAD", label: "Team Lead" },
    { value: "MANAGER", label: "Manager" },
    ...(currentUserRole === "ADMIN" ? [
      { value: "HR", label: "HR" },
      { value: "ADMIN", label: "Admin" },
    ] : []),
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

  const statusOptions = [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "SUSPENDED", label: "Suspended" },
  ];

  if (pageLoading) {
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Add New User</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Create a new employee account</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Account Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="email" type="email" label="Email *" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            <Input id="password" type="password" label="Password *" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
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
            <Input id="employeeId" label="Employee ID" placeholder="Auto-generated if empty" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })} />
            <Select id="role" label="Role *" options={roleOptions} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })} />
            <div>
              <Select id="status" label="Status" options={statusOptions} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} disabled={currentUserRole !== "ADMIN"} />
              {currentUserRole !== "ADMIN" && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Only Admin can set status</p>
              )}
            </div>
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
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create User"}</Button>
        </div>
      </form>
    </div>
  );
}
