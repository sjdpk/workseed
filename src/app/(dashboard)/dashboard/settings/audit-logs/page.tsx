"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Input } from "@/components";

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ENTITIES = [
  "USER",
  "DEPARTMENT",
  "TEAM",
  "BRANCH",
  "LEAVE_REQUEST",
  "LEAVE_TYPE",
  "NOTICE",
  "SETTINGS",
];
const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "APPROVE",
  "REJECT",
  "CANCEL",
  "EXPORT",
];

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Filters
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "50");
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const res = await fetch(`/api/audit-logs?${params}`);
    const data = await res.json();

    if (data.success) {
      setLogs(data.data.logs);
      setPagination(data.data.pagination);
    }
    setLoading(false);
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
      const permissions = orgData.success ? orgData.data.settings.permissions || {} : {};
      const roleAccess = permissions.roleAccess || {};
      const auditLogsAccess = roleAccess.auditLogs || ["ADMIN"];

      if (!auditLogsAccess.includes(user.role)) {
        router.replace("/dashboard");
        return;
      }

      setHasAccess(true);
      fetchLogs();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleFilter = () => {
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setEntity("");
    setAction("");
    setStartDate("");
    setEndDate("");
    setTimeout(() => fetchLogs(1), 0);
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
      UPDATE: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      DELETE: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
      LOGIN: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
      LOGOUT: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      APPROVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
      REJECT: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
      CANCEL: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
      EXPORT: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
    };
    return colors[action] || "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  };

  const formatDetails = (details: Record<string, unknown> | undefined) => {
    if (!details) return null;
    const entries = Object.entries(details).slice(0, 3);
    return entries.map(([key, value]) => (
      <span key={key} className="text-xs text-gray-500 dark:text-gray-400">
        {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
      </span>
    ));
  };

  const exportToCSV = () => {
    const headers = [
      "Timestamp",
      "User",
      "Employee ID",
      "Action",
      "Entity",
      "Entity ID",
      "IP Address",
      "Details",
    ];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.user ? `${log.user.firstName} ${log.user.lastName}` : log.userId,
      log.user?.employeeId || "",
      log.action,
      log.entity,
      log.entityId || "",
      log.ipAddress || "",
      log.details ? JSON.stringify(log.details) : "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track all system activities and changes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Entity
            </label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Entities</option>
              {ENTITIES.map((e) => (
                <option key={e} value={e}>
                  {e.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Actions</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Start Date
            </label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              End Date
            </label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleFilter} className="flex-1">
              Filter
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span>
          Total: <strong className="text-gray-900 dark:text-white">{pagination.total}</strong> logs
        </span>
        <span>
          Page <strong className="text-gray-900 dark:text-white">{pagination.page}</strong> of{" "}
          {pagination.totalPages}
        </span>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <LogIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              No audit logs found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your filters
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {log.user ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.user.firstName} {log.user.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {log.user.employeeId}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">System</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${getActionColor(log.action)}`}
                      >
                        {log.action.charAt(0) + log.action.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {log.entity.replace("_", " ")}
                        </p>
                        {log.entityId && (
                          <p className="text-xs text-gray-400 font-mono">
                            {log.entityId.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      {log.details ? (
                        <div className="space-y-0.5">{formatDetails(log.details)}</div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {log.ipAddress || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => fetchLogs(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => fetchLogs(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function LogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
