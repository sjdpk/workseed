"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  designation?: string;
  email: string;
  department?: { id: string; name: string };
  team?: { id: string; name: string };
  managerId?: string;
  subordinates?: User[];
}

export default function OrgChartPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"hierarchy" | "department">("hierarchy");

  useEffect(() => {
    fetch("/api/users/org-chart")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUsers(data.data.users);
        }
        setLoading(false);
      });
  }, []);

  // Build hierarchy tree
  const buildHierarchy = (users: User[]) => {
    const userMap = new Map<string, User & { children: User[] }>();

    users.forEach((user) => {
      userMap.set(user.id, { ...user, children: [] });
    });

    const roots: (User & { children: User[] })[] = [];

    userMap.forEach((user) => {
      if (user.managerId && userMap.has(user.managerId)) {
        userMap.get(user.managerId)!.children.push(user);
      } else {
        roots.push(user);
      }
    });

    return roots;
  };

  // Group by department
  const groupByDepartment = (users: User[]) => {
    return users.reduce((acc, user) => {
      const deptName = user.department?.name || "No Department";
      if (!acc[deptName]) acc[deptName] = [];
      acc[deptName].push(user);
      return acc;
    }, {} as Record<string, User[]>);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "HR": return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
      case "MANAGER": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "TEAM_LEAD": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const PersonCard = ({ user, isRoot = false }: { user: User & { children?: User[] }; isRoot?: boolean }) => (
    <div className={`flex flex-col items-center ${isRoot ? "" : "mt-4"}`}>
      <div className={`rounded-lg border p-4 bg-white dark:bg-gray-800 ${
        isRoot ? "border-blue-300 dark:border-blue-700" : "border-gray-200 dark:border-gray-700"
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user.designation || user.role.replace("_", " ")}
            </p>
            <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
              {user.role.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Children */}
      {user.children && user.children.length > 0 && (
        <div className="relative mt-4">
          {/* Vertical line */}
          <div className="absolute left-1/2 -top-4 h-4 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Horizontal line if multiple children */}
          {user.children.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600" style={{
              left: `${100 / (user.children.length * 2)}%`,
              right: `${100 / (user.children.length * 2)}%`,
            }} />
          )}

          <div className="flex gap-6">
            {user.children.map((child) => (
              <div key={child.id} className="relative">
                {/* Vertical line to child */}
                <div className="absolute left-1/2 -top-4 h-4 w-px bg-gray-300 dark:bg-gray-600" />
                <PersonCard user={child as User & { children: User[] }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const hierarchy = buildHierarchy(users);
  const departments = groupByDepartment(users);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Organization Chart</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View company structure and reporting lines</p>
        </div>

        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <button
            onClick={() => setViewMode("hierarchy")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "hierarchy"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Hierarchy
          </button>
          <button
            onClick={() => setViewMode("department")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "department"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            By Department
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No employees found</p>
          </div>
        </Card>
      ) : viewMode === "hierarchy" ? (
        <Card className="overflow-x-auto">
          <div className="min-w-max p-4">
            <div className="flex flex-col items-center">
              {hierarchy.map((root) => (
                <PersonCard key={root.id} user={root} isRoot />
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(departments).sort(([a], [b]) => a.localeCompare(b)).map(([deptName, deptUsers]) => (
            <Card key={deptName}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{deptName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{deptUsers.length} members</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deptUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.designation || user.role.replace("_", " ")}
                      </p>
                      <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
