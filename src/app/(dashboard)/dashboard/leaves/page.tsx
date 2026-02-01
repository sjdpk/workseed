"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, useToast } from "@/components";
import type { LeaveAllocation, LeaveRequest } from "@/types";

type TabType = "all" | "pending" | "approved" | "rejected" | "cancelled";

export default function MyLeavesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [allocations, setAllocations] = useState<(LeaveAllocation & { balance: number })[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");

  const fetchData = async () => {
    const [allocRes, reqRes] = await Promise.all([
      fetch("/api/leave-allocations").then((r) => r.json()),
      fetch("/api/leave-requests").then((r) => r.json()),
    ]);

    if (allocRes.success) setAllocations(allocRes.data.allocations);
    if (reqRes.success) setRequests(reqRes.data.leaveRequests);
    setLoading(false);
  };

  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: Initial data fetch on component mount */
  useEffect(() => {
    fetchData();
    if (searchParams.get("success") === "1") {
      toast.success("Leave request submitted successfully!");
      window.history.replaceState(null, "", "/dashboard/leaves");
    }
  }, [searchParams, toast]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) return;

    try {
      const res = await fetch(`/api/leave-requests?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Leave request cancelled successfully");
        fetchData();
      } else {
        toast.error(data.error || "Failed to cancel leave request");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    }
  };

  const getFilteredRequests = () => {
    if (activeTab === "all") return requests;
    return requests.filter((req) => req.status.toLowerCase() === activeTab);
  };

  const getTabCount = (tab: TabType) => {
    if (tab === "all") return requests.length;
    return requests.filter((r) => r.status.toLowerCase() === tab).length;
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    PENDING: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    APPROVED: {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-300",
      dot: "bg-green-500",
    },
    REJECTED: {
      bg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-300",
      dot: "bg-red-500",
    },
    CANCELLED: {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-600 dark:text-gray-400",
      dot: "bg-gray-400",
    },
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "cancelled", label: "Cancelled" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">My Leaves</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your leave balance and requests
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/leaves/apply")}>
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Apply Leave
        </Button>
      </div>

      {/* Compact Leave Balance */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Leave Balance</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().getFullYear()}
          </span>
        </div>
        {allocations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No leave allocations</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {allocations.map((alloc) => (
              <div
                key={alloc.id}
                className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: alloc.leaveType?.color || "#3B82F6" }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {alloc.leaveType?.name}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {alloc.balance}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  / {alloc.allocated + alloc.carriedOver + alloc.adjusted}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Leave History with Tabs */}
      <Card className="p-0 overflow-hidden">
        {/* Tab Header */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {tabs.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      isActive
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {getFilteredRequests().length === 0 ? (
            <div className="py-8 text-center">
              <svg
                className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {activeTab === "all" ? "No leave requests yet" : `No ${activeTab} requests`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    <th className="pb-3 pr-4">Leave Type</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Days</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Reason</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {getFilteredRequests().map((req) => {
                    const config = statusConfig[req.status];
                    return (
                      <tr key={req.id} className="group">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: req.leaveType?.color || "#3B82F6" }}
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {req.leaveType?.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(req.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {req.startDate !== req.endDate && (
                            <>
                              {" "}
                              -{" "}
                              {new Date(req.endDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </>
                          )}
                          {req.isHalfDay && (
                            <span className="ml-1 text-xs text-gray-500">
                              ({req.halfDayType === "FIRST_HALF" ? "AM" : "PM"})
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-900 dark:text-white">
                          {req.days}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${config.bg} ${config.text}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 max-w-[150px]">
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate block">
                            {req.reason || "-"}
                          </span>
                          {req.status === "REJECTED" && req.rejectionReason && (
                            <span className="text-xs text-red-500 truncate block">
                              {req.rejectionReason}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {req.status === "PENDING" && (
                            <button
                              onClick={() => handleCancel(req.id)}
                              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
