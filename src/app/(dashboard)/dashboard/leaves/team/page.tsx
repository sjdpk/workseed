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

export default function TeamLeavesPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(([meData, orgData]) => {
      if (!meData.success) {
        router.replace("/login");
        return;
      }

      const user = meData.data.user;
      setCurrentUser(user);

      const permissions = orgData.success ? orgData.data.settings.permissions || {} : {};
      const canViewTeamLeaves = permissions.employeesCanViewTeamLeaves === true;

      if (!canViewTeamLeaves || !user.teamId) {
        router.replace("/dashboard/leaves");
        return;
      }

      setHasAccess(true);

      // Fetch team leaves
      fetch("/api/leave-requests?team=true")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            // Filter out current user's own leaves
            const teamLeaves = data.data.leaveRequests.filter(
              (leave: LeaveRequest) => leave.userId !== user.id
            );
            setLeaves(teamLeaves);
          }
          setLoading(false);
        });
    });
  }, [router]);

  if (loading || !hasAccess) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Group leaves by month
  const groupedLeaves = leaves.reduce((acc, leave) => {
    const month = new Date(leave.startDate).toLocaleString("default", { month: "long", year: "numeric" });
    if (!acc[month]) acc[month] = [];
    acc[month].push(leave);
    return acc;
  }, {} as Record<string, LeaveRequest[]>);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Team Leaves</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">See when your team members are on leave</p>
      </div>

      {leaves.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <CalendarIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">No upcoming leaves</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your team members have no approved leaves</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLeaves).map(([month, monthLeaves]) => (
            <div key={month}>
              <h2 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">{month}</h2>
              <div className="space-y-2">
                {monthLeaves.map((leave) => (
                  <Card key={leave.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {leave.user?.firstName?.[0]}{leave.user?.lastName?.[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {leave.user?.firstName} {leave.user?.lastName}
                          </p>
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {leave.leaveType?.name}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          <span>
                            {new Date(leave.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {leave.startDate !== leave.endDate && (
                              <> - {new Date(leave.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                            )}
                          </span>
                          <span className="text-gray-400">({leave.days} {leave.days === 1 ? "day" : "days"})</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
