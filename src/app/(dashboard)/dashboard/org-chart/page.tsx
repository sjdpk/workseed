"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Avatar,
  Card,
  OrgChartCanvas,
  PageHeader,
  SearchBar,
  useConfirm,
  useRoles,
  useToast,
} from "@/components";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  designation?: string;
  email: string;
  profilePicture?: string | null;
  linkedIn?: string | null;
  department?: { id: string; name: string };
  team?: { id: string; name: string };
  managerId?: string;
  roleRecord?: { name: string; color: string | null; rank: number } | null;
}

/** Role badge colour → Tailwind class. Roles carry a colour token chosen in
 *  Settings → Roles; anything unknown falls back to grey. */
/** Colours for the five seeded roles, for rows saved before roles had a colour. */
const DEFAULT_ROLE_COLOR: Record<string, string> = {
  ADMIN: "red",
  HR: "purple",
  MANAGER: "blue",
  TEAM_LEAD: "green",
  EMPLOYEE: "gray",
};

const COLOR_CLASS: Record<string, string> = {
  red: "bg-red-500",
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  gray: "bg-gray-500",
};

export default function OrgChartPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"hierarchy" | "department">("hierarchy");
  const { roles } = useRoles();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  /* Only someone who may edit people can redraw reporting lines. */
  const [canEditPeople, setCanEditPeople] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.success) setCanEditPeople(!!me.data.user.permissions?.includes("USER_EDIT"));
      });
  }, []);
  const [search, setSearch] = useState("");

  const highlightId =
    search.trim().length > 1
      ? (users.find((u) =>
          `${u.firstName} ${u.lastName} ${u.designation ?? ""}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        )?.id ?? null)
      : null;

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

  const groupByDepartment = (users: User[]) => {
    return users.reduce(
      (acc, user) => {
        const deptName = user.department?.name || "No Department";
        if (!acc[deptName]) acc[deptName] = [];
        acc[deptName].push(user);
        return acc;
      },
      {} as Record<string, User[]>
    );
  };

  const getRoleColor = (user: { role: string; roleRecord?: { color: string | null } | null }) => {
    if (user.roleRecord?.color) return COLOR_CLASS[user.roleRecord.color] ?? "bg-gray-500";
    // roles created before colours existed, and the seeded five
    return (
      {
        ADMIN: "bg-red-500",
        HR: "bg-purple-500",
        MANAGER: "bg-blue-500",
        TEAM_LEAD: "bg-green-500",
      }[user.role] ?? "bg-gray-500"
    );
  };

  const LinkedInIcon = () => (
    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );

  /**
   * One node of the tree.
   *
   * The connectors are rounded elbows drawn with borders rather than straight
   * 1px bars: a child hangs from a curve off the parent's spine, with a dot where
   * it meets the card, which is what makes a deep chart readable. A branch with
   * reports can be collapsed to a "+N" pill so a large company fits on screen.
   */

  /* The canvas needs each person plus the colour of their role. */
  const chartPeople = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    designation: u.designation,
    profilePicture: u.profilePicture,
    managerId: u.managerId,
    department: u.department ?? null,
    roleName: u.roleRecord?.name ?? u.role.replace(/_/g, " "),
    color: u.roleRecord?.color ?? DEFAULT_ROLE_COLOR[u.role] ?? "gray",
  }));

  /**
   * Re-parent a person after they confirm. A drag is easy to do by accident and
   * this rewrites a real reporting line, so the change is stated in full — who
   * moves, to whom, and from where — before anything is saved.
   */
  const reassignManager = async (personId: string, newManagerId: string) => {
    const moving = users.find((u) => u.id === personId);
    const newManager = users.find((u) => u.id === newManagerId);
    const currentManager = users.find((u) => u.id === moving?.managerId);
    if (!moving || !newManager) return;

    const ok = await confirm({
      title: "Change reporting line?",
      message: (
        <>
          <strong>
            {moving.firstName} {moving.lastName}
          </strong>{" "}
          will report to{" "}
          <strong>
            {newManager.firstName} {newManager.lastName}
          </strong>
          {currentManager ? (
            <>
              , instead of {currentManager.firstName} {currentManager.lastName}.
            </>
          ) : (
            <>, and will no longer sit at the top of the chart.</>
          )}
        </>
      ),
      confirmText: "Change it",
    });
    if (!ok) return;

    const res = await fetch(`/api/users/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: newManagerId }),
    });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.error || "Could not change the reporting line");
      return;
    }
    const moved = users.find((u) => u.id === personId);
    const to = users.find((u) => u.id === newManagerId);
    toast.success(`${moved?.firstName ?? "Employee"} now reports to ${to?.firstName ?? "them"}`);
    setUsers((prev) =>
      prev.map((u) => (u.id === personId ? { ...u, managerId: newManagerId } : u))
    );
  };

  const departments = groupByDepartment(users);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Chart"
        subtitle="View company structure and reporting lines"
        actions={
          <>
            {viewMode === "hierarchy" && (
              <>
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Find a colleague…"
                  className="w-52"
                />
              </>
            )}
            <button
              onClick={() => setViewMode("hierarchy")}
              className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "hierarchy"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Hierarchy
            </button>
            <button
              onClick={() => setViewMode("department")}
              className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "department"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              By Department
            </button>
          </>
        }
      />

      {users.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
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
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No employees found</p>
          </div>
        </Card>
      ) : viewMode === "hierarchy" ? (
        <Card className="p-2">
          {/* Pan/zoom canvas. Layout is computed from managerId, so the chart is
              never stale, and HR can re-parent someone by dragging a handle. */}
          <OrgChartCanvas
            people={chartPeople}
            highlightId={highlightId}
            onOpen={(id) => router.push(`/dashboard/users/${id}/view`)}
            onReassign={canEditPeople ? reassignManager : undefined}
          />
          <p className="px-2 pb-1 pt-2 text-xs text-gray-500 dark:text-gray-400">
            Drag to pan, scroll to zoom, double-click a card to open the profile
            {canEditPeople
              ? " — or drag the dot under a card onto someone to make them report there."
              : "."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(departments)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([deptName, deptUsers]) => (
              <Card key={deptName}>
                <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3 dark:border-gray-700">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                    <svg
                      className="h-5 w-5 text-gray-900 dark:text-white"
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
                      {deptUsers.length} member{deptUsers.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {deptUsers.map((user) => {
                    const roleColor = getRoleColor(user);
                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 rounded border border-gray-100 p-2.5 dark:border-gray-700/50"
                      >
                        <Avatar
                          src={user.profilePicture}
                          name={`${user.firstName} ${user.lastName}`}
                          size="sm"
                          colorClass={roleColor}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            {user.linkedIn && (
                              <a
                                href={user.linkedIn}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
                                title="LinkedIn Profile"
                              >
                                <LinkedInIcon />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.designation || user.role.replace("_", " ")}
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
          {/* the roster itself, so a role added in Settings shows up here */}
          {roles.map((role) => (
            <div key={role.id} className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${COLOR_CLASS[role.color || "gray"] ?? "bg-gray-500"}`}
              />
              <span>{role.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
