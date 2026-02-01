"use client";

import { useEffect, useState, Fragment } from "react";
import { Button, useToast } from "@/components";

interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  status: string;
  type: string;
  entityType: string | null;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  template: {
    name: string;
    displayName: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "QUEUED", label: "Queued" },
  { value: "SENDING", label: "Sending" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "LEAVE_REQUEST_SUBMITTED", label: "Leave Submitted" },
  { value: "LEAVE_REQUEST_APPROVED", label: "Leave Approved" },
  { value: "LEAVE_REQUEST_REJECTED", label: "Leave Rejected" },
  { value: "REQUEST_SUBMITTED", label: "Request Submitted" },
  { value: "REQUEST_APPROVED", label: "Request Approved" },
  { value: "REQUEST_REJECTED", label: "Request Rejected" },
  { value: "ANNOUNCEMENT_PUBLISHED", label: "Announcement" },
  { value: "WELCOME_EMAIL", label: "Welcome Email" },
  { value: "ASSET_ASSIGNED", label: "Asset Assigned" },
];

export default function EmailLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    status: "",
    type: "",
    email: "",
  });

  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      if (filters.status) params.append("status", filters.status);
      if (filters.type) params.append("type", filters.type);
      if (filters.email) params.append("email", filters.email);

      const res = await fetch(`/api/notifications/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
      }
    } catch {
      toast.error("Failed to fetch email logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters.status, filters.type]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const retryEmail = async (id: string) => {
    setRetrying(id);
    try {
      const res = await fetch(`/api/notifications/logs/${id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Email queued for retry");
        fetchLogs();
      } else {
        toast.error(data.error || "Failed to retry email");
      }
    } catch {
      toast.error("Failed to retry email");
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      QUEUED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      SENDING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      SENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return styles[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Email Logs</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View sent emails and troubleshoot failures
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="h-9 rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="h-9 rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search email..."
            value={filters.email}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9 w-40 rounded border border-gray-300 bg-white px-3 text-sm placeholder-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
          <Button onClick={handleSearch} size="sm">Search</Button>
          {(filters.status || filters.type || filters.email) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({ status: "", type: "", email: "" });
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400">
            No email logs found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Recipient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => (
                    <Fragment key={log.id}>
                      <tr
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.recipientName || log.recipientEmail.split("@")[0]}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {log.recipientEmail}
                          </p>
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {log.subject}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {log.type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {log.status === "FAILED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                retryEmail(log.id);
                              }}
                              disabled={retrying === log.id}
                            >
                              {retrying === log.id ? "..." : "Retry"}
                            </Button>
                          )}
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 px-4 py-4 dark:bg-gray-800/50">
                            <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Template</p>
                                <p className="text-gray-900 dark:text-white">{log.template?.displayName || "-"}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sent At</p>
                                <p className="text-gray-900 dark:text-white">{formatDate(log.sentAt)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Retry Count</p>
                                <p className="text-gray-900 dark:text-white">{log.retryCount}</p>
                              </div>
                              {log.entityType && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Entity</p>
                                  <p className="text-gray-900 dark:text-white">{log.entityType}</p>
                                </div>
                              )}
                              {log.errorMessage && (
                                <div className="sm:col-span-2 lg:col-span-4">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Error</p>
                                  <p className="mt-1 rounded bg-red-50 p-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                    {log.errorMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(pagination.page - 1) * pagination.limit + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
