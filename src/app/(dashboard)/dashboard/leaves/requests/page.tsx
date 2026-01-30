"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components";
import type { LeaveRequest } from "@/types";

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    const res = await fetch("/api/leave-requests?pending=true");
    const data = await res.json();
    if (data.success) {
      setRequests(data.data.leaveRequests);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

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

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    REJECTED: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leave Requests</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Approve or reject leave requests</p>
      </div>

      <Card>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No pending leave requests</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Dates</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Days</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {req.user?.firstName} {req.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{req.user?.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{req.leaveType?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{req.days}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{req.reason || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusColors[req.status]}`}>{req.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === "PENDING" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => handleAction(req.id, "APPROVED")}>Approve</Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            const reason = prompt("Rejection reason (optional):");
                            handleAction(req.id, "REJECTED", reason || undefined);
                          }}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
