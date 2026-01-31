"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components";

const ALLOWED_ROLES = ["ADMIN", "HR", "MANAGER"];

interface OverviewData {
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    totalDepartments: number;
    totalTeams: number;
    pendingLeaves: number;
    approvedLeavesThisMonth: number;
    recentHires: number;
    presentToday: number;
  };
  employeesByRole: { role: string; count: number }[];
  employeesByDepartment: { department: string; count: number }[];
  employeesByType: { type: string; count: number }[];
}

interface AttendanceData {
  month: number;
  year: number;
  totalRecords: number;
  userAttendance: {
    userId: string;
    name: string;
    employeeId: string;
    department: string;
    presentDays: number;
    totalHours: number;
  }[];
  bySource: { source: string; count: number }[];
}

interface LeaveData {
  year: number;
  byStatus: { status: string; count: number; days: number }[];
  byType: { leaveType: string; color: string; count: number; days: number }[];
}

type TabType = "overview" | "attendance" | "leave";

export default function ReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !ALLOWED_ROLES.includes(data.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
        fetchOverview();
      });
  }, [router]);

  const fetchOverview = async () => {
    setLoading(true);
    const res = await fetch("/api/reports?type=overview");
    const data = await res.json();
    if (data.success) {
      setOverviewData(data.data);
    }
    setLoading(false);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?type=attendance&month=${selectedMonth}&year=${selectedYear}`);
    const data = await res.json();
    if (data.success) {
      setAttendanceData(data.data);
    }
    setLoading(false);
  };

  const fetchLeave = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?type=leave&year=${selectedYear}`);
    const data = await res.json();
    if (data.success) {
      setLeaveData(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "overview" && !overviewData) fetchOverview();
    if (activeTab === "attendance") fetchAttendance();
    if (activeTab === "leave") fetchLeave();
  }, [activeTab, selectedMonth, selectedYear]);

  const tabs = [
    { id: "overview" as TabType, label: "Overview" },
    { id: "attendance" as TabType, label: "Attendance" },
    { id: "leave" as TabType, label: "Leave" },
  ];

  // Export functions
  const exportAttendanceCSV = () => {
    if (!attendanceData) return;

    const headers = ["Employee ID", "Name", "Department", "Present Days", "Total Hours"];
    const rows = attendanceData.userAttendance.map((u) => [
      u.employeeId,
      u.name,
      u.department,
      u.presentDays.toString(),
      u.totalHours.toFixed(1),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadCSV(csv, `attendance-${months[selectedMonth]}-${selectedYear}.csv`);
  };

  const exportLeaveCSV = () => {
    if (!leaveData) return;

    const headers = ["Status", "Count", "Days"];
    const rows = leaveData.byStatus.map((s) => [s.status, s.count.toString(), s.days.toString()]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadCSV(csv, `leave-summary-${selectedYear}.csv`);
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (loading && !overviewData && !attendanceData && !leaveData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Reports</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">HR analytics and insights</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && overviewData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{overviewData.summary.totalEmployees}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Employees</p>
            </div>
            <div className="rounded bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-2xl font-semibold text-green-700 dark:text-green-400">{overviewData.summary.activeEmployees}</p>
              <p className="text-xs text-green-600 dark:text-green-500">Active</p>
            </div>
            <div className="rounded bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="text-2xl font-semibold text-blue-700 dark:text-blue-400">{overviewData.summary.presentToday}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500">Present Today</p>
            </div>
            <div className="rounded bg-orange-50 p-4 dark:bg-orange-900/20">
              <p className="text-2xl font-semibold text-orange-700 dark:text-orange-400">{overviewData.summary.pendingLeaves}</p>
              <p className="text-xs text-orange-600 dark:text-orange-500">Pending Leaves</p>
            </div>
            <div className="rounded bg-purple-50 p-4 dark:bg-purple-900/20">
              <p className="text-2xl font-semibold text-purple-700 dark:text-purple-400">{overviewData.summary.recentHires}</p>
              <p className="text-xs text-purple-600 dark:text-purple-500">New Hires (30d)</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* By Department */}
            <Card>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Employees by Department</h3>
              <div className="space-y-2">
                {overviewData.employeesByDepartment.map((d) => (
                  <div key={d.department} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{d.department}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 w-24">
                        <div
                          className="h-2 rounded-full bg-gray-900 dark:bg-white"
                          style={{ width: `${Math.min(100, (d.count / overviewData.summary.totalEmployees) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{d.count}</span>
                    </div>
                  </div>
                ))}
                {overviewData.employeesByDepartment.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No departments</p>
                )}
              </div>
            </Card>

            {/* By Role */}
            <Card>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Employees by Role</h3>
              <div className="space-y-2">
                {overviewData.employeesByRole.map((r) => (
                  <div key={r.role} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{r.role.replace("_", " ")}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{r.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* By Employment Type */}
            <Card>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">By Employment Type</h3>
              <div className="space-y-2">
                {overviewData.employeesByType.map((t) => (
                  <div key={t.type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t.type.replace("_", " ")}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Stats */}
            <Card>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Organization</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Departments</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{overviewData.summary.totalDepartments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Teams</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{overviewData.summary.totalTeams}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Leaves Approved (This Month)</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{overviewData.summary.approvedLeavesThisMonth}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {[2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {attendanceData && attendanceData.userAttendance.length > 0 && (
              <button
                onClick={exportAttendanceCSV}
                className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <DownloadIcon />
                Export CSV
              </button>
            )}
          </div>

          {attendanceData && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{attendanceData.totalRecords}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Check-ins</p>
                </div>
                {attendanceData.bySource.map((s) => (
                  <div key={s.source} className="rounded bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{s.count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.source}</p>
                  </div>
                ))}
              </div>

              {/* User Attendance Table */}
              <Card>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Employee Attendance Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Department</th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Present Days</th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {attendanceData.userAttendance.map((u) => (
                        <tr key={u.userId}>
                          <td className="px-3 py-2">
                            <p className="text-sm text-gray-900 dark:text-white">{u.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{u.employeeId}</p>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{u.department}</td>
                          <td className="px-3 py-2 text-center text-sm text-gray-900 dark:text-white">{u.presentDays}</td>
                          <td className="px-3 py-2 text-center text-sm text-gray-900 dark:text-white">{u.totalHours.toFixed(1)}h</td>
                        </tr>
                      ))}
                      {attendanceData.userAttendance.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No attendance records for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Leave Tab */}
      {activeTab === "leave" && (
        <div className="space-y-6">
          {/* Year Filter */}
          <div className="flex items-center justify-between">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {leaveData && leaveData.byStatus.length > 0 && (
              <button
                onClick={exportLeaveCSV}
                className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <DownloadIcon />
                Export CSV
              </button>
            )}
          </div>

          {leaveData && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* By Status */}
              <Card>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Leave Requests by Status</h3>
                <div className="space-y-3">
                  {leaveData.byStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          s.status === "APPROVED" ? "bg-green-500" :
                          s.status === "PENDING" ? "bg-yellow-500" :
                          s.status === "REJECTED" ? "bg-red-500" :
                          "bg-gray-500"
                        }`} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{s.status}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{s.count} requests</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({s.days} days)</span>
                      </div>
                    </div>
                  ))}
                  {leaveData.byStatus.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No leave data</p>
                  )}
                </div>
              </Card>

              {/* By Type */}
              <Card>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Approved Leaves by Type</h3>
                <div className="space-y-3">
                  {leaveData.byType.map((t) => (
                    <div key={t.leaveType} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t.leaveType}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t.days} days</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({t.count} requests)</span>
                      </div>
                    </div>
                  ))}
                  {leaveData.byType.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No approved leaves</p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
