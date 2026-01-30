"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components";
import type { LeaveRequest } from "@/types";

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
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [canApprove, setCanApprove] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [scope, setScope] = useState<string>("own");

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
      case "direct_reports": return "Your Direct Reports";
      case "team": return "Your Team Members";
      case "team_approved": return "Team (Approved Only)";
      default: return "";
    }
  };

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

      const permissions: OrgPermissions = orgData.success ? orgData.data.settings.permissions || {} : {};
      const leaveRequestsAccess = permissions.roleAccess?.leaveRequests || ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"];

      if (!leaveRequestsAccess.includes(user.role)) {
        router.replace("/dashboard");
        return;
      }

      setHasAccess(true);

      let approve = false;
      if (user.role === "ADMIN") {
        approve = true;
      } else if (user.role === "HR" && permissions.hrCanApproveLeaves !== false) {
        approve = true;
      } else if (user.role === "MANAGER" && permissions.managerCanApproveLeaves !== false) {
        approve = true;
      } else if (user.role === "TEAM_LEAD" && permissions.teamLeadCanApproveLeaves !== false) {
        approve = true;
      }
      setCanApprove(approve);

      fetchRequests();
    });
  }, [router]);

  const handleAction = async (id: string, action: "APPROVED" | "REJECTED", reason?: string) => {
    const res = await fetch(`/api/leave-requests?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, rejectionReason: reason }),
    });

    const data = await res.json();
    if (data.success) {
      fetchRequests();
    }
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    PENDING: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    APPROVED: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    REJECTED: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
    CANCELLED: { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400" },
  };

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        req.user?.firstName?.toLowerCase().includes(term) ||
        req.user?.lastName?.toLowerCase().includes(term) ||
        req.user?.employeeId?.toLowerCase().includes(term) ||
        req.leaveType?.name?.toLowerCase().includes(term) ||
        req.reason?.toLowerCase().includes(term)
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
    const headers = ["Employee", "Employee ID", "Department", "Leave Type", "Start Date", "End Date", "Days", "Reason", "Status", "Approved By", "Approved At"];
    const rows = filteredRequests.map(req => [
      `${req.user?.firstName} ${req.user?.lastName}`,
      req.user?.employeeId || "",
      req.user?.department?.name || "",
      req.leaveType?.name || "",
      new Date(req.startDate).toLocaleDateString(),
      new Date(req.endDate).toLocaleDateString(),
      req.days,
      req.reason || "",
      req.status,
      req.approver ? `${req.approver.firstName} ${req.approver.lastName}` : "",
      req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : "",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leave_requests_${statusFilter.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !hasAccess) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leave Requests</h1>
            {getScopeLabel() && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {getScopeLabel()}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {scope === "all" && "Viewing all leave requests in the organization"}
            {scope === "direct_reports" && "Viewing leave requests from your direct reports"}
            {scope === "team" && "Viewing leave requests from your team members"}
            {!["all", "direct_reports", "team"].includes(scope) && "Review and manage employee leave applications"}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          {counts.PENDING > 0 && (
            <div className="flex items-center gap-2 rounded bg-amber-50 px-3 py-1.5 dark:bg-amber-900/20">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{counts.PENDING} pending</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <DownloadIcon className="mr-1.5 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex items-center rounded bg-gray-100 p-1 dark:bg-gray-800">
          {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-all ${
                statusFilter === status
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
              <span className={`text-xs ${statusFilter === status ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-500"}`}>
                {counts[status]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <Input
            id="search"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {filteredRequests.length === 0 ? (
        <Card className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <CalendarIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">No requests found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {statusFilter === "ALL"
                ? "There are no leave requests yet"
                : `No ${statusFilter.toLowerCase()} leave requests`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <Card key={req.id} className="p-0 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* Left: Employee & Leave Info */}
                <div className="flex-1 p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {req.user?.firstName?.[0]}{req.user?.lastName?.[0]}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name & Status */}
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {req.user?.firstName} {req.user?.lastName}
                        </h3>
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusConfig[req.status].bg} ${statusConfig[req.status].text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[req.status].dot}`} />
                          {req.status}
                        </span>
                      </div>

                      {/* Employee ID & Dept */}
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {req.user?.employeeId}
                        {req.user?.department?.name && <span> · {req.user.department.name}</span>}
                      </p>

                      {/* Leave Details */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {req.leaveType?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                          <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs">
                            {new Date(req.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {req.startDate !== req.endDate && (
                              <> - {new Date(req.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                            )}
                          </span>
                          <span className="ml-1 text-xs text-gray-400">({req.days} {req.days === 1 ? "day" : "days"})</span>
                        </div>
                      </div>

                      {/* Reason */}
                      {req.reason && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {req.reason}
                        </p>
                      )}

                      {/* Rejection Reason */}
                      {req.rejectionReason && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                          Rejected: {req.rejectionReason}
                        </p>
                      )}

                      {/* Approved By */}
                      {req.approver && (
                        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                          {req.status === "APPROVED" ? "Approved" : "Reviewed"} by {req.approver.firstName} {req.approver.lastName}
                          {req.approvedAt && <> on {new Date(req.approvedAt).toLocaleDateString()}</>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                {req.status === "PENDING" && canApprove && (
                  <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:border-l sm:border-t-0 dark:border-gray-700 dark:bg-gray-800/50">
                    <Button size="sm" onClick={() => handleAction(req.id, "APPROVED")}>
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const reason = prompt("Rejection reason (optional):");
                        handleAction(req.id, "REJECTED", reason || undefined);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
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

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
