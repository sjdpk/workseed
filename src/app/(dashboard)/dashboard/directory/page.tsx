"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, Input, Avatar } from "@/components";

interface User {
  id: string;
  visibleId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  linkedIn?: string | null;
  role: string;
  designation?: string;
  phone?: string;
  department?: { id: string; name: string };
  team?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string; profilePicture?: string | null };
}

interface CurrentUser {
  id: string;
  teamId?: string | null;
  departmentId?: string | null;
}

const LinkedInIcon = () => (
  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

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
    ])
      .then(([meData, dirData]) => {
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
      })
      .catch(() => {
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

  const groupedByDepartment = filteredUsers.reduce(
    (acc, user) => {
      const deptName = user.department?.name || "No Department";
      if (!acc[deptName]) acc[deptName] = [];
      acc[deptName].push(user);
      return acc;
    },
    {} as Record<string, User[]>
  );

  const groupedByTeam = filteredUsers.reduce(
    (acc, user) => {
      const teamName = user.team?.name || "No Team";
      if (!acc[teamName]) acc[teamName] = [];
      acc[teamName].push(user);
      return acc;
    },
    {} as Record<string, User[]>
  );

  const isSameTeam = (user: User) => currentUser?.teamId && user.team?.id === currentUser.teamId;
  const isSameDepartment = (user: User) =>
    currentUser?.departmentId && user.department?.id === currentUser.departmentId;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "HR":
        return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
      case "MANAGER":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      case "TEAM_LEAD":
        return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getRoleAvatarColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-500";
      case "HR":
        return "bg-pink-500";
      case "MANAGER":
        return "bg-gray-500";
      case "TEAM_LEAD":
        return "bg-gray-600";
      default:
        return "bg-gray-500";
    }
  };

  const UserCard = ({ user }: { user: User }) => {
    const sameTeam = isSameTeam(user);
    const sameDept = isSameDepartment(user);

    return (
      <div
        className={`relative rounded border p-4 ${
          sameTeam
            ? "border-gray-400 bg-gray-100/50 dark:border-gray-500 dark:bg-gray-700/30"
            : sameDept
              ? "border-gray-300 bg-gray-50/50 dark:border-gray-600 dark:bg-gray-800/50"
              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        }`}
      >
        {(sameTeam || sameDept) && (
          <div
            className={`absolute -top-2 right-3 rounded px-1.5 py-0.5 text-[10px] font-medium ${
              sameTeam
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-600 text-white"
            }`}
          >
            {sameTeam ? "Same Team" : "Same Dept"}
          </div>
        )}

        <div className="flex items-start gap-3">
          <Avatar
            src={user.profilePicture}
            name={`${user.firstName} ${user.lastName}`}
            size="lg"
            colorClass={getRoleAvatarColor(user.role)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              {user.linkedIn && (
                <a
                  href={user.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300"
                  title="LinkedIn Profile"
                >
                  <LinkedInIcon />
                </a>
              )}
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-medium ${getRoleBadgeColor(user.role)}`}
              >
                {user.role
                  .replace("_", " ")
                  .split(" ")
                  .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                  .join(" ")}
              </span>
            </div>
            {user.designation && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {user.designation}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {user.phone}
                </span>
              )}
            </div>

            {user.manager && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-gray-400 dark:text-gray-500">Reports to:</span>
                <div className="flex items-center gap-1.5">
                  <Avatar
                    src={user.manager.profilePicture}
                    name={`${user.manager.firstName} ${user.manager.lastName}`}
                    size="xs"
                  />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {user.manager.firstName} {user.manager.lastName}
                  </span>
                </div>
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Directory</h1>
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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Directory</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View your colleagues ({users.length} total)
          </p>
        </div>

        <div className="flex rounded border border-gray-200 dark:border-gray-700 p-1">
          {[
            { key: "all", label: "All" },
            { key: "department", label: "By Department" },
            { key: "team", label: "By Team" },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key as typeof viewMode)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === mode.key
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-gray-900 dark:bg-white"></span>
          <span className="text-gray-600 dark:text-gray-400">Same Team</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-gray-400"></span>
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
            <svg
              className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? "No colleagues found matching your search" : "No colleagues to display"}
            </p>
          </div>
        </Card>
      ) : viewMode === "all" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      ) : viewMode === "department" ? (
        <div className="space-y-6">
          {Object.entries(groupedByDepartment)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([deptName, deptUsers]) => (
              <div key={deptName}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                    <svg
                      className="h-4 w-4 text-gray-900 dark:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{deptName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {deptUsers.length} members
                    </p>
                  </div>
                  {currentUser?.departmentId &&
                    deptUsers[0]?.department?.id === currentUser.departmentId && (
                      <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-gray-900">
                        Your Dept
                      </span>
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
        <div className="space-y-6">
          {Object.entries(groupedByTeam)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([teamName, teamUsers]) => (
              <div key={teamName}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                    <svg
                      className="h-4 w-4 text-gray-900 dark:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{teamName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {teamUsers.length} members
                    </p>
                  </div>
                  {currentUser?.teamId && teamUsers[0]?.team?.id === currentUser.teamId && (
                    <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-gray-900">
                      Your Team
                    </span>
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
