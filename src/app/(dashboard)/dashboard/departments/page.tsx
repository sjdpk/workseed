"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  branch?: { id: string; name: string };
  _count: { users: number; teams: number };
}

interface CurrentUser {
  role: string;
}

const PERMISSIONS = {
  VIEW: ["ADMIN", "HR"],
  CREATE: ["ADMIN", "HR"],
};

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const hasPermission = (permission: keyof typeof PERMISSIONS) => {
    if (!currentUser) return false;
    return PERMISSIONS[permission].includes(currentUser.role);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/departments").then(r => r.json()),
    ]).then(([meData, deptData]) => {
      if (meData.success) {
        setCurrentUser(meData.data.user);
        if (!PERMISSIONS.VIEW.includes(meData.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
      }
      if (deptData.success) setDepartments(deptData.data.departments);
      setLoading(false);
    });
  }, [router]);

  const filteredDepartments = departments.filter((dept) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      dept.name.toLowerCase().includes(term) ||
      dept.code.toLowerCase().includes(term) ||
      dept.description?.toLowerCase().includes(term) ||
      dept.branch?.name?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!hasPermission("VIEW")) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Departments</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage organization departments</p>
        </div>
        {hasPermission("CREATE") && (
          <Button onClick={() => router.push("/dashboard/departments/new")}>Add Department</Button>
        )}
      </div>

      <Card className="p-3">
        <Input
          id="search"
          placeholder="Search by name, code, or branch..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      {filteredDepartments.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">No departments found</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments.map((dept) => (
            <Card key={dept.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{dept.code}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/departments/${dept.id}`)}
                >
                  Edit
                </Button>
              </div>
              {dept.description && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{dept.description}</p>}
              <div className="mt-3 flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span>{dept._count.users} employees</span>
                <span>{dept._count.teams} teams</span>
              </div>
              {dept.branch && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Branch: {dept.branch.name}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
