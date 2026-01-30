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
}

interface TreeNode extends User {
  children: TreeNode[];
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
  const buildHierarchy = (users: User[]): TreeNode[] => {
    const userMap = new Map<string, TreeNode>();

    users.forEach((user) => {
      userMap.set(user.id, { ...user, children: [] });
    });

    const roots: TreeNode[] = [];

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN": return { bg: "bg-purple-500", light: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" };
      case "HR": return { bg: "bg-pink-500", light: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" };
      case "MANAGER": return { bg: "bg-blue-500", light: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
      case "TEAM_LEAD": return { bg: "bg-green-500", light: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };
      default: return { bg: "bg-gray-500", light: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
    }
  };

  // Tree Node Component with proper connectors
  const TreeNodeCard = ({ node, isLast = false, level = 0 }: { node: TreeNode; isLast?: boolean; level?: number }) => {
    const roleColor = getRoleColor(node.role);
    const hasChildren = node.children.length > 0;

    return (
      <div className="flex flex-col items-center">
        {/* The person card */}
        <div className="relative">
          <div className="flex items-center gap-3 rounded border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 min-w-[200px]">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${roleColor.bg} text-sm font-semibold text-white`}>
              {node.firstName[0]}{node.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {node.firstName} {node.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {node.designation || node.role.replace("_", " ")}
              </p>
              {node.team && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {node.team.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Children with connectors */}
        {hasChildren && (
          <div className="flex flex-col items-center">
            {/* Vertical line down from parent */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

            {/* Horizontal connector bar for multiple children */}
            {node.children.length > 1 && (
              <div className="relative w-full flex justify-center">
                <div
                  className="h-px bg-gray-300 dark:bg-gray-600"
                  style={{
                    width: `calc(100% - ${100 / node.children.length}%)`,
                  }}
                />
              </div>
            )}

            {/* Children row */}
            <div className="flex gap-8">
              {node.children.map((child, idx) => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Vertical line down to child */}
                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                  <TreeNodeCard
                    node={child}
                    isLast={idx === node.children.length - 1}
                    level={level + 1}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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

        <div className="flex rounded border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => setViewMode("hierarchy")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "hierarchy"
                ? "bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Hierarchy
          </button>
          <button
            onClick={() => setViewMode("department")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "department"
                ? "bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            By Department
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No employees found</p>
          </div>
        </Card>
      ) : viewMode === "hierarchy" ? (
        <Card className="overflow-x-auto">
          <div className="min-w-max p-8">
            <div className="flex flex-col items-center gap-0">
              {hierarchy.map((root, idx) => (
                <div key={root.id} className={idx > 0 ? "mt-12" : ""}>
                  <TreeNodeCard node={root} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(departments).sort(([a], [b]) => a.localeCompare(b)).map(([deptName, deptUsers]) => (
            <Card key={deptName}>
              <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3 dark:border-gray-700">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/30">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{deptName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{deptUsers.length} member{deptUsers.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <div className="space-y-2">
                {deptUsers.map((user) => {
                  const roleColor = getRoleColor(user.role);
                  return (
                    <div key={user.id} className="flex items-center gap-3 rounded border border-gray-100 p-2.5 dark:border-gray-700/50">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${roleColor.bg} text-xs font-semibold text-white`}>
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.firstName} {user.lastName}
                          </p>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${roleColor.light}`}>
                            {user.role.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.designation || "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Legend */}
      {users.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Roles:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span>Admin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
            <span>HR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span>Manager</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span>Team Lead</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
            <span>Employee</span>
          </div>
        </div>
      )}
    </div>
  );
}
