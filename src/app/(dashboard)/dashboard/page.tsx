"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Card } from "@/components";

interface DashboardData {
  stats?: {
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    totalTeams: number;
    pendingLeaves: number;
    presentToday: number;
  };
  employeesByDepartment?: { name: string; count: number }[];
  employeesByRole?: { name: string; count: number }[];
  leavesByStatus?: { name: string; count: number }[];
  weeklyAttendance?: { day: string; date: string; count: number }[];
  recentLeaves?: {
    id: string;
    user: string;
    type: string;
    color: string;
    status: string;
    days: number;
    createdAt: string;
  }[];
  recentHires?: {
    id: string;
    name: string;
    department: string;
    joiningDate: string | null;
  }[];
  myRecentLeaves?: {
    id: string;
    type: string;
    color: string;
    status: string;
    days: number;
    startDate: string;
  }[];
  upcomingBirthdays?: {
    id: string;
    name: string;
    department: string;
    date: string;
    daysUntil: number;
  }[];
  upcomingAnniversaries?: {
    id: string;
    name: string;
    department: string;
    years: number;
    date: string;
    daysUntil: number;
  }[];
  upcomingHolidays?: {
    id: string;
    name: string;
    date: string;
    type: string;
    daysUntil: number;
  }[];
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
  APPROVE_LEAVES: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"],
};

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
const LEAVE_STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  APPROVED: "#10B981",
  REJECTED: "#EF4444",
  CANCELLED: "#6B7280",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({});
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
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/notices").then((r) => r.json()),
    ]).then(([meData, dashboardData, noticesData]) => {
      if (meData.success) {
        setUser(meData.data.user);
      }
      if (dashboardData.success) {
        setData(dashboardData.data);
      }
      if (noticesData.success) {
        setNotices(noticesData.data.notices.slice(0, 5));
      }
      setLoading(false);
    });
  }, []);

  const typeConfig = {
    URGENT: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      icon: "text-red-500",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    },
    IMPORTANT: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: "text-yellow-500",
      badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    },
    GENERAL: {
      bg: "bg-gray-50 dark:bg-gray-800",
      border: "border-gray-200 dark:border-gray-700",
      icon: "text-gray-500",
      badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  const stats = data.stats;

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
        <div className="space-y-2">
          <Link
            href="/dashboard/announcements"
            className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 hover:text-gray-600 dark:hover:text-gray-300 w-fit"
          >
            <MegaphoneIcon className="h-4 w-4" />
            Announcements
            <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
          </Link>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:-mx-6 lg:px-6">
            {notices.map((notice) => {
              const config = typeConfig[notice.type];
              return (
                <Link
                  key={notice.id}
                  href="/dashboard/announcements"
                  className={`flex-shrink-0 w-72 rounded-md border p-3 ${config.bg} ${config.border} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 flex-shrink-0 ${config.icon}`}>
                      {notice.type === "URGENT" ? (
                        <AlertIcon className="h-4 w-4" />
                      ) : (
                        <MegaphoneIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {notice.title}
                        </h3>
                        <span
                          className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${config.badge}`}
                        >
                          {notice.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                        {notice.content}
                      </p>
                      <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                        {notice.createdBy.firstName} {notice.createdBy.lastName} ·{" "}
                        {new Date(notice.publishedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* HR/Admin Dashboard */}
      {hasPermission("VIEW_STATS") && stats && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard
              label="Total Employees"
              value={stats.totalEmployees}
              icon={<UsersIcon className="h-5 w-5" />}
              color="bg-gray-900 dark:bg-white dark:text-gray-900"
              href="/dashboard/users"
            />
            <StatCard
              label="Active"
              value={stats.activeEmployees}
              icon={<CheckIcon className="h-5 w-5" />}
              color="bg-green-600"
              href="/dashboard/users"
            />
            <StatCard
              label="Present Today"
              value={stats.presentToday}
              icon={<ClockIcon className="h-5 w-5" />}
              color="bg-blue-600"
              href="/dashboard/attendance/manage"
            />
            <StatCard
              label="Pending Leaves"
              value={stats.pendingLeaves}
              icon={<CalendarIcon className="h-5 w-5" />}
              color="bg-orange-600"
              href="/dashboard/leaves/requests"
            />
            <StatCard
              label="Departments"
              value={stats.totalDepartments}
              icon={<BuildingIcon className="h-5 w-5" />}
              color="bg-purple-600"
              href="/dashboard/departments"
            />
            <StatCard
              label="Teams"
              value={stats.totalTeams}
              icon={<TeamIcon className="h-5 w-5" />}
              color="bg-pink-600"
              href="/dashboard/teams"
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Weekly Attendance Chart */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Weekly Attendance
              </h3>
              <div className="h-48">
                {data.weeklyAttendance && data.weeklyAttendance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.weeklyAttendance}>
                      <defs>
                        <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        width={30}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(17, 24, 39, 0.9)",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "#fff",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="url(#colorAttendance)"
                        name="Check-ins"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No attendance data
                  </div>
                )}
              </div>
            </Card>

            {/* Employees by Department */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Employees by Department
              </h3>
              <div className="h-48">
                {data.employeesByDepartment && data.employeesByDepartment.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.employeesByDepartment} layout="vertical">
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(17, 24, 39, 0.9)",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} name="Employees" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No department data
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Second Charts Row */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Leave Status Pie Chart */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Leave Requests (This Month)
              </h3>
              <div className="h-40">
                {data.leavesByStatus && data.leavesByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.leavesByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="name"
                      >
                        {data.leavesByStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={LEAVE_STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(17, 24, 39, 0.9)",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No leave data
                  </div>
                )}
              </div>
              {data.leavesByStatus && data.leavesByStatus.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {data.leavesByStatus.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: LEAVE_STATUS_COLORS[item.name] || "#6B7280" }}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {item.name} ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Employees by Role */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Employees by Role
              </h3>
              <div className="h-40">
                {data.employeesByRole && data.employeesByRole.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.employeesByRole}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="name"
                      >
                        {data.employeesByRole.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(17, 24, 39, 0.9)",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No role data
                  </div>
                )}
              </div>
              {data.employeesByRole && data.employeesByRole.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {data.employeesByRole.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {item.name} ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <QuickAction href="/dashboard/users/new" icon={<PlusIcon />} title="Add Employee" />
                <QuickAction
                  href="/dashboard/leaves/requests"
                  icon={<CalendarIcon className="h-4 w-4" />}
                  title="Review Leaves"
                />
                <QuickAction href="/dashboard/reports" icon={<ChartIcon />} title="View Reports" />
                <QuickAction
                  href="/dashboard/notices/new"
                  icon={<MegaphoneIcon className="h-4 w-4" />}
                  title="Post Notice"
                />
              </div>
            </Card>
          </div>

          {/* Upcoming Holidays */}
          {data.upcomingHolidays && data.upcomingHolidays.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HolidayIcon className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Upcoming Holidays
                  </h3>
                </div>
                <Link
                  href="/dashboard/settings/holidays"
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View all
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {data.upcomingHolidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex-shrink-0 w-40 rounded-md border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 mb-2">
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        {new Date(holiday.date).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date(holiday.date).getDate()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {holiday.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {holiday.daysUntil === 0
                        ? "Today"
                        : holiday.daysUntil === 1
                          ? "Tomorrow"
                          : `In ${holiday.daysUntil} days`}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Birthdays & Anniversaries */}
          {((data.upcomingBirthdays && data.upcomingBirthdays.length > 0) ||
            (data.upcomingAnniversaries && data.upcomingAnniversaries.length > 0)) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Upcoming Birthdays */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CakeIcon className="h-4 w-4 text-pink-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Upcoming Birthdays
                  </h3>
                </div>
                {data.upcomingBirthdays && data.upcomingBirthdays.length > 0 ? (
                  <div className="space-y-3">
                    {data.upcomingBirthdays.map((b) => (
                      <div key={b.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{b.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{b.department}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            b.daysUntil === 0
                              ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {b.daysUntil === 0
                            ? "Today!"
                            : b.daysUntil === 1
                              ? "Tomorrow"
                              : `In ${b.daysUntil} days`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No upcoming birthdays
                  </p>
                )}
              </Card>

              {/* Work Anniversaries */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrophyIcon className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Work Anniversaries
                  </h3>
                </div>
                {data.upcomingAnniversaries && data.upcomingAnniversaries.length > 0 ? (
                  <div className="space-y-3">
                    {data.upcomingAnniversaries.map((a) => (
                      <div key={a.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{a.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {a.years} year{a.years > 1 ? "s" : ""} · {a.department}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            a.daysUntil === 0
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {a.daysUntil === 0
                            ? "Today!"
                            : a.daysUntil === 1
                              ? "Tomorrow"
                              : `In ${a.daysUntil} days`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No upcoming anniversaries
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* Recent Activity */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Recent Leave Requests */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Recent Leave Requests
                </h3>
                <Link
                  href="/dashboard/leaves/requests"
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {data.recentLeaves && data.recentLeaves.length > 0 ? (
                  data.recentLeaves.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: leave.color }}
                        />
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{leave.user}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {leave.type} · {leave.days} day{leave.days > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          leave.status === "APPROVED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : leave.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : leave.status === "REJECTED"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {leave.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No recent leaves
                  </p>
                )}
              </div>
            </Card>

            {/* Recent Hires */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Recent Hires
                </h3>
                <Link
                  href="/dashboard/users"
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {data.recentHires && data.recentHires.length > 0 ? (
                  data.recentHires.map((hire) => (
                    <Link
                      key={hire.id}
                      href={`/dashboard/users/${hire.id}/view`}
                      className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 py-1 rounded"
                    >
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{hire.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {hire.department}
                        </p>
                      </div>
                      {hire.joiningDate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(hire.joiningDate).toLocaleDateString()}
                        </span>
                      )}
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No recent hires
                  </p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Manager/Team Lead Dashboard */}
      {hasPermission("APPROVE_LEAVES") && !hasPermission("VIEW_STATS") && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Pending Leaves"
              value={stats?.pendingLeaves || 0}
              icon={<ClockIcon className="h-5 w-5" />}
              color="bg-orange-600"
              href="/dashboard/leaves/requests"
            />
            <Link href="/dashboard/leaves">
              <Card className="flex items-center gap-3 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
                <div className="rounded-md p-2.5 bg-gray-900 dark:bg-white">
                  <CalendarIcon className="h-5 w-5 text-white dark:text-gray-900" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">My Leaves</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">View</p>
                </div>
              </Card>
            </Link>
          </div>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <QuickActionCard
                href="/dashboard/leaves/requests"
                icon={<ClockIcon className="h-4 w-4" />}
                title="Pending Requests"
                description="Review leave requests"
              />
              <QuickActionCard
                href="/dashboard/leaves/apply"
                icon={<CalendarIcon className="h-4 w-4" />}
                title="Apply Leave"
                description="Request time off"
              />
              <QuickActionCard
                href="/dashboard/org-chart"
                icon={<OrgChartIcon className="h-4 w-4" />}
                title="Org Chart"
                description="View company structure"
              />
            </div>
          </Card>
        </>
      )}

      {/* Employee Dashboard */}
      {!hasPermission("APPROVE_LEAVES") && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/leaves">
              <Card className="flex items-center gap-3 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
                <div className="rounded-md p-2.5 bg-gray-900 dark:bg-white">
                  <CalendarIcon className="h-5 w-5 text-white dark:text-gray-900" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">My Leaves</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    View Balance
                  </p>
                </div>
              </Card>
            </Link>
          </div>

          {/* My Recent Leaves */}
          {data.myRecentLeaves && data.myRecentLeaves.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  My Recent Leaves
                </h3>
                <Link
                  href="/dashboard/leaves"
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {data.myRecentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: leave.color }}
                      />
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{leave.type}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(leave.startDate).toLocaleDateString()} · {leave.days} day
                          {leave.days > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        leave.status === "APPROVED"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : leave.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : leave.status === "REJECTED"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <QuickActionCard
                href="/dashboard/leaves/apply"
                icon={<CalendarIcon className="h-4 w-4" />}
                title="Apply Leave"
                description="Request time off"
              />
              <QuickActionCard
                href="/dashboard/profile"
                icon={<UserIcon className="h-4 w-4" />}
                title="My Profile"
                description="View your details"
              />
              <QuickActionCard
                href="/dashboard/directory"
                icon={<UsersIcon className="h-4 w-4" />}
                title="Directory"
                description="Find colleagues"
              />
              <QuickActionCard
                href="/dashboard/org-chart"
                icon={<OrgChartIcon className="h-4 w-4" />}
                title="Org Chart"
                description="View company structure"
              />
            </div>
          </Card>
        </>
      )}

    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-3 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
        <div className={`rounded-md p-2.5 ${color}`}>
          <div className="text-white">{icon}</div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  title,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md border border-gray-200 p-2.5 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
    >
      <div className="rounded bg-gray-100 p-1.5 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {icon}
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{title}</span>
    </Link>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
    >
      <div className="rounded-md bg-gray-100 p-2 dark:bg-gray-700">
        <div className="text-gray-500 dark:text-gray-400">{icon}</div>
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
    </Link>
  );
}

// Icons
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    </svg>
  );
}

function OrgChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function CakeIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-6.121v3.246c0 1.135-.845 2.098-1.976 2.192a48.424 48.424 0 01-8.024.166 48.42 48.42 0 01-4.024-.166C5.845 15.719 5 14.756 5 13.621v-3.246m16 0c0 1.135-.845 2.098-1.976 2.192a48.424 48.424 0 01-8.024.166 48.42 48.42 0 01-4.024-.166C5.845 12.719 5 11.756 5 10.621"
      />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m3.044-1.35a6.726 6.726 0 01-2.749 1.35m0 0v1.122c0 .621-.504 1.125-1.125 1.125H12m-.773-2.247L12 10.5m0 0l.773-.252M12 10.5v2.25m7.27-2.772a6.003 6.003 0 00-1.904-5.712m1.904 5.712a6.726 6.726 0 01-2.749 1.35m2.749-1.35v.249m0 0c.982.143 1.954.317 2.916.52M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228"
      />
    </svg>
  );
}

function HolidayIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
      />
    </svg>
  );
}
