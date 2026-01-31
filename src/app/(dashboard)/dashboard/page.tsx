"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components";

interface Stats {
  totalUsers: number;
  totalBranches: number;
  totalDepartments: number;
  pendingLeaves: number;
}

interface UserInfo {
  role: string;
  firstName: string;
  lastName: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  type: "GENERAL" | "IMPORTANT" | "URGENT";
  publishedAt: string;
  createdBy: { firstName: string; lastName: string };
}

const PERMISSIONS = {
  VIEW_STATS: ["ADMIN", "HR"],
  MANAGE_USERS: ["ADMIN", "HR"],
  MANAGE_DEPARTMENTS: ["ADMIN", "HR"],
  MANAGE_TEAMS: ["ADMIN", "HR"],
  APPROVE_LEAVES: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"],
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBranches: 0,
    totalDepartments: 0,
    pendingLeaves: 0,
  });
  const [user, setUser] = useState<UserInfo | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const hasPermission = (permission: keyof typeof PERMISSIONS) => {
    if (!user) return false;
    return PERMISSIONS[permission].includes(user.role);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/users?limit=1").then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/leave-requests?pending=true").then((r) => r.json()),
      fetch("/api/notices").then((r) => r.json()),
    ]).then(([meData, usersData, branchesData, deptData, leavesData, noticesData]) => {
      if (meData.success) {
        setUser(meData.data.user);
      }
      setStats({
        totalUsers: usersData.data?.pagination?.total || 0,
        totalBranches: branchesData.data?.branches?.length || 0,
        totalDepartments: deptData.data?.departments?.length || 0,
        pendingLeaves: leavesData.data?.leaveRequests?.length || 0,
      });
      if (noticesData.success) {
        setNotices(noticesData.data.notices.slice(0, 5)); // Show max 5 notices
      }
      setLoading(false);
    });
  }, []);

  const typeConfig = {
    URGENT: { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", icon: "text-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
    IMPORTANT: { bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800", icon: "text-yellow-500", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" },
    GENERAL: { bg: "bg-gray-50 dark:bg-gray-800", border: "border-gray-200 dark:border-gray-700", icon: "text-gray-500", badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  // Stats cards for HR/Admin
  const adminStatCards = [
    { name: "Total Users", value: stats.totalUsers, href: "/dashboard/users", icon: UsersIcon, color: "bg-gray-900 dark:bg-white dark:text-gray-900" },
    { name: "Departments", value: stats.totalDepartments, href: "/dashboard/departments", icon: BuildingIcon, color: "bg-green-600" },
    { name: "Branches", value: stats.totalBranches, href: "/dashboard/branches", icon: LocationIcon, color: "bg-purple-600" },
    { name: "Pending Leaves", value: stats.pendingLeaves, href: "/dashboard/leaves/requests", icon: ClockIcon, color: "bg-orange-600" },
  ];

  // Quick actions for HR/Admin
  const adminQuickActions = [
    { href: "/dashboard/users/new", icon: UsersIcon, title: "Add User", description: "Create new employee" },
    { href: "/dashboard/departments/new", icon: BuildingIcon, title: "Add Department", description: "Create department" },
    { href: "/dashboard/notices", icon: MegaphoneIcon, title: "Manage Notices", description: "Post announcements" },
  ];

  // Quick actions for all employees
  const employeeQuickActions = [
    { href: "/dashboard/leaves/apply", icon: CalendarIcon, title: "Apply Leave", description: "Request time off" },
    { href: "/dashboard/org-chart", icon: OrgChartIcon, title: "Org Chart", description: "View company structure" },
  ];

  // Manager/Team Lead can see pending leaves
  const managerQuickActions = hasPermission("APPROVE_LEAVES") ? [
    { href: "/dashboard/leaves/requests", icon: ClockIcon, title: "Pending Requests", description: "Review leave requests" },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Welcome back, {user?.firstName}!
        </p>
      </div>

      {/* Notices Section */}
      {notices.length > 0 && (
        <div className="space-y-3">
          <Link href="/dashboard/notices" className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 hover:text-gray-600 dark:hover:text-gray-300 w-fit">
            <MegaphoneIcon className="h-4 w-4" />
            Announcements
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
          {notices.map((notice) => {
            const config = typeConfig[notice.type];
            return (
              <Link key={notice.id} href="/dashboard/notices" className={`block rounded-lg border p-3 ${config.bg} ${config.border} hover:shadow-sm transition-shadow`}>
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 ${config.icon}`}>
                    {notice.type === "URGENT" ? (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{notice.title}</h3>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${config.badge}`}>
                        {notice.type}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{notice.content}</p>
                    <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                      {notice.createdBy.firstName} {notice.createdBy.lastName} · {new Date(notice.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Stats for HR/Admin */}
      {hasPermission("VIEW_STATS") && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {adminStatCards.map((stat) => (
            <Link key={stat.name} href={stat.href}>
              <Card className="flex items-center gap-3 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
                <div className={`rounded-lg p-2.5 ${stat.color}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Manager/Team Lead Stats */}
      {hasPermission("APPROVE_LEAVES") && !hasPermission("VIEW_STATS") && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/leaves/requests">
            <Card className="flex items-center gap-3 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
              <div className="rounded-lg p-2.5 bg-orange-600">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pending Leaves</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.pendingLeaves}</p>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/leaves">
            <Card className="flex items-center gap-3 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
              <div className="rounded-lg p-2.5 bg-gray-900 dark:bg-white">
                <CalendarIcon className="h-5 w-5 text-white dark:text-gray-900" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">My Leaves</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">View</p>
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* Employee Stats */}
      {!hasPermission("APPROVE_LEAVES") && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/leaves">
            <Card className="flex items-center gap-3 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
              <div className="rounded-lg p-2.5 bg-gray-900 dark:bg-white">
                <CalendarIcon className="h-5 w-5 text-white dark:text-gray-900" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">My Leaves</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">View Balance</p>
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Admin/HR Actions */}
          {hasPermission("MANAGE_USERS") && adminQuickActions.map((action) => (
            <QuickAction key={action.href} {...action} />
          ))}

          {/* Manager Actions */}
          {managerQuickActions.map((action) => (
            <QuickAction key={action.href} {...action} />
          ))}

          {/* Employee Actions */}
          {employeeQuickActions.map((action) => (
            <QuickAction key={action.href} {...action} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, description }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
      <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700">
        <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
    </Link>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

function BuildingIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
}

function LocationIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}

function ClockIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}

function MegaphoneIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>;
}

function OrgChartIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>;
}
