"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, useToast } from "@/components";
import type { LeaveRequest, LeaveType, Department } from "@/types";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

interface CurrentUser {
  id: string;
  role: string;
  teamId?: string;
  departmentId?: string;
}

interface OrgPermissions {
  roleAccess?: {
    leaveRequests?: string[];
  };
  teamLeadCanApproveLeaves?: boolean;
  managerCanApproveLeaves?: boolean;
  hrCanApproveLeaves?: boolean;
}

export default function LeaveRequestsPage() {
  const router = useRouter();
  const toast = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [canApprove, setCanApprove] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [scope, setScope] = useState<string>("own");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    const res = await fetch("/api/leave-requests?all=true");
    const data = await res.json();
    if (data.success) {
      setRequests(data.data.leaveRequests);
      setScope(data.data.scope || "own");
    }
    setLoading(false);
  };

  const getScopeLabel = () => {
    switch (scope) {
      case "all": return "All Organization";
      case "direct_reports": return "Direct Reports";
      case "team": return "Team Members";
      default: return "";
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
      fetch("/api/leave-types").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]).then(([meData, orgData, leaveTypesData, deptsData]) => {
      if (!meData.success) {
        router.replace("/login");
        return;
      }

      const user = meData.data.user;
      setCurrentUser(user);

      if (leaveTypesData.success) setLeaveTypes(leaveTypesData.data.leaveTypes);
      if (deptsData.success) setDepartments(deptsData.data.departments);

      const permissions: OrgPermissions = orgData.success ? orgData.data.settings.permissions || {} : {};
      const leaveRequestsAccess = permissions.roleAccess?.leaveRequests || ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"];

      if (!leaveRequestsAccess.includes(user.role)) {
        router.replace("/dashboard");
        return;
      }

      setHasAccess(true);

      let approve = false;
      if (user.role === "ADMIN") approve = true;
      else if (user.role === "HR" && permissions.hrCanApproveLeaves !== false) approve = true;
      else if (user.role === "MANAGER" && permissions.managerCanApproveLeaves !== false) approve = true;
      else if (user.role === "TEAM_LEAD" && permissions.teamLeadCanApproveLeaves !== false) approve = true;
      setCanApprove(approve);

      fetchRequests();
    });
  }, [router]);

  const handleAction = async (id: string, action: "APPROVED" | "REJECTED", reason?: string) => {
    try {
      const res = await fetch(`/api/leave-requests?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, rejectionReason: reason }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Leave request ${action.toLowerCase()} successfully`);
        fetchRequests();
        setSelectedRequest(null);
      } else {
        toast.error(data.error || `Failed to ${action.toLowerCase()} leave request`);
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    }
  };

  const clearFilters = () => {
    setLeaveTypeFilter("");
    setDepartmentFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
  };

  const hasActiveFilters = leaveTypeFilter || departmentFilter || dateFrom || dateTo || searchTerm;

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    PENDING: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    APPROVED: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    REJECTED: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
    CANCELLED: { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400" },
  };

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
    if (leaveTypeFilter && req.leaveTypeId !== leaveTypeFilter) return false;
    if (departmentFilter && req.user?.departmentId !== departmentFilter) return false;
    if (dateFrom && new Date(req.startDate) < new Date(dateFrom)) return false;
    if (dateTo && new Date(req.endDate) > new Date(dateTo)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        req.user?.firstName?.toLowerCase().includes(term) ||
        req.user?.lastName?.toLowerCase().includes(term) ||
        req.user?.employeeId?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === "PENDING").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
    CANCELLED: requests.filter(r => r.status === "CANCELLED").length,
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Employee ID", "Department", "Leave Type", "Start Date", "End Date", "Days", "Status"];
    const rows = filteredRequests.map(req => [
      `${req.user?.firstName} ${req.user?.lastName}`,
      req.user?.employeeId || "",
      req.user?.department?.name || "",
      req.leaveType?.name || "",
      new Date(req.startDate).toLocaleDateString(),
      new Date(req.endDate).toLocaleDateString(),
      req.days,
      req.status,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leave_requests_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (loading || !hasAccess) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leave Requests</h1>
          {getScopeLabel() && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {getScopeLabel()}
            </span>
          )}
          {counts.PENDING > 0 && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {counts.PENDING} pending
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === status
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()} ({counts[status]})
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                showFilters || hasActiveFilters
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
              }`}
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && <span className="rounded-full bg-blue-600 px-1.5 text-[10px] text-white">{[leaveTypeFilter, departmentFilter, dateFrom, dateTo].filter(Boolean).length}</span>}
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3 dark:border-gray-700">
            <div className="w-40">
              <label className="mb-1 block text-xs text-gray-500">Leave Type</label>
              <select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All</option>
                {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
              </select>
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs text-gray-500">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="w-36">
              <label className="mb-1 block text-xs text-gray-500">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="w-36">
              <label className="mb-1 block text-xs text-gray-500">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                Clear
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {filteredRequests.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No requests found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {req.user?.firstName?.[0]}{req.user?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{req.user?.firstName} {req.user?.lastName}</p>
                          <p className="text-xs text-gray-500">{req.user?.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: req.leaveType?.color || "#3B82F6" }} />
                        {req.leaveType?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatDate(req.startDate)}{req.startDate !== req.endDate && ` - ${formatDate(req.endDate)}`}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{req.days}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusConfig[req.status].bg} ${statusConfig[req.status].text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[req.status].dot}`} />
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === "PENDING" && canApprove ? (
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAction(req.id, "APPROVED")}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt("Rejection reason (optional):");
                              handleAction(req.id, "REJECTED", reason || undefined);
                            }}
                            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">View</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail Sidebar */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
          <div className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-sm md:max-w-md dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Employee Card */}
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
                    {selectedRequest.user?.firstName?.[0]}{selectedRequest.user?.lastName?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {selectedRequest.user?.employeeId}
                      {selectedRequest.user?.department?.name && ` · ${selectedRequest.user.department.name}`}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[selectedRequest.status].bg} ${statusConfig[selectedRequest.status].text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[selectedRequest.status].dot}`} />
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              {/* Leave Info Grid */}
              <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800">
                <div className="bg-white px-5 py-4 dark:bg-gray-900">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Type</p>
                  <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedRequest.leaveType?.color || "#3B82F6" }} />
                    <span className="truncate">{selectedRequest.leaveType?.name}</span>
                  </p>
                </div>
                <div className="bg-white px-5 py-4 dark:bg-gray-900">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Duration</p>
                  <p className="mt-1.5 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedRequest.days} {selectedRequest.days === 1 ? "day" : "days"}
                    {selectedRequest.isHalfDay && <span className="ml-1 text-xs text-gray-500">({selectedRequest.halfDayType === "FIRST_HALF" ? "AM" : "PM"})</span>}
                  </p>
                </div>
                <div className="bg-white px-5 py-4 dark:bg-gray-900">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">From</p>
                  <p className="mt-1.5 text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedRequest.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-[11px] text-gray-500">{new Date(selectedRequest.startDate).toLocaleDateString("en-US", { weekday: "long" })}</p>
                </div>
                <div className="bg-white px-5 py-4 dark:bg-gray-900">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">To</p>
                  <p className="mt-1.5 text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedRequest.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-[11px] text-gray-500">{new Date(selectedRequest.endDate).toLocaleDateString("en-US", { weekday: "long" })}</p>
                </div>
              </div>

              {/* Reason */}
              {selectedRequest.reason && (
                <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Reason</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{selectedRequest.reason}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedRequest.rejectionReason && (
                <div className="mx-5 my-4 rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-red-600 dark:text-red-400">Rejection Reason</p>
                  <p className="mt-1.5 text-sm text-red-700 dark:text-red-300">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              {/* Approver */}
              {selectedRequest.approver && (
                <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    {selectedRequest.status === "APPROVED" ? "Approved by" : "Reviewed by"}
                  </p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {selectedRequest.approver.firstName?.[0]}{selectedRequest.approver.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedRequest.approver.firstName} {selectedRequest.approver.lastName}
                      </p>
                      {selectedRequest.approvedAt && (
                        <p className="text-[11px] text-gray-500">{new Date(selectedRequest.approvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Activity</p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Request submitted</p>
                      <p className="text-[11px] text-gray-500">{new Date(selectedRequest.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                  </div>
                  {selectedRequest.approvedAt && (
                    <div className="flex items-start gap-3">
                      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${selectedRequest.status === "APPROVED" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedRequest.status === "APPROVED" ? "Approved" : "Rejected"}
                        </p>
                        <p className="text-[11px] text-gray-500">{new Date(selectedRequest.approvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            {selectedRequest.status === "PENDING" && canApprove && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => handleAction(selectedRequest.id, "APPROVED")}>
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const reason = prompt("Rejection reason (optional):");
                      handleAction(selectedRequest.id, "REJECTED", reason || undefined);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}
