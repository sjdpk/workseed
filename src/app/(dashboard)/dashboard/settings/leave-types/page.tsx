"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components";
import type { LeaveType } from "@/types";

export default function LeaveTypesPage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaveTypes = () => {
    fetch("/api/leave-types?all=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLeaveTypes(data.data.leaveTypes);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const res = await fetch(`/api/leave-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentStatus }),
    });
    const data = await res.json();
    if (data.success) {
      fetchLeaveTypes();
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leave Types</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure organization leave policies</p>
        </div>
        <Button onClick={() => router.push("/dashboard/settings/leave-types/new")}>Add Leave Type</Button>
      </div>

      {leaveTypes.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">No leave types found</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leaveTypes.map((lt) => (
            <Card key={lt.id} className={`relative overflow-hidden ${!lt.isActive ? "opacity-60" : ""}`}>
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: lt.color || "#3B82F6" }} />
              <div className="pl-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{lt.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{lt.code}</span>
                  </div>
                </div>
                {lt.description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{lt.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{lt.defaultDays} days/year</span>
                  {lt.isPaid ? (
                    <span className="rounded bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-300">Paid</span>
                  ) : (
                    <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-300">Unpaid</span>
                  )}
                  {lt.carryForward && (
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Carry Forward</span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                  <button
                    onClick={() => toggleActive(lt.id, lt.isActive)}
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
                      lt.isActive
                        ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${lt.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                    {lt.isActive ? "Active" : "Inactive"}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/settings/leave-types/${lt.id}`)}>
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
