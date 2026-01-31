"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components";
import type { LeaveRequest } from "@/types";

interface CurrentUser {
  id: string;
  role: string;
  teamId?: string;
  departmentId?: string;
}

type ViewMode = "team" | "department";

export default function WhosOutPage() {
  const router = useRouter();
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [departmentLeaves, setDepartmentLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [canViewTeam, setCanViewTeam] = useState(false);
  const [canViewDepartment, setCanViewDepartment] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("team");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(async ([meData, orgData]) => {
      if (!meData.success) {
        router.replace("/login");
        return;
      }

      const user = meData.data.user;
      setCurrentUser(user);

      const permissions = orgData.success ? orgData.data.settings.permissions || {} : {};
      const canTeam = permissions.employeesCanViewTeamLeaves === true && user.teamId;
      const canDept = permissions.employeesCanViewDepartmentLeaves === true && user.departmentId;

      setCanViewTeam(canTeam);
      setCanViewDepartment(canDept);

      if (!canTeam && !canDept) {
        router.replace("/dashboard/leaves");
        return;
      }

      // Set default view mode
      if (canTeam) {
        setViewMode("team");
      } else if (canDept) {
        setViewMode("department");
      }

      // Fetch leaves based on permissions
      const fetchPromises = [];

      if (canTeam) {
        fetchPromises.push(
          fetch("/api/leave-requests?team=true")
            .then((r) => r.json())
            .then((data) => {
              if (data.success) {
                const leaves = data.data.leaveRequests.filter(
                  (leave: LeaveRequest) => leave.userId !== user.id
                );
                setTeamLeaves(leaves);
              }
            })
        );
      }

      if (canDept) {
        fetchPromises.push(
          fetch("/api/leave-requests?department=true")
            .then((r) => r.json())
            .then((data) => {
              if (data.success) {
                const leaves = data.data.leaveRequests.filter(
                  (leave: LeaveRequest) => leave.userId !== user.id
                );
                setDepartmentLeaves(leaves);
              }
            })
        );
      }

      await Promise.all(fetchPromises);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  const currentLeaves = viewMode === "team" ? teamLeaves : departmentLeaves;

  // Separate into current/upcoming and past leaves
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingLeaves = currentLeaves.filter(
    (leave) => new Date(leave.endDate) >= today
  );
  const pastLeaves = currentLeaves.filter(
    (leave) => new Date(leave.endDate) < today
  ).slice(0, 10); // Show only last 10

  // Group upcoming by status (today, this week, later)
  const todayLeaves = upcomingLeaves.filter((leave) => {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    return start <= today && end >= today;
  });

  const futureLeaves = upcomingLeaves.filter((leave) => {
    const start = new Date(leave.startDate);
    return start > today;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Who's Out</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">See when your colleagues are on leave</p>
      </div>

      {/* View Toggle */}
      {canViewTeam && canViewDepartment && (
        <div className="flex items-center rounded bg-gray-100 p-1 dark:bg-gray-800 w-fit">
          <button
            onClick={() => setViewMode("team")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-all ${
              viewMode === "team"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            My Team ({teamLeaves.length})
          </button>
          <button
            onClick={() => setViewMode("department")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-all ${
              viewMode === "department"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            My Department ({departmentLeaves.length})
          </button>
        </div>
      )}

      {currentLeaves.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Everyone's here!</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No {viewMode === "team" ? "team" : "department"} members are currently on leave
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Out Today */}
          {todayLeaves.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Out Today</h2>
                <span className="text-xs text-gray-500">({todayLeaves.length})</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {todayLeaves.map((leave) => (
                  <LeaveCard key={leave.id} leave={leave} isToday />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {futureLeaves.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming</h2>
                <span className="text-xs text-gray-500">({futureLeaves.length})</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {futureLeaves.map((leave) => (
                  <LeaveCard key={leave.id} leave={leave} />
                ))}
              </div>
            </div>
          )}

          {/* Recent (Past) */}
          {pastLeaves.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Recently Returned</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pastLeaves.map((leave) => (
                  <LeaveCard key={leave.id} leave={leave} isPast />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LeaveCard({ leave, isToday, isPast }: { leave: LeaveRequest; isToday?: boolean; isPast?: boolean }) {
  return (
    <Card className={`p-4 ${isPast ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded text-sm font-medium ${
          isToday
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        }`}>
          {leave.user?.firstName?.[0]}{leave.user?.lastName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {leave.user?.firstName} {leave.user?.lastName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="rounded bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {leave.leaveType?.name}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <CalendarIcon className="h-3.5 w-3.5" />
        <span>
          {new Date(leave.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {leave.startDate !== leave.endDate && (
            <> - {new Date(leave.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
          )}
        </span>
        <span className="text-gray-400">({leave.days}d)</span>
      </div>
    </Card>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
