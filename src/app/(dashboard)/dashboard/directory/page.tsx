"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Input } from "@/components";

interface User {
  id: string;
  visibleId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  designation?: string;
  phone?: string;
  department?: { id: string; name: string };
  team?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
}

interface CurrentUser {
  id: string;
  teamId?: string | null;
  departmentId?: string | null;
}

export default function DirectoryPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "team" | "department">("all");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/users/directory").then((r) => r.json()),
    ]).then(([meData, dirData]) => {
      if (meData.success) {
        setCurrentUser(meData.data.user);
      }
      if (dirData.success) {
        setUsers(dirData.data.users);
      } else if (dirData.error === "Use Users page for admin access") {
        router.replace("/dashboard/users");
      } else {
        setError(dirData.error || "Failed to load directory");
      }
      setLoading(false);
    }).catch(() => {
      setError("Failed to load directory");
      setLoading(false);
    });
  }, [router]);

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(term) ||
      user.lastName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.designation?.toLowerCase().includes(term) ||
      user.department?.name?.toLowerCase().includes(term) ||
      user.team?.name?.toLowerCase().includes(term)
    );
  });

  // Group users by department
  const groupedByDepartment = filteredUsers.reduce((acc, user) => {
    const deptName = user.department?.name || "No Department";
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  // Group users by team
  const groupedByTeam = filteredUsers.reduce((acc, user) => {
    const teamName = user.team?.name || "No Team";
    if (!acc[teamName]) acc[teamName] = [];
    acc[teamName].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  const isSameTeam = (user: User) => currentUser?.teamId && user.team?.id === currentUser.teamId;
  const isSameDepartment = (user: User) => currentUser?.departmentId && user.department?.id === currentUser.departmentId;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "HR": return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
      case "MANAGER": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "TEAM_LEAD": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const UserCard = ({ user }: { user: User }) => {
    const sameTeam = isSameTeam(user);
    const sameDept = isSameDepartment(user);

    return (
      <div className={`relative rounded-lg border p-4 ${
        sameTeam
          ? "border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/10"
          : sameDept
          ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}>
        {/* Same team/dept badge */}
        {(sameTeam || sameDept) && (
          <div className={`absolute -top-2 right-3 rounded-full px-2 py-0.5 text-xs font-medium ${
            sameTeam
              ? "bg-green-500 text-white"
              : "bg-blue-500 text-white"
          }`}>
            {sameTeam ? "Same Team" : "Same Dept"}
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                {user.role.replace("_", " ")}
              </span>
            </div>
            {user.designation && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.designation}</p>
            )}

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {user.phone}
                </span>
              )}
            </div>

            {user.manager && (
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <span className="text-gray-400 dark:text-gray-500">Reports to:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {user.manager.firstName} {user.manager.lastName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Directory</h1>
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Directory</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View your colleagues ({users.length} total)
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          {[
            { key: "all", label: "All" },
            { key: "department", label: "By Department" },
            { key: "team", label: "By Team" },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key as typeof viewMode)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === mode.key
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-green-500"></span>
          <span className="text-gray-600 dark:text-gray-400">Same Team</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-blue-500"></span>
          <span className="text-gray-600 dark:text-gray-400">Same Department</span>
        </div>
      </div>

      {users.length > 0 && (
        <Card className="p-3">
          <Input
            id="search"
            placeholder="Search by name, email, designation, department, or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Card>
      )}

      {filteredUsers.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? "No colleagues found matching your search" : "No colleagues to display"}
            </p>
          </div>
        </Card>
      ) : viewMode === "all" ? (
        // All view - simple grid
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      ) : viewMode === "department" ? (
        // Grouped by department
        <div className="space-y-6">
          {Object.entries(groupedByDepartment).sort(([a], [b]) => a.localeCompare(b)).map(([deptName, deptUsers]) => (
            <div key={deptName}>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{deptName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{deptUsers.length} members</p>
                </div>
                {currentUser?.departmentId && deptUsers[0]?.department?.id === currentUser.departmentId && (
                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">Your Dept</span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deptUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Grouped by team
        <div className="space-y-6">
          {Object.entries(groupedByTeam).sort(([a], [b]) => a.localeCompare(b)).map(([teamName, teamUsers]) => (
            <div key={teamName}>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{teamName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{teamUsers.length} members</p>
                </div>
                {currentUser?.teamId && teamUsers[0]?.team?.id === currentUser.teamId && (
                  <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">Your Team</span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teamUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
